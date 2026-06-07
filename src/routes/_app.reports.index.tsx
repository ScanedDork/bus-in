import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore, KEYS, type Report } from "@/lib/store";
import { PageHeader, Surface, FilledButton, OutlinedButton } from "@/components/app-shell";
import { FileBarChart2, Plus, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/reports/")({ component: Reports });

function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useStore<Report[]>(KEYS.reports, []);
  const del = (id: string) => { if (confirm("Delete report?")) setReports(reports.filter((r) => r.id !== id)); };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Compose and save dashboards. Everything stays in your browser."
        actions={<FilledButton onClick={() => navigate({ to: "/reports/new" })}><Plus className="size-4" /> New report</FilledButton>}
      />
      {reports.length === 0 ? (
        <Surface className="p-12 text-center">
          <FileBarChart2 className="size-10 mx-auto text-on-surface-variant" />
          <h3 className="mt-3 font-semibold">No reports yet</h3>
          <p className="text-sm text-on-surface-variant mt-1">Build one from scratch or describe it to AI.</p>
          <div className="mt-4">
            <FilledButton onClick={() => navigate({ to: "/reports/new" })}><Plus className="size-4" /> Create report</FilledButton>
          </div>
        </Surface>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((r) => (
            <Surface key={r.id} className="p-5">
              <Link to="/reports/$id" params={{ id: r.id }} className="font-semibold hover:underline">{r.name}</Link>
              <div className="text-xs text-on-surface-variant mt-0.5">Updated {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })} · {r.widgets.length} widgets</div>
              {r.description ? <p className="text-sm text-on-surface-variant mt-3 line-clamp-2">{r.description}</p> : null}
              <div className="mt-4 flex gap-2 flex-wrap">
                <Link to="/reports/$id" params={{ id: r.id }}><OutlinedButton><ExternalLink className="size-4" /> Open</OutlinedButton></Link>
                <OutlinedButton onClick={() => del(r.id)}><Trash2 className="size-4" /></OutlinedButton>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </>
  );
}
