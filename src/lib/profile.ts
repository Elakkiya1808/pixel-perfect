import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useProfile";

/**
 * Creates the profile row and role for the signed-in user when they are missing.
 * Safe to call after every sign-in / sign-up that produced a session.
 */
export async function ensureProfile(): Promise<AppRole | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (key: string): string | null => {
    const value = meta[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  const requested = str("role");
  const selfRole: AppRole = requested === "faculty" ? "faculty" : "student";

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: user.id,
      username: str("username") ?? user.email ?? "user",
      full_name: str("full_name") ?? str("username"),
      faculty_id: selfRole === "faculty" ? str("faculty_id") : null,
      department: selfRole === "student" ? str("department") : null,
      section: selfRole === "student" ? str("section") : null,
    });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roles && roles.length > 0) {
    return roles[0]!.role as AppRole;
  }

  await supabase.from("user_roles").insert({ user_id: user.id, role: selfRole });
  return selfRole;
}
