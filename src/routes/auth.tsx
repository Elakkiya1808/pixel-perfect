import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchFaculty } from "@/lib/queries";
import { homeRouteFor, type AppRole } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · AI Course Timetable Optimizer" },
      {
        name: "description",
        content:
          "Sign in as admin, faculty or student to view and manage the AI-optimised college course timetable.",
      },
      { property: "og:title", content: "Sign in · AI Course Timetable Optimizer" },
      {
        property: "og:description",
        content: "Role-based access to the optimised master timetable.",
      },
    ],
  }),
  component: AuthPage,
});

const DEPARTMENTS = ["CSE", "ECE", "EEE", "MECH"];
const SECTIONS = ["A", "B"];

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<AppRole>("student");
  const [facultyId, setFacultyId] = useState<string>("");
  const [department, setDepartment] = useState("CSE");
  const [section, setSection] = useState("A");

  const { data: facultyList = [] } = useQuery({
    queryKey: ["faculty-public"],
    queryFn: fetchFaculty,
    retry: false,
  });

  const goHome = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const userRole = (roles?.[0]?.role as AppRole | undefined) ?? null;
    await queryClient.invalidateQueries();
    navigate({ to: homeRouteFor(userRole) });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goHome();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await goHome();
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? "Could not create the account");
      return;
    }

    const userId = data.user.id;
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      username: username || email,
      full_name: username || null,
      faculty_id: role === "faculty" && facultyId ? facultyId : null,
      department: role === "student" ? department : null,
      section: role === "student" ? section : null,
    });
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });
    setLoading(false);

    if (profileError || roleError) {
      toast.error("Account created, but the profile could not be saved. Please sign in again.");
      return;
    }
    toast.success("Account created");
    await goHome();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3 text-sidebar-foreground">
          <GraduationCap className="h-7 w-7 text-sidebar-primary" />
          <div>
            <h1 className="font-display text-lg font-semibold">AI Course Timetable</h1>
            <p className="text-xs text-sidebar-foreground/70">
              Graph colouring + genetic algorithm scheduler
            </p>
          </div>
        </div>

        <div className="panel p-6">
          <Tabs defaultValue="signin">
            <TabsList className="mb-5 grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={signUp}>
                <div className="space-y-2">
                  <Label htmlFor="su-name">Name</Label>
                  <Input
                    id="su-name"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <Input
                    id="su-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account type</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="student">Student / Section</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {role === "faculty" && (
                  <div className="space-y-2">
                    <Label>Faculty record</Label>
                    <Select value={facultyId} onValueChange={setFacultyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your name" />
                      </SelectTrigger>
                      <SelectContent>
                        {facultyList.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} — {f.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The list loads after your first sign-in if it appears empty.
                    </p>
                  </div>
                )}

                {role === "student" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={department} onValueChange={setDepartment}>
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
                      <Select value={section} onValueChange={setSection}>
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
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-sidebar-foreground/70">
          <Link to="/">Back to overview</Link>
        </p>
      </div>
    </div>
  );
}
