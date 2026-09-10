import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  fetchCourses,
  fetchFaculty,
  fetchLatestRun,
  fetchRooms,
  fetchTimetable,
} from "@/lib/queries";
import { validateCurrentTimetable } from "@/lib/timetable.functions";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard · AI Course Timetable" },
      {
        name: "description",
        content: "Overview of courses, faculty, rooms, timetable status and optimisation quality.",
      },
      { property: "og:title", content: "Admin dashboard · AI Course Timetable" },
      {
        property: "og:description",
        content: "Timetable status, fitness improvement and validation score at a glance.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminDashboard />
    </RoleGate>
  ),
});

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string | undefined;
}) {
  return (
    <div className="panel p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function AdminDashboard() {
  const validate = useServerFn(validateCurrentTimetable);
  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const faculty = useQuery({ queryKey: ["faculty"], queryFn: fetchFaculty });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: fetchRooms });
  const timetable = useQuery({ queryKey: ["timetable"], queryFn: fetchTimetable });
  const run = useQuery({ queryKey: ["latest-run"], queryFn: fetchLatestRun });
  const validation = useQuery({ queryKey: ["validation"], queryFn: () => validate({}) });

  const sections = new Set((courses.data ?? []).map((c) => `${c.department}-${c.section}`));
  const generated = (timetable.data ?? []).length > 0;
  const improvement = run.data
    ? Math.round((run.data.optimized_fitness - run.data.initial_fitness) * 100) / 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">Master timetable status and data health.</p>
        </div>
        <Button asChild>
          <Link to="/admin/generate">Generate timetable</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total courses" value={courses.data?.length ?? 0} />
        <Stat label="Total faculty" value={faculty.data?.length ?? 0} />
        <Stat label="Total rooms" value={rooms.data?.length ?? 0} />
        <Stat label="Total sections" value={sections.size} />
        <Stat
          label="Timetable status"
          value={generated ? "Generated" : "Not generated"}
          hint={generated ? `${timetable.data?.length} scheduled periods` : "Run the generator"}
        />
        <Stat label="Validation score" value={`${validation.data?.score ?? 0}/100`} />
        <Stat label="Initial fitness" value={run.data?.initial_fitness ?? "—"} />
        <Stat
          label="Optimised fitness"
          value={run.data?.optimized_fitness ?? "—"}
          hint={run.data ? `Improvement ${improvement}` : undefined}
        />
      </div>

      <div className="panel p-6">
        <div className="flex items-center gap-2">
          {validation.data?.valid ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-warning" />
          )}
          <h2 className="text-base font-semibold">Validation report</h2>
        </div>
        {validation.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Checking the timetable…</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {validation.data?.errors.length ?? 0} hard issues ·{" "}
              {validation.data?.warnings.length ?? 0} warnings
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              {(validation.data?.errors ?? []).slice(0, 8).map((e) => (
                <li key={e} className="text-destructive">
                  • {e}
                </li>
              ))}
              {(validation.data?.warnings ?? []).slice(0, 6).map((w) => (
                <li key={w} className="text-muted-foreground">
                  • {w}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
