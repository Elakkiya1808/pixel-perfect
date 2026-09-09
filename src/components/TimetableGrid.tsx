import { DAYS, PERIOD_TIMINGS, PERIODS_PER_DAY } from "@/lib/timetable-engine";
import type { TimetableEntry } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface Props {
  entries: TimetableEntry[];
  showSection?: boolean;
  emptyMessage?: string;
}

export function TimetableGrid({ entries, showSection = false, emptyMessage }: Props) {
  const byCell = new Map<string, TimetableEntry[]>();
  for (const e of entries) {
    const key = `${e.day}#${e.period}`;
    const list = byCell.get(key) ?? [];
    list.push(e);
    byCell.set(key, list);
  }

  if (entries.length === 0) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "Nothing scheduled yet."}
      </div>
    );
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="bg-secondary/70">
            <th className="w-36 border-b border-border p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Period
            </th>
            {DAYS.map((d) => (
              <th
                key={d}
                className="border-b border-l border-border p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PERIODS_PER_DAY }, (_, i) => i + 1).map((period) => (
            <tr key={period} className="align-top">
              <td className="border-b border-border p-3">
                <div className="font-semibold">Period {period}</div>
                <div className="text-xs text-muted-foreground">{PERIOD_TIMINGS[period - 1]}</div>
              </td>
              {DAYS.map((day) => {
                const cell = byCell.get(`${day}#${period}`) ?? [];
                return (
                  <td key={day} className="border-b border-l border-border p-2">
                    {cell.length === 0 ? (
                      <div className="h-full min-h-14 rounded-md bg-muted/40" />
                    ) : (
                      <div className="space-y-2">
                        {cell.map((e) => (
                          <div
                            key={e.id}
                            className={cn(
                              "rounded-md border-l-4 bg-secondary/60 p-2 leading-tight",
                              e.course.course_type === "Lab"
                                ? "border-l-accent"
                                : "border-l-primary",
                            )}
                          >
                            <div className="font-semibold">{e.course.code}</div>
                            <div className="text-xs text-muted-foreground">{e.course.name}</div>
                            <div className="mt-1 text-xs">{e.faculty?.name ?? "Unassigned"}</div>
                            <div className="text-xs text-muted-foreground">
                              {e.room?.room_number ?? "No room"}
                              {showSection ? ` · ${e.course.department}-${e.course.section}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
