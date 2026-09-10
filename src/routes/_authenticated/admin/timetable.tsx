import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimetableGrid } from "@/components/TimetableGrid";
import { fetchFaculty, fetchTimetable } from "@/lib/queries";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/timetable")({
  head: () => ({
    meta: [
      { title: "Master timetable · AI Course Timetable" },
      {
        name: "description",
        content:
          "View the complete optimised master timetable and filter it by department, section or faculty member.",
      },
      { property: "og:title", content: "Master timetable · AI Course Timetable" },
      {
        property: "og:description",
        content: "Filter the single master timetable by department, section or faculty.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminTimetable />
    </RoleGate>
  ),
});

const ALL = "all";

function AdminTimetable() {
  const [department, setDepartment] = useState(ALL);
  const [section, setSection] = useState(ALL);
  const [facultyId, setFacultyId] = useState(ALL);

  const timetable = useQuery({ queryKey: ["timetable"], queryFn: fetchTimetable });
  const faculty = useQuery({ queryKey: ["faculty"], queryFn: fetchFaculty });

  const entries = (timetable.data ?? []).filter((e) => {
    if (department !== ALL && e.course.department !== department) return false;
    if (section !== ALL && e.course.section !== section) return false;
    if (facultyId !== ALL && e.course.faculty_id !== facultyId) return false;
    return true;
  });

  const departments = Array.from(
    new Set((timetable.data ?? []).map((e) => e.course.department)),
  ).sort();
  const sections = Array.from(new Set((timetable.data ?? []).map((e) => e.course.section))).sort();

  const exportCsv = () => {
    const header = "Day,Period,Timing,Code,Course,Department,Section,Faculty,Room\n";
    const body = entries
      .map((e) =>
        [
          e.day,
          e.period,
          e.timing,
          e.course.code,
          `"${e.course.name}"`,
          e.course.department,
          e.course.section,
          `"${e.faculty?.name ?? ""}"`,
          e.room?.room_number ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Master timetable</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} scheduled periods in the current view.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="w-40">
          <div className="mb-1 text-xs text-muted-foreground">Department</div>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32">
          <div className="mb-1 text-xs text-muted-foreground">Section</div>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <div className="mb-1 text-xs text-muted-foreground">Faculty</div>
          <Select value={facultyId} onValueChange={setFacultyId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All faculty</SelectItem>
              {(faculty.data ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setDepartment(ALL);
            setSection(ALL);
            setFacultyId(ALL);
          }}
        >
          Reset filters
        </Button>
      </div>

      <TimetableGrid
        entries={entries}
        showSection
        emptyMessage="No timetable yet — run the generator."
      />
    </div>
  );
}
