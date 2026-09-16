import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "faculty" | "student";

export interface ProfileInfo {
  userId: string;
  email: string | null;
  username: string;
  fullName: string | null;
  role: AppRole | null;
  facultyId: string | null;
  department: string | null;
  section: string | null;
}

export function useProfile() {
  return useQuery<ProfileInfo | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      return {
        userId: user.id,
        email: user.email ?? null,
        username: profile?.username ?? user.email ?? "user",
        fullName: profile?.full_name ?? null,
        role: (roles?.[0]?.role as AppRole | undefined) ?? null,
        facultyId: profile?.faculty_id ?? null,
        department: profile?.department ?? null,
        section: profile?.section ?? null,
      };
    },
    staleTime: 60_000,
  });
}

export function homeRouteFor(role: AppRole | null): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "faculty") return "/faculty/dashboard";
  return "/student/dashboard";
}
