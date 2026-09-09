import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_GA,
  assignRooms,
  buildConflictGraph,
  buildUnits,
  evaluate,
  geneticOptimize,
  graphColoring,
  toPlacements,
  validateTimetable,
  type EngineCourse,
  type EngineRoom,
  type Placement,
  type ValidationResult,
} from "./timetable-engine";

export interface GenerateResult {
  initialFitness: number;
  optimizedFitness: number;
  improvement: number;
  hardViolations: number;
  softViolations: number;
  roomIssues: number;
  history: number[];
  scheduled: number;
  validation: ValidationResult;
}

async function assertAdmin(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Only administrators can change the master timetable");
}

export const generateTimetable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GenerateResult> => {
    const supabase = context.supabase;
    await assertAdmin(supabase as never, context.userId);

    const [{ data: courseRows, error: cErr }, { data: roomRows, error: rErr }] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("rooms").select("*"),
    ]);
    if (cErr) throw new Error(cErr.message);
    if (rErr) throw new Error(rErr.message);

    const courses = (courseRows ?? []) as unknown as EngineCourse[];
    const rooms = (roomRows ?? []) as unknown as EngineRoom[];
    if (courses.length === 0) throw new Error("Add at least one course before generating");

    const byId = new Map(courses.map((c) => [c.id, c]));
    const units = buildUnits(courses);
    const adj = buildConflictGraph(units, byId);

    const colored = graphColoring(units, adj, byId);
    const initial = evaluate(units, colored, byId, rooms);
    const { best, history, breakdown } = geneticOptimize(units, colored, byId, rooms, DEFAULT_GA);
    const { roomByUnit } = assignRooms(units, best, byId, rooms);
    const placements = toPlacements(units, best, roomByUnit);

    const { error: delErr } = await supabase
      .from("timetable")
      .delete()
      .not("id", "is", null);
    if (delErr) throw new Error(delErr.message);

    const rows = placements.map((p) => ({
      course_id: p.courseId,
      occurrence: p.occurrence,
      day: p.day,
      period: p.period,
      timing: p.timing,
      room_id: p.roomId,
    }));
    const { error: insErr } = await supabase.from("timetable").insert(rows);
    if (insErr) throw new Error(insErr.message);

    const validation = validateTimetable(placements, courses, rooms);

    await supabase.from("generation_runs").insert({
      initial_fitness: initial.fitness,
      optimized_fitness: breakdown.fitness,
      validation_score: validation.score,
      generations: DEFAULT_GA.generations,
      population: DEFAULT_GA.population,
      hard_violations: breakdown.hardViolations,
      soft_violations: breakdown.softViolations,
      created_by: context.userId,
    });

    return {
      initialFitness: initial.fitness,
      optimizedFitness: breakdown.fitness,
      improvement: Math.round((breakdown.fitness - initial.fitness) * 100) / 100,
      hardViolations: breakdown.hardViolations,
      softViolations: breakdown.softViolations,
      roomIssues: breakdown.roomIssues,
      history,
      scheduled: rows.length,
      validation,
    };
  });

export const validateCurrentTimetable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ValidationResult> => {
    const supabase = context.supabase;
    const [{ data: ttRows }, { data: courseRows }, { data: roomRows }] = await Promise.all([
      supabase.from("timetable").select("*"),
      supabase.from("courses").select("*"),
      supabase.from("rooms").select("*"),
    ]);

    const courses = (courseRows ?? []) as unknown as EngineCourse[];
    const rooms = (roomRows ?? []) as unknown as EngineRoom[];
    const placements: Placement[] = ((ttRows ?? []) as unknown as Array<{
      course_id: string;
      occurrence: number;
      day: string;
      period: number;
      timing: string;
      room_id: string | null;
    }>).map((r) => ({
      courseId: r.course_id,
      occurrence: r.occurrence,
      day: r.day as Placement["day"],
      dayIndex: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].indexOf(r.day),
      period: r.period,
      timing: r.timing,
      roomId: r.room_id,
    }));

    if (placements.length === 0) {
      return {
        valid: false,
        errors: ["No timetable has been generated yet"],
        warnings: [],
        score: 0,
      };
    }
    return validateTimetable(placements, courses, rooms);
  });

export const resetTimetable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase as never, context.userId);
    const { error } = await supabase.from("timetable").delete().not("id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
