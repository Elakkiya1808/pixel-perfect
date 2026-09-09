import { supabase } from "@/integrations/supabase/client";

export interface FacultyRow {
  id: string;
  name: string;
  department: string;
  email: string;
}

export interface RoomRow {
  id: string;
  room_number: string;
  room_type: string;
  capacity: number;
}

export interface CourseRow {
  id: string;
  code: string;
  name: string;
  credit: number;
  required_hours: number;
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

export interface TimetableRow {
  id: string;
  course_id: string;
  occurrence: number;
  day: string;
  period: number;
  timing: string;
  room_id: string | null;
}

export interface SemesterRow {
  id: string;
  semester_name: string;
  semester_start_date: string | null;
  semester_end_date: string | null;
  semester_months: number;
  teaching_weeks: number;
  period_duration_minutes: number;
}

export interface TimetableEntry {
  id: string;
  day: string;
  period: number;
  timing: string;
  course: CourseRow;
  room: RoomRow | null;
  faculty: FacultyRow | null;
}

export async function fetchFaculty(): Promise<FacultyRow[]> {
  const { data, error } = await supabase.from("faculty").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as unknown as FacultyRow[];
}

export async function fetchRooms(): Promise<RoomRow[]> {
  const { data, error } = await supabase.from("rooms").select("*").order("room_number");
  if (error) throw error;
  return (data ?? []) as unknown as RoomRow[];
}

export async function fetchCourses(): Promise<CourseRow[]> {
  const { data, error } = await supabase.from("courses").select("*").order("code");
  if (error) throw error;
  return (data ?? []) as unknown as CourseRow[];
}

export async function fetchSemester(): Promise<SemesterRow | null> {
  const { data, error } = await supabase
    .from("semester_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SemesterRow) ?? null;
}

export async function fetchLatestRun() {
  const { data } = await supabase
    .from("generation_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as {
    initial_fitness: number;
    optimized_fitness: number;
    validation_score: number;
    hard_violations: number;
    created_at: string;
  } | null;
}

export async function fetchTimetable(): Promise<TimetableEntry[]> {
  const [{ data: rows, error }, courses, rooms, faculty] = await Promise.all([
    supabase.from("timetable").select("*"),
    fetchCourses(),
    fetchRooms(),
    fetchFaculty(),
  ]);
  if (error) throw error;
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const facultyById = new Map(faculty.map((f) => [f.id, f]));

  return ((rows ?? []) as unknown as TimetableRow[])
    .map((r) => {
      const course = courseById.get(r.course_id);
      if (!course) return null;
      return {
        id: r.id,
        day: r.day,
        period: r.period,
        timing: r.timing,
        course,
        room: r.room_id ? (roomById.get(r.room_id) ?? null) : null,
        faculty: course.faculty_id ? (facultyById.get(course.faculty_id) ?? null) : null,
      } satisfies TimetableEntry;
    })
    .filter((e): e is TimetableEntry => e !== null);
}
