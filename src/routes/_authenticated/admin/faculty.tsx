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
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchFaculty } from "@/lib/queries";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty · AI Course Timetable" },
      { name: "description", content: "Manage faculty members, departments and contact details." },
      { property: "og:title", content: "Faculty · AI Course Timetable" },
      { property: "og:description", content: "Faculty directory for timetable scheduling." },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <FacultyPage />
    </RoleGate>
  ),
});

function FacultyPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [email, setEmail] = useState("");

  const faculty = useQuery({ queryKey: ["faculty"], queryFn: fetchFaculty });
  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("faculty").insert({ name, department, email });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["faculty"] });
      setOpen(false);
      setName("");
      setEmail("");
      toast.success("Faculty added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faculty").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["faculty"] });
      toast.success("Faculty removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Faculty</h1>
          <p className="text-sm text-muted-foreground">People available for course allocation.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add faculty
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New faculty member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Name</th>
              <th className="p-3">Department</th>
              <th className="p-3">Email</th>
              <th className="p-3">Courses</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(faculty.data ?? []).map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-3 font-medium">{f.name}</td>
                <td className="p-3">{f.department}</td>
                <td className="p-3 text-muted-foreground">{f.email}</td>
                <td className="p-3">
                  {(courses.data ?? []).filter((c) => c.faculty_id === f.id).length}
                </td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
