/**
 * Timetable optimisation engine.
 *
 * Stage 1 - credit-aware graph colouring (DSATUR / saturation largest first)
 * Stage 2 - genuine genetic algorithm (selection, crossover, mutation, elitism)
 * Stage 3 - room assignment (smallest suitable room)
 * Stage 4 - validation engine
 */

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type DayName = (typeof DAYS)[number];

export const PERIODS_PER_DAY = 7;

export const PERIOD_TIMINGS: string[] = [
  "8:30 AM - 9:25 AM",
  "9:25 AM - 10:20 AM",
  "10:40 AM - 11:35 AM",
  "11:35 AM - 12:30 PM",
  "1:25 PM - 2:20 PM",
  "2:20 PM - 3:15 PM",
  "3:15 PM - 4:10 PM",
];

export interface CreditRule {
  requiredHours: number;
  periodsPerWeek: number;
  maxPeriodsPerDay: number;
  consecutiveBlock: boolean;
}

export const CREDIT_RULES: Record<number, CreditRule> = {
  2: { requiredHours: 30, periodsPerWeek: 4, maxPeriodsPerDay: 4, consecutiveBlock: true },
  3: { requiredHours: 45, periodsPerWeek: 3, maxPeriodsPerDay: 1, consecutiveBlock: false },
  4: { requiredHours: 60, periodsPerWeek: 4, maxPeriodsPerDay: 2, consecutiveBlock: false },
};

export interface EngineCourse {
  id: string;
  code: string;
  name: string;
  credit: number;
  course_type: string;
  faculty_id: string | null;
  department: string;
  section: string;
  student_count: number;
  room_type: string;
  periods_per_week: number;
  max_periods_per_day: number;
  consecutive_block: boolean;
}

export interface EngineRoom {
  id: string;
  room_number: string;
  room_type: string;
  capacity: number;
}

export interface Unit {
  index: number;
  courseId: string;
  occurrence: number;
  length: number;
  allowedStarts: number[]; // 1-based period numbers
}

export interface Placement {
  courseId: string;
  occurrence: number;
  day: DayName;
  dayIndex: number;
  period: number;
  timing: string;
  roomId: string | null;
}

export interface FitnessBreakdown {
  fitness: number;
  hardViolations: number;
  softViolations: number;
  facultyClashes: number;
  sectionClashes: number;
  roomClashes: number;
  perDayViolations: number;
  roomIssues: number;
  gaps: number;
}

const HARD_PENALTY = 1000;
const MEDIUM_PENALTY = 60;
const SOFT_PENALTY = 5;

/** Chromosome: for each unit, the encoded start slot = dayIndex * 7 + (period - 1). */
export type Chromosome = number[];

export function encodeSlot(dayIndex: number, period: number): number {
  return dayIndex * PERIODS_PER_DAY + (period - 1);
}
export function decodeDay(slot: number): number {
  return Math.floor(slot / PERIODS_PER_DAY);
}
export function decodePeriod(slot: number): number {
  return (slot % PERIODS_PER_DAY) + 1;
}

/** Build scheduling units from courses using the credit rules. */
export function buildUnits(courses: EngineCourse[]): Unit[] {
  const units: Unit[] = [];
  for (const course of courses) {
    if (course.consecutive_block) {
      const length = Math.min(course.periods_per_week, PERIODS_PER_DAY);
      // Blocks may not straddle the lunch break: start at period 1 or period 4.
      const allowedStarts: number[] = [];
      for (let p = 1; p + length - 1 <= PERIODS_PER_DAY; p++) {
        if (p === 1 || p === 4) allowedStarts.push(p);
      }
      if (allowedStarts.length === 0) allowedStarts.push(1);
      units.push({
        index: units.length,
        courseId: course.id,
        occurrence: 1,
        length,
        allowedStarts,
      });
    } else {
      for (let occ = 1; occ <= course.periods_per_week; occ++) {
        units.push({
          index: units.length,
          courseId: course.id,
          occurrence: occ,
          length: 1,
          allowedStarts: Array.from({ length: PERIODS_PER_DAY }, (_, i) => i + 1),
        });
      }
    }
  }
  return units;
}

function unitCells(unit: Unit, slot: number): number[] {
  const day = decodeDay(slot);
  const start = decodePeriod(slot);
  const cells: number[] = [];
  for (let i = 0; i < unit.length; i++) cells.push(encodeSlot(day, start + i));
  return cells;
}

/** Two units conflict when they can never share a time slot. */
function unitsConflict(a: Unit, b: Unit, byId: Map<string, EngineCourse>): boolean {
  if (a.courseId === b.courseId) return true;
  const ca = byId.get(a.courseId);
  const cb = byId.get(b.courseId);
  if (!ca || !cb) return false;
  if (ca.faculty_id && cb.faculty_id && ca.faculty_id === cb.faculty_id) return true;
  if (ca.department === cb.department && ca.section === cb.section) return true;
  return false;
}

export function buildConflictGraph(units: Unit[], byId: Map<string, EngineCourse>): number[][] {
  const adj: number[][] = units.map(() => []);
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const ui = units[i]!;
      const uj = units[j]!;
      if (unitsConflict(ui, uj, byId)) {
        adj[i]!.push(j);
        adj[j]!.push(i);
      }
    }
  }
  return adj;
}

function candidateSlots(unit: Unit): number[] {
  const slots: number[] = [];
  for (let d = 0; d < DAYS.length; d++) {
    for (const p of unit.allowedStarts) {
      if (p + unit.length - 1 <= PERIODS_PER_DAY) slots.push(encodeSlot(d, p));
    }
  }
  return slots;
}

/** Stage 1: credit-aware DSATUR graph colouring. */
export function graphColoring(
  units: Unit[],
  adj: number[][],
  byId: Map<string, EngineCourse>,
): Chromosome {
  const n = units.length;
  const assigned: Chromosome = new Array<number>(n).fill(-1);
  const saturation: Set<number>[] = units.map(() => new Set<number>());
  const done = new Array<boolean>(n).fill(false);

  for (let step = 0; step < n; step++) {
    // Saturation largest first, tie-break on degree, then on unit length.
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (done[i]) continue;
      if (best === -1) {
        best = i;
        continue;
      }
      const s = saturation[i]!.size;
      const sb = saturation[best]!.size;
      if (s > sb) best = i;
      else if (s === sb) {
        if (adj[i]!.length > adj[best]!.length) best = i;
        else if (adj[i]!.length === adj[best]!.length && units[i]!.length > units[best]!.length)
          best = i;
      }
    }
    const node = best;
    const unit = units[node]!;
    const course = byId.get(unit.courseId);

    const occupied = new Set<number>();
    for (const nb of adj[node]!) {
      if (assigned[nb]! >= 0) for (const c of unitCells(units[nb]!, assigned[nb]!)) occupied.add(c);
    }

    // Days already used by this course, for spreading.
    const dayLoad = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      if (i !== node && assigned[i]! >= 0 && units[i]!.courseId === unit.courseId) {
        const d = decodeDay(assigned[i]!);
        dayLoad.set(d, (dayLoad.get(d) ?? 0) + units[i]!.length);
      }
    }

    const maxPerDay = course?.max_periods_per_day ?? PERIODS_PER_DAY;
    const options = candidateSlots(unit)
      .map((slot) => {
        const cells = unitCells(unit, slot);
        const clash = cells.some((c) => occupied.has(c));
        const day = decodeDay(slot);
        const load = dayLoad.get(day) ?? 0;
        const overDay = load + unit.length > maxPerDay;
        // Prefer conflict-free, respect per-day cap, spread across days, early periods.
        const score =
          (clash ? 10_000 : 0) + (overDay ? 1_000 : 0) + load * 50 + decodePeriod(slot) + day;
        return { slot, score };
      })
      .sort((a, b) => a.score - b.score);

    const chosen = options[0]?.slot ?? 0;
    assigned[node] = chosen;
    for (const nb of adj[node]!) saturation[nb]!.add(chosen);
    done[node] = true;
  }

  return assigned;
}

/** Stage 3: assign the smallest suitable free room to every placed unit. */
export function assignRooms(
  units: Unit[],
  chromosome: Chromosome,
  byId: Map<string, EngineCourse>,
  rooms: EngineRoom[],
): { roomByUnit: Array<string | null>; unassigned: number } {
  const roomByUnit: Array<string | null> = units.map(() => null);
  const busy = new Map<string, Set<number>>();
  rooms.forEach((r) => busy.set(r.id, new Set<number>()));

  const order = units
    .map((u, i) => ({ i, count: byId.get(u.courseId)?.student_count ?? 0 }))
    .sort((a, b) => b.count - a.count);

  let unassigned = 0;
  for (const { i } of order) {
    const unit = units[i]!;
    const course = byId.get(unit.courseId);
    if (!course) continue;
    const cells = unitCells(unit, chromosome[i]!);
    const suitable = rooms
      .filter((r) => r.room_type === course.room_type && r.capacity >= course.student_count)
      .sort((a, b) => a.capacity - b.capacity);
    const found = suitable.find((r) => {
      const used = busy.get(r.id)!;
      return cells.every((c) => !used.has(c));
    });
    if (found) {
      const used = busy.get(found.id)!;
      cells.forEach((c) => used.add(c));
      roomByUnit[i] = found.id;
    } else {
      unassigned++;
    }
  }
  return { roomByUnit, unassigned };
}

/** Fitness: maximise. Hard constraints dominate; distribution is a soft goal. */
export function evaluate(
  units: Unit[],
  chromosome: Chromosome,
  byId: Map<string, EngineCourse>,
  rooms: EngineRoom[],
): FitnessBreakdown {
  let facultyClashes = 0;
  let sectionClashes = 0;
  let perDayViolations = 0;
  let gaps = 0;

  const facultyUse = new Map<string, number>();
  const sectionUse = new Map<string, number>();
  const courseDay = new Map<string, number>();
  const sectionSlots = new Map<string, number[]>();

  units.forEach((unit, i) => {
    const course = byId.get(unit.courseId);
    if (!course) return;
    const cells = unitCells(unit, chromosome[i]!);
    for (const cell of cells) {
      if (course.faculty_id) {
        const key = `${course.faculty_id}#${cell}`;
        const c = (facultyUse.get(key) ?? 0) + 1;
        facultyUse.set(key, c);
        if (c > 1) facultyClashes++;
      }
      const skey = `${course.department}-${course.section}#${cell}`;
      const sc = (sectionUse.get(skey) ?? 0) + 1;
      sectionUse.set(skey, sc);
      if (sc > 1) sectionClashes++;

      const list = sectionSlots.get(`${course.department}-${course.section}`) ?? [];
      list.push(cell);
      sectionSlots.set(`${course.department}-${course.section}`, list);
    }
    const dkey = `${unit.courseId}#${decodeDay(chromosome[i]!)}`;
    courseDay.set(dkey, (courseDay.get(dkey) ?? 0) + unit.length);
  });

  for (const [key, count] of courseDay) {
    const courseId = key.split("#")[0]!;
    const course = byId.get(courseId);
    if (course && count > course.max_periods_per_day) {
      perDayViolations += count - course.max_periods_per_day;
    }
  }

  // Soft: gaps in each section's day.
  for (const [, cells] of sectionSlots) {
    for (let d = 0; d < DAYS.length; d++) {
      const periods = cells
        .filter((c) => decodeDay(c) === d)
        .map((c) => decodePeriod(c))
        .sort((a, b) => a - b);
      for (let i = 1; i < periods.length; i++) {
        const diff = periods[i]! - periods[i - 1]! - 1;
        if (diff > 0) gaps += diff;
      }
    }
  }

  const { unassigned } = assignRooms(units, chromosome, byId, rooms);

  const hardViolations = facultyClashes + sectionClashes + perDayViolations;
  const softViolations = gaps;
  const penalty =
    hardViolations * HARD_PENALTY + unassigned * MEDIUM_PENALTY + softViolations * SOFT_PENALTY;

  return {
    fitness: Math.round((10_000 - penalty) * 100) / 100,
    hardViolations,
    softViolations,
    facultyClashes,
    sectionClashes,
    roomClashes: 0,
    perDayViolations,
    roomIssues: unassigned,
    gaps,
  };
}

export interface GaOptions {
  population: number;
  generations: number;
  crossoverRate: number;
  mutationRate: number;
  eliteSize: number;
}

export const DEFAULT_GA: GaOptions = {
  population: 30,
  generations: 50,
  crossoverRate: 0.8,
  mutationRate: 0.1,
  eliteSize: 2,
};

function randomSlot(unit: Unit): number {
  const options = candidateSlots(unit);
  return options[Math.floor(Math.random() * options.length)]!;
}

function mutate(chromosome: Chromosome, units: Unit[], rate: number): Chromosome {
  const next = chromosome.slice();
  for (let i = 0; i < next.length; i++) {
    if (Math.random() < rate) next[i] = randomSlot(units[i]!);
  }
  return next;
}

/** Stage 2: genetic algorithm seeded from the graph-coloured timetable. */
export function geneticOptimize(
  units: Unit[],
  seed: Chromosome,
  byId: Map<string, EngineCourse>,
  rooms: EngineRoom[],
  options: GaOptions = DEFAULT_GA,
): { best: Chromosome; history: number[]; breakdown: FitnessBreakdown } {
  let population: Chromosome[] = [seed.slice()];
  while (population.length < options.population) {
    population.push(mutate(seed, units, 0.25));
  }

  const scoreOf = (c: Chromosome) => evaluate(units, c, byId, rooms).fitness;
  const history: number[] = [];
  let best = seed.slice();
  let bestScore = scoreOf(best);

  for (let gen = 0; gen < options.generations; gen++) {
    const scored = population
      .map((c) => ({ c, s: scoreOf(c) }))
      .sort((a, b) => b.s - a.s);

    if (scored[0]!.s > bestScore) {
      bestScore = scored[0]!.s;
      best = scored[0]!.c.slice();
    }
    history.push(Math.round(bestScore));

    const next: Chromosome[] = scored.slice(0, options.eliteSize).map((e) => e.c.slice());

    const tournament = (): Chromosome => {
      const a = scored[Math.floor(Math.random() * scored.length)]!;
      const b = scored[Math.floor(Math.random() * scored.length)]!;
      return (a.s >= b.s ? a.c : b.c).slice();
    };

    while (next.length < options.population) {
      const parentA = tournament();
      const parentB = tournament();
      let child = parentA;
      if (Math.random() < options.crossoverRate) {
        child = parentA.map((gene, i) => (Math.random() < 0.5 ? gene : parentB[i]!));
      }
      next.push(mutate(child, units, options.mutationRate));
    }
    population = next;
  }

  return { best, history, breakdown: evaluate(units, best, byId, rooms) };
}

export function toPlacements(
  units: Unit[],
  chromosome: Chromosome,
  roomByUnit: Array<string | null>,
): Placement[] {
  const out: Placement[] = [];
  units.forEach((unit, i) => {
    const slot = chromosome[i]!;
    const dayIndex = decodeDay(slot);
    const start = decodePeriod(slot);
    for (let k = 0; k < unit.length; k++) {
      const period = start + k;
      out.push({
        courseId: unit.courseId,
        occurrence: unit.occurrence + k,
        day: DAYS[dayIndex]!,
        dayIndex,
        period,
        timing: PERIOD_TIMINGS[period - 1] ?? "",
        roomId: roomByUnit[i] ?? null,
      });
    }
  });
  return out;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

/** Stage 4: independent validation engine over the stored timetable. */
export function validateTimetable(
  placements: Placement[],
  courses: EngineCourse[],
  rooms: EngineRoom[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byId = new Map(courses.map((c) => [c.id, c]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  const facultySlot = new Map<string, string>();
  const sectionSlot = new Map<string, string>();
  const roomSlot = new Map<string, string>();
  const seen = new Set<string>();
  const perCourseDay = new Map<string, number>();
  const perCourseWeek = new Map<string, number>();
  const courseDays = new Map<string, Set<number>>();

  for (const p of placements) {
    const course = byId.get(p.courseId);
    if (!course) continue;
    const cell = `${p.day}-P${p.period}`;
    const label = `${course.code} (${p.day} period ${p.period})`;

    const dup = `${p.courseId}#${p.day}#${p.period}`;
    if (seen.has(dup)) errors.push(`Duplicate occurrence for ${label}`);
    seen.add(dup);

    if (course.faculty_id) {
      const key = `${course.faculty_id}#${cell}`;
      const prev = facultySlot.get(key);
      if (prev && prev !== course.code)
        errors.push(`Faculty conflict at ${cell}: ${prev} and ${course.code}`);
      facultySlot.set(key, course.code);
    }

    const skey = `${course.department}-${course.section}#${cell}`;
    const prevSection = sectionSlot.get(skey);
    if (prevSection && prevSection !== course.code)
      errors.push(
        `Section conflict for ${course.department}-${course.section} at ${cell}: ${prevSection} and ${course.code}`,
      );
    sectionSlot.set(skey, course.code);

    if (p.roomId) {
      const rkey = `${p.roomId}#${cell}`;
      const prevRoom = roomSlot.get(rkey);
      if (prevRoom && prevRoom !== course.code)
        errors.push(`Room conflict at ${cell}: ${prevRoom} and ${course.code}`);
      roomSlot.set(rkey, course.code);

      const room = roomById.get(p.roomId);
      if (room) {
        if (room.room_type !== course.room_type)
          errors.push(`${label} is in ${room.room_number} (${room.room_type}) but needs ${course.room_type}`);
        if (room.capacity < course.student_count)
          errors.push(
            `${label}: room ${room.room_number} holds ${room.capacity} but ${course.student_count} students are enrolled`,
          );
      }
    } else {
      warnings.push(`${label} has no room assigned`);
    }

    const dkey = `${p.courseId}#${p.day}`;
    perCourseDay.set(dkey, (perCourseDay.get(dkey) ?? 0) + 1);
    perCourseWeek.set(p.courseId, (perCourseWeek.get(p.courseId) ?? 0) + 1);
    const set = courseDays.get(p.courseId) ?? new Set<number>();
    set.add(p.dayIndex);
    courseDays.set(p.courseId, set);
  }

  for (const [key, count] of perCourseDay) {
    const courseId = key.split("#")[0]!;
    const course = byId.get(courseId);
    if (course && count > course.max_periods_per_day) {
      errors.push(
        `${course.code} has ${count} periods on ${key.split("#")[1]} (maximum ${course.max_periods_per_day})`,
      );
    }
  }

  for (const course of courses) {
    const weekly = perCourseWeek.get(course.id) ?? 0;
    if (weekly === 0) {
      errors.push(`${course.code} is not scheduled at all`);
      continue;
    }
    if (weekly !== course.periods_per_week) {
      errors.push(
        `${course.code} has ${weekly} weekly periods but requires ${course.periods_per_week}`,
      );
    }
    const days = courseDays.get(course.id);
    if (course.consecutive_block) {
      if (days && days.size > 1)
        errors.push(`${course.code} is a ${course.credit}-credit lab block split across days`);
      const periods = placements
        .filter((p) => p.courseId === course.id)
        .map((p) => p.period)
        .sort((a, b) => a - b);
      for (let i = 1; i < periods.length; i++) {
        if (periods[i]! !== periods[i - 1]! + 1) {
          errors.push(`${course.code} lab block periods are not consecutive`);
          break;
        }
      }
    } else if (course.credit === 3 && days && days.size < 3) {
      warnings.push(`${course.code} (3 credits) is spread over only ${days.size} day(s)`);
    } else if (course.credit === 4 && days && days.size < 2) {
      warnings.push(`${course.code} (4 credits) is concentrated on a single day`);
    }
    const expectedHours = CREDIT_RULES[course.credit]?.requiredHours;
    if (expectedHours && course.required_hours !== expectedHours) {
      warnings.push(
        `${course.code} stores ${course.required_hours} required hours, expected ${expectedHours}`,
      );
    }
  }

  const score = Math.max(0, 100 - errors.length * 10 - warnings.length * 2);
  return { valid: errors.length === 0, errors, warnings, score };
}
