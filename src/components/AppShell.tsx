import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, type AppRole } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const NAV: Record<AppRole, Array<{ to: string; label: string; icon: typeof LayoutDashboard }>> = {
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/faculty", label: "Faculty", icon: Users },
    { to: "/admin/rooms", label: "Rooms", icon: DoorOpen },
    { to: "/admin/generate", label: "Generate", icon: ShieldCheck },
    { to: "/admin/timetable", label: "Timetable", icon: CalendarDays },
    { to: "/admin/semester", label: "Semester", icon: Settings },
  ],
  faculty: [
    { to: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/faculty/timetable", label: "My timetable", icon: CalendarDays },
  ],
  student: [
    { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student/timetable", label: "Class timetable", icon: CalendarDays },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = profile?.role ? NAV[profile.role] : [];

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <GraduationCap className="h-6 w-6 text-sidebar-primary" />
          <div>
            <div className="font-display text-sm font-semibold leading-tight">Timetable AI</div>
            <div className="text-xs text-sidebar-foreground/70">Graph colouring + GA</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/70">
          <div className="truncate font-medium text-sidebar-foreground">{profile?.username}</div>
          <div className="capitalize">{profile?.role ?? "no role"}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div className="flex items-center gap-3 md:hidden">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-display text-sm font-semibold">Timetable AI</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            {profile?.department
              ? `${profile.department}${profile.section ? ` · Section ${profile.section}` : ""}`
              : "Master timetable workspace"}
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </header>

        <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function RoleGate({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (profile?.role !== allow) {
    return (
      <div className="panel p-8 text-center">
        <h2 className="text-lg font-semibold">Not available for your account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is restricted to {allow} accounts.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
