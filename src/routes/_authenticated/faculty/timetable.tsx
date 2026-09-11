import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/AppShell";
import { TimetableGrid } from "@/components/TimetableGrid";
import { useProfile } from "@/hooks/useProfile";
import { fetchTimetable } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/faculty/timetable")({
  head: () => ({
    meta: [
      { title: "My timetable · AI Course Timetable" },
      {
        name: "description",
        content: "Your personal weekly teaching schedule with rooms and class timings.",
      },
      { property: "og:title", content: "My timetable · AI Course Timetable" },
      { property: "og:description", content: "Personal weekly teaching schedule." },
    ],
  }),
  component: () => (
    <RoleGate allow="faculty">
      <FacultyTimetable />
    </RoleGate>
  ),
});

function FacultyTimetable() {
  const profile = useProfile();
  const timetable = useQuery({ queryKey: ["timetable"], queryFn: fetchTimetable });
  const entries = (timetable.data ?? []).filter(
    (e) => e.course.faculty_id === profile.data?.facultyId,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My timetable</h1>
        <p className="text-sm text-muted-foreground">
          {entries.length} periods scheduled this week.
        </p>
      </div>
      <TimetableGrid
        entries={entries}
        showSection
        emptyMessage="No classes scheduled for you yet."
      />
    </div>
  );
}
