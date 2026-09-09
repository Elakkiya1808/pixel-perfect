import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  generateTimetable,
  resetTimetable,
  validateCurrentTimetable,
  type GenerateResult,
} from "@/lib/timetable.functions";
import type { ValidationResult } from "@/lib/timetable-engine";
import { DEFAULT_GA } from "@/lib/timetable-engine";
import { Dna, GitBranch, RotateCcw, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/generate")({
  head: () => ({
    meta: [
      { title: "Generate timetable · AI Course Timetable" },
      {
        name: "description",
        content:
          "Run credit-aware graph colouring and the genetic algorithm to build the optimised master timetable.",
      },
      { property: "og:title", content: "Generate timetable · AI Course Timetable" },
      {
        property: "og:description",
        content: "Graph colouring, genetic optimisation, room assignment and validation in one run.",
      },
    ],
  }),
  component: () => (
    <RoleGate allow="admin">
      <GeneratePage />
    </RoleGate>
  ),
});

function GeneratePage() {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateTimetable);
  const reset = useServerFn(resetTimetable);
  const validate = useServerFn(validateCurrentTimetable);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const genMutation = useMutation({
    mutationFn: () => generate({}),
    onSuccess: async (data) => {
      setResult(data);
      setValidation(data.validation);
      await queryClient.invalidateQueries();
      toast.success("Master timetable generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => reset({}),
    onSuccess: async () => {
      setResult(null);
      setValidation(null);
      await queryClient.invalidateQueries();
      toast.success("Timetable cleared");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validateMutation = useMutation({
    mutationFn: () => validate({}),
    onSuccess: (data) => {
      setValidation(data);
      toast.success(`Validation score ${data.score}/100`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Generate master timetable</h1>
        <p className="text-sm text-muted-foreground">
          One timetable is produced for the whole college; every dashboard is a filtered view of it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Stage 1 · Graph colouring</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            DSATUR saturation ordering over a conflict graph of course occurrences (same faculty,
            same section, same course).
          </p>
        </div>
        <div className="panel p-5">
          <Dna className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Stage 2 · Genetic algorithm</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Population {DEFAULT_GA.population}, {DEFAULT_GA.generations} generations, crossover{" "}
            {DEFAULT_GA.crossoverRate}, mutation {DEFAULT_GA.mutationRate}, elite{" "}
            {DEFAULT_GA.eliteSize}.
          </p>
        </div>
        <div className="panel p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">Stage 3 · Rooms &amp; validation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Smallest suitable room per session, then an independent validation pass with a 0-100
            score.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => genMutation.mutate()} disabled={genMutation.isPending}>
          {genMutation.isPending ? "Optimising…" : "Run full optimisation"}
        </Button>
        <Button
          variant="outline"
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
        >
          Validate current timetable
        </Button>
        <Button
          variant="outline"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset timetable
        </Button>
      </div>

      {result && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Initial fitness", value: result.initialFitness },
            { label: "Optimised fitness", value: result.optimizedFitness },
            { label: "Improvement", value: result.improvement },
            { label: "Scheduled periods", value: result.scheduled },
            { label: "Hard violations", value: result.hardViolations },
            { label: "Soft violations", value: result.softViolations },
            { label: "Unroomed sessions", value: result.roomIssues },
            { label: "Validation score", value: `${result.validation.score}/100` },
          ].map((s) => (
            <div key={s.label} className="panel p-5">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="mt-2 font-display text-2xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {validation && (
        <div className="panel p-6">
          <h2 className="text-base font-semibold">
            Validation {validation.valid ? "passed" : "found issues"} — score {validation.score}/100
          </h2>
          {validation.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-destructive">
              {validation.errors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {validation.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
