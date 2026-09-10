import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchFaculty, type CourseRow } from "@/lib/queries";
import { CREDIT_RULES } from "@/lib/timetable-engine";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  head: () => ({
    meta: [
      { title: "Courses · AI Course Timetable" },
      {
        name: "description",
        content:
          "Add and edit courses with credit-based hours, weekly periods and room requirements calculated automatically.",
      },
      { property: "og:title", content: "Courses · AI Course Timetable" },
      {
        property: "og:description",
        content: "Credit rules drive required hours, weekly periods and block scheduling.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <CoursesPage />
    </RoleGate>
  ),
});

const DEPARTMENTS = ["CSE", "ECE", "EEE", "MECH"];
const SECTIONS = ["A", "B"];

interface FormState {
  id?: string;
  code: string;
  name: string;
  department: string;
  section: string;
  faculty_id: string;
  credit: number;
  course_type: string;
  student_count: number;
  room_type: string;
}

const EMPTY: FormState = {
  code: "",
  name: "",
  department: "CSE",
  section: "A",
  faculty_id: "",
  credit: 4,
  course_type: "Theory",
  student_count: 60,
  room_type: "Classroom",
};

function CoursesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const faculty = useQuery({ queryKey: ["faculty"], queryFn: fetchFaculty });
  const rule = CREDIT_RULES[form.credit]!;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        department: form.department,
        section: form.section,
        faculty_id: form.faculty_id || null,
        credit: form.credit,
        course_type: form.course_type,
        student_count: form.student_count,
        room_type: form.room_type,
        required_hours: rule.requiredHours,
        periods_per_week: rule.periodsPerWeek,
        max_periods_per_day: rule.maxPeriodsPerDay,
        consecutive_block: rule.consecutiveBlock,
      };
      const query = form.id
        ? supabase.from("courses").update(payload).eq("id", form.id)
        : supabase.from("courses").insert(payload);
      const { error } = await query;
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setForm(EMPTY);
      toast.success("Course saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editCourse = (c: CourseRow) => {
    setForm({
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      section: c.section,
      faculty_id: c.faculty_id ?? "",
      credit: c.credit,
      course_type: c.course_type,
      student_count: c.student_count,
      room_type: c.room_type,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Hours and weekly patterns follow the credit rules automatically.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setForm(EMPTY);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit course" : "New course"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Course code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Course name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Faculty</Label>
                <Select
                  value={form.faculty_id}
                  onValueChange={(v) => setForm({ ...form, faculty_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {(faculty.data ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} — {f.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credit</Label>
                <Select
                  value={String(form.credit)}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      credit: Number(v),
                      course_type: Number(v) === 2 ? "Lab" : form.course_type,
                      room_type: Number(v) === 2 ? "Lab" : form.room_type,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4].map((c) => (
                      <SelectItem key={c} value={String(c)}>
                        {c} credits
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Students</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.student_count}
                  onChange={(e) => setForm({ ...form, student_count: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Course type</Label>
                <Select
                  value={form.course_type}
                  onValueChange={(v) => setForm({ ...form, course_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Theory">Theory</SelectItem>
                    <SelectItem value="Lab">Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Room type</Label>
                <Select
                  value={form.room_type}
                  onValueChange={(v) => setForm({ ...form, room_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Lab">Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md bg-secondary/60 p-4 text-sm sm:col-span-2">
                <div className="font-semibold">Calculated automatically</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>Required hours: {rule.requiredHours}</div>
                  <div>Weekly periods: {rule.periodsPerWeek}</div>
                  <div>Max periods/day: {rule.maxPeriodsPerDay}</div>
                  <div>Consecutive block: {rule.consecutiveBlock ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Save course
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Class</th>
              <th className="p-3">Faculty</th>
              <th className="p-3">Credit</th>
              <th className="p-3">Hours</th>
              <th className="p-3">Weekly</th>
              <th className="p-3">Max/day</th>
              <th className="p-3">Room</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(courses.data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-semibold">{c.code}</td>
                <td className="p-3">{c.name}</td>
                <td className="p-3">
                  {c.department}-{c.section}
                </td>
                <td className="p-3">
                  {faculty.data?.find((f) => f.id === c.faculty_id)?.name ?? "—"}
                </td>
                <td className="p-3">{c.credit}</td>
                <td className="p-3">{c.required_hours}</td>
                <td className="p-3">{c.periods_per_week}</td>
                <td className="p-3">{c.max_periods_per_day}</td>
                <td className="p-3">{c.room_type}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => editCourse(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
