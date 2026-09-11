import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/AppShell";
import { TimetableGrid } from "@/components/TimetableGrid";
import { useProfile } from "@/hooks/useProfile";
import { fetchTimetable } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/student/timetable")({
  head: () => ({
    meta: [
      { title: "Class timetable · AI Course Timetable" },
      {
        name: "description",
        content: "Your section's weekly class timetable with faculty, rooms and period timings.",
      },
      { property: "og:title", content: "Class timetable · AI Course Timetable" },
      { property: "og:description", content: "Weekly class timetable for your section." },
    ],
  }),
  component: () => (
    <RoleGate allow="student">
      <StudentTimetable />
    </RoleGate>
  ),
});

function StudentTimetable() {
  const profile = useProfile();
  const timetable = useQuery({ queryKey: ["timetable"], queryFn: fetchTimetable });
  const entries = (timetable.data ?? []).filter(
    (e) =>
      e.course.department === profile.data?.department &&
      e.course.section === profile.data?.section,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Class timetable</h1>
        <p className="text-sm text-muted-foreground">
          {profile.data?.department}-{profile.data?.section} · {entries.length} periods per week.
        </p>
      </div>
      <TimetableGrid entries={entries} emptyMessage="No timetable published for your class yet." />
    </div>
  );
}
