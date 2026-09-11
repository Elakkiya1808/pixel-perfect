import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/AppShell";
import { useProfile } from "@/hooks/useProfile";
import { fetchCourses, fetchTimetable } from "@/lib/queries";
import { DAYS } from "@/lib/timetable-engine";

export const Route = createFileRoute("/_authenticated/faculty/dashboard")({
  head: () => ({
    meta: [
      { title: "Faculty dashboard · AI Course Timetable" },
      {
        name: "description",
        content: "See your assigned courses, weekly teaching load and daily class distribution.",
      },
      { property: "og:title", content: "Faculty dashboard · AI Course Timetable" },
      { property: "og:description", content: "Your courses and weekly teaching load at a glance." },
    ],
  }),
  component: () => (
    <RoleGate allow="faculty">
      <FacultyDashboard />
    </RoleGate>
  ),
});

function FacultyDashboard() {
  const profile = useProfile();
  const facultyId = profile.data?.facultyId ?? null;

  const timetable = useQuery({ queryKey: ["timetable"], queryFn: fetchTimetable });
  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  const myCourses = (courses.data ?? []).filter((c) => c.faculty_id === facultyId);
  const myEntries = (timetable.data ?? []).filter((e) => e.course.faculty_id === facultyId);

  if (!facultyId) {
    return (
      <div className="panel p-8 text-sm text-muted-foreground">
        Your account isn't linked to a faculty record yet. Ask an administrator to link it.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {profile.data?.fullName ?? "faculty"}</h1>
        <p className="text-sm text-muted-foreground">Your teaching overview for this semester.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Assigned courses" value={myCourses.length} />
        <Card label="Weekly periods" value={myEntries.length} />
        <Card
          label="Total credits"
          value={myCourses.reduce((sum, c) => sum + c.credit, 0)}
        />
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-semibold">Classes per day</h2>
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
              <th className="p-3">Class</th>
              <th className="p-3">Credit</th>
              <th className="p-3">Weekly periods</th>
            </tr>
          </thead>
          <tbody>
            {myCourses.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-semibold">{c.code}</td>
                <td className="p-3">{c.name}</td>
                <td className="p-3">
                  {c.department}-{c.section}
                </td>
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
