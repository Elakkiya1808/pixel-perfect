import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CalendarDays, GitBranch, Dna, ShieldCheck, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Course Timetable Optimizer — Graph Colouring + Genetic Algorithm" },
      {
        name: "description",
        content:
          "Generate conflict-free college timetables with credit-aware graph colouring, genetic optimisation, automatic room assignment and role-based dashboards.",
      },
      {
        property: "og:title",
        content: "AI Course Timetable Optimizer",
      },
      {
        property: "og:description",
        content:
          "Credit-aware graph colouring and a genetic algorithm build one conflict-free master timetable for every department, faculty member and section.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: GitBranch,
    title: "Credit-aware graph colouring",
    body: "Course occurrences become graph nodes; DSATUR saturation ordering finds an initial conflict-free schedule that respects 2, 3 and 4 credit patterns.",
  },
  {
    icon: Dna,
    title: "Genetic optimisation",
    body: "Population, tournament selection, uniform crossover, mutation and elitism run across generations to maximise a weighted fitness score.",
  },
  {
    icon: CalendarDays,
    title: "Automatic room assignment",
    body: "Every session gets the smallest suitable room that matches its type and seats every enrolled student.",
  },
  {
    icon: ShieldCheck,
    title: "Independent validation",
    body: "A separate validator re-checks faculty, section, room, capacity and credit rules and reports a 0-100 quality score.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-display font-semibold">Timetable AI</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Academic scheduling system
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
            One conflict-free master timetable, optimised by AI
          </h1>
          <p className="mt-5 text-base text-muted-foreground">
            Manage courses, faculty, rooms and sections, then generate a single master timetable
            using credit-aware graph colouring refined by a genetic algorithm. Admins, faculty and
            students each see exactly the view they need.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Open the workspace</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="panel p-6">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </section>

        <section className="panel mt-10 p-6">
          <h2 className="text-base font-semibold">Credit rules built in</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { c: "2 credits", h: "30 hours", p: "One 4-period consecutive lab block" },
              { c: "3 credits", h: "45 hours", p: "3 periods a week, different days" },
              { c: "4 credits", h: "60 hours", p: "4 periods a week, max 2 per day" },
            ].map((r) => (
              <div key={r.c} className="rounded-md bg-secondary/60 p-4">
                <div className="font-display text-lg font-semibold">{r.c}</div>
                <div className="text-sm text-muted-foreground">{r.h}</div>
                <div className="mt-2 text-sm">{r.p}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
