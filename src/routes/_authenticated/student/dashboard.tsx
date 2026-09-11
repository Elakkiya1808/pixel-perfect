import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/AppShell";
import { useProfile } from "@/hooks/useProfile";
import { fetchCourses, fetchTimetable } from "@/lib/queries";
import { DAYS } from "@/lib/timetable-engine";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  head: () => ({
    meta: [
      { title: "Student dashboard · AI Course Timetable" },
      {
        name: "description",
        content: "Your class overview: enrolled courses, faculty and weekly period distribution.",
      },
      { property: "og:title", content: "Student dashboard · AI Course Timetable" },
      { property: "og:description", content: "Enrolled courses and weekly class distribution." },
    ],
  }),
  component: () => (
    <RoleGate allow="student">
      <StudentDashboard />
    </RoleGate>
  ),
});

function StudentDashboard() {
  const profile = useProfile();
  const department = profile.data?.department ?? null;
  const section = profile.data?.section ?? null;

  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const timetable = useQuery({ queryKey: ["timetable"], queryFn: fetchTimetable });

  const myCourses = (courses.data ?? []).filter(
    (c) => c.department === department && c.section === section,
  );
  const myEntries = (timetable.data ?? []).filter(
    (e) => e.course.department === department && e.course.section === section,
  );

  if (!department || !section) {
    return (
      <div className="panel p-8 text-sm text-muted-foreground">
        Your department and section aren't set yet. Ask an administrator to update your profile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {department} — Section {section}
        </h1>
        <p className="text-sm text-muted-foreground">Your class overview for this semester.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Courses" value={myCourses.length} />
        <Card label="Weekly periods" value={myEntries.length} />
        <Card label="Total credits" value={myCourses.reduce((s, c) => s + c.credit, 0)} />
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-semibold">Periods per day</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {DAYS.map((day) => (
            <div key={day} className="rounded-md bg-secondary/60 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{day}</div>
              <div className="mt-1 text-xl font-semibold">
                {myEntries.filter((e) => e.day === day).length}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Code</th>
              <th className="p-3">Course</th>
              <th className="p-3">Type</th>
              <th className="p-3">Credit</th>
              <th className="p-3">Weekly periods</th>
            </tr>
          </thead>
          <tbody>
            {myCourses.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-semibold">{c.code}</td>
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.course_type}</td>
                <td className="p-3">{c.credit}</td>
                <td className="p-3">{c.periods_per_week}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
