import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchSemester } from "@/lib/queries";
import { PERIOD_TIMINGS } from "@/lib/timetable-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/semester")({
  head: () => ({
    meta: [
      { title: "Semester settings · AI Course Timetable" },
      {
        name: "description",
        content: "Configure semester dates, teaching weeks and period duration for the timetable.",
      },
      { property: "og:title", content: "Semester settings · AI Course Timetable" },
      { property: "og:description", content: "Semester dates, teaching weeks and period length." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <SemesterPage />
    </RoleGate>
  ),
});

function SemesterPage() {
  const queryClient = useQueryClient();
  const semester = useQuery({ queryKey: ["semester"], queryFn: fetchSemester });
  const [form, setForm] = useState({
    semester_name: "",
    semester_start_date: "",
    semester_end_date: "",
    semester_months: 5,
    teaching_weeks: 20,
    period_duration_minutes: 55,
  });

  useEffect(() => {
    if (semester.data) {
      setForm({
        semester_name: semester.data.semester_name,
        semester_start_date: semester.data.semester_start_date ?? "",
        semester_end_date: semester.data.semester_end_date ?? "",
        semester_months: semester.data.semester_months,
        teaching_weeks: semester.data.teaching_weeks,
        period_duration_minutes: semester.data.period_duration_minutes,
      });
    }
  }, [semester.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        semester_name: form.semester_name,
        semester_start_date: form.semester_start_date || null,
        semester_end_date: form.semester_end_date || null,
        semester_months: form.semester_months,
        teaching_weeks: form.teaching_weeks,
        period_duration_minutes: form.period_duration_minutes,
      };
      const query = semester.data
        ? supabase.from("semester_settings").update(payload).eq("id", semester.data.id)
        : supabase.from("semester_settings").insert(payload);
      const { error } = await query;
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["semester"] });
      toast.success("Semester settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Semester settings</h1>
        <p className="text-sm text-muted-foreground">
          Required teaching hours stay separate from the weekly timetable pattern.
        </p>
      </div>

      <div className="panel max-w-2xl space-y-4 p-6">
        <div className="space-y-2">
          <Label>Semester name</Label>
          <Input
            value={form.semester_name}
            onChange={(e) => setForm({ ...form, semester_name: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.semester_start_date}
              onChange={(e) => setForm({ ...form, semester_start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input
              type="date"
              value={form.semester_end_date}
              onChange={(e) => setForm({ ...form, semester_end_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Months</Label>
            <Input
              type="number"
              value={form.semester_months}
              onChange={(e) => setForm({ ...form, semester_months: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Teaching weeks</Label>
            <Input
              type="number"
              value={form.teaching_weeks}
              onChange={(e) => setForm({ ...form, teaching_weeks: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Period duration (minutes)</Label>
            <Input
              type="number"
              value={form.period_duration_minutes}
              onChange={(e) =>
                setForm({ ...form, period_duration_minutes: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save settings
        </Button>
      </div>

      <div className="panel max-w-2xl p-6">
        <h2 className="text-base font-semibold">Daily period timings</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {PERIOD_TIMINGS.map((t, i) => (
            <li key={t} className="rounded-md bg-secondary/60 px-3 py-2">
              <span className="font-medium">Period {i + 1}</span>{" "}
              <span className="text-muted-foreground">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
