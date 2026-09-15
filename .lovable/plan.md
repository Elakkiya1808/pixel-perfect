# Fix sign-up, roles and sign-out

## What's wrong now

At sign-up the app creates the login account and then immediately tries to save the profile and role. Until the new account actually has an active session, the database refuses those two writes — that is the exact "Account created, but the profile could not be saved" message. The account exists, but with no profile and no role, so after signing in the app doesn't know which dashboard to open.

Sign-up also still offers "Admin" to anyone.

## What will change

**Sign-up**
- Name, role (Student or Faculty only), department/section or faculty record are attached to the new account at sign-up time.
- The profile and role record are written the moment the user first has a valid session, so the write always succeeds. No more error message.
- If the account still needs email confirmation, the screen says "check your email to confirm" instead of pretending the user is signed in.

**Sign-in**
- After signing in, the profile and role are created if they are missing (covers accounts already created with the broken flow), then the user lands on the right place: admin → admin dashboard, faculty → faculty dashboard, student → student dashboard.
- If an account somehow has no role, it defaults to student rather than bouncing back to the sign-in screen.

**Administrators**
- "Admin" is removed from the public sign-up choices.
- A new "Users" page inside the admin area lets a signed-in administrator create another administrator (email, name, password) or promote an existing user. This runs on the server with administrator rights so ordinary users cannot grant themselves the role.
- The database will also reject anyone trying to give themselves the admin role directly.
- Because there is currently no administrator, the very first admin is created once by a one-off setup step you approve, using an email you give me.

**Sign-out**
- Cancels in-flight requests, clears cached data, signs out, and returns to the sign-in page with no way to go "back" into the app.

**Testing**
- I'll run the full flow in a real browser: create a student account, sign in, check the student dashboard, sign out, then repeat for faculty, and confirm the admin-only user page is blocked for non-admins.

Timetable generation, validation, filtering and all existing pages stay untouched.

## Technical notes

- `signUp` gains `options.data` with username/full_name/role/department/section/faculty_id.
- New `src/lib/profile.ts` `ensureProfile()`: called after `signInWithPassword` and after a `signUp` that returns a session; upserts `profiles` and inserts into `user_roles` when absent, reading values from `user.user_metadata`. Role is clamped to `faculty`/`student` client-side.
- Migration: replace the `insert own role` policy with `user_id = auth.uid() AND role <> 'admin'`, plus an admin-only insert/update/delete policy using `has_role(auth.uid(),'admin')`; add `GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated` as needed.
- New `src/lib/admin-users.functions.ts` with `requireSupabaseAuth` middleware: verifies caller has the `admin` role via `context.supabase`, then `await import('@/integrations/supabase/client.server')` for `auth.admin.createUser` + profile/role insert.
- New route `src/routes/_authenticated/admin/users.tsx` (admin nav entry in `AppShell`), guarded in UI by `useProfile().role === 'admin'` and server-side by the role check above.
- `homeRouteFor` falls back to `/student/dashboard` for a null role.
- `AppShell.signOut`: `cancelQueries` → `clear` → `supabase.auth.signOut()` → `navigate({ to: '/auth', replace: true })`.
- Email/password auth stays as-is; no auto-confirm change unless you want instant sign-in after sign-up.
