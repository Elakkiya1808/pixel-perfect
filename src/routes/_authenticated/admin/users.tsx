import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createAdminUser, listAppUsers, setUserRole } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User accounts · AI Course Timetable" },
      {
        name: "description",
        content:
          "Administrators manage timetable accounts: create other administrators and assign faculty or student roles.",
      },
      { property: "og:title", content: "User accounts · AI Course Timetable" },
      {
        property: "og:description",
        content: "Create administrators and assign roles for the timetable workspace.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <AdminUsersPage />
    </RoleGate>
  ),
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const list = useServerFn(listAppUsers);
  const createAdmin = useServerFn(createAdminUser);
  const changeRole = useServerFn(setUserRole);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const users = useQuery({ queryKey: ["app-users"], queryFn: () => list() });

  const createMutation = useMutation({
    mutationFn: () => createAdmin({ data: { email, password, fullName } }),
    onSuccess: () => {
      toast.success("Administrator created");
      setEmail("");
      setFullName("");
      setPassword("");
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "faculty" | "student" }) =>
      changeRole({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">User accounts</h1>
        <p className="text-sm text-muted-foreground">
          Only administrators can create administrators or change someone's role.
        </p>
      </div>

      <div className="panel p-5">
        <h2 className="mb-4 text-sm font-semibold">Create an administrator</h2>
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="adm-name">Full name</Label>
            <Input id="adm-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-email">Email</Label>
            <Input
              id="adm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-pass">Password</Label>
            <Input
              id="adm-pass"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create admin"}
            </Button>
          </div>
        </form>
      </div>

      <div className="panel overflow-x-auto p-5">
        <h2 className="mb-4 text-sm font-semibold">All accounts</h2>
        {users.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Name</th>
                <th className="py-2">Class</th>
                <th className="py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2">{u.fullName || u.username}</td>
                  <td className="py-2 text-muted-foreground">
                    {u.department ? `${u.department}${u.section ? ` · ${u.section}` : ""}` : "—"}
                  </td>
                  <td className="py-2">
                    <Select
                      value={u.role ?? "student"}
                      onValueChange={(v) =>
                        roleMutation.mutate({
                          userId: u.id,
                          role: v as "admin" | "faculty" | "student",
                        })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
