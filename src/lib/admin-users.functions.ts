import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden: administrator access required");
}

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, username, full_name, department, section")
      .order("username");
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const roleFor = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));

    return (profiles ?? []).map((p: any) => ({
      id: p.id as string,
      username: p.username as string,
      fullName: (p.full_name as string | null) ?? null,
      department: (p.department as string | null) ?? null,
      section: (p.section as string | null) ?? null,
      role: (roleFor.get(p.id) as string | undefined) ?? null,
    }));
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; fullName: string }) => {
    if (!input?.email?.includes("@")) throw new Error("A valid email address is required");
    if (!input.password || input.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.fullName || data.email, full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account");

    const userId = created.user.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, username: data.fullName || data.email, full_name: data.fullName });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

    return { id: userId, email: data.email };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "faculty" | "student" }) => {
    if (!input?.userId) throw new Error("Missing user");
    if (!["admin", "faculty", "student"].includes(input.role)) throw new Error("Invalid role");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
