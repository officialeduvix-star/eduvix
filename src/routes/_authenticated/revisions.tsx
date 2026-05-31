import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from '@/hooks/use-auth';
const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";

export const Route = createFileRoute("/_authenticated/revisions")({
  head: () => ({ meta: [{ title: "Revision Queue — Eduvix" }] }),
  component: RevisionQueuePage,
});

type Subject = { id: string; name: string; color: string };
type Item = {
  id: string;
  subject_name: string;
  chapter: string;
  due_date: string;
  status: string;
  interval_days: number;
  last_reviewed_at: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function RevisionQueuePage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<"PENDING" | "DONE">("PENDING");
  const [form, setForm] = useState({
    subject: "",
    chapter: "",
    due_date: todayIso(),
    interval_days: 3,
  });

  const load = async () => {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const [subRes, rRes] = await Promise.all([
      fetch(`${API_BASE}?action=getSubjects`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}?action=getRevisions`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const subs = await subRes.json();
    const rows = await rRes.json();
    setSubjects(subs.data?.subjects ?? []);
    setItems(rows.data?.revisions ?? []);
    if (!form.subject && subs.data?.subjects?.length) setForm((f) => ({ ...f, subject: subs.data.subjects[0].name }));
  };

  useEffect(() => {
    load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.subject || !form.chapter) {
      toast.error("Subject and chapter required");
      return;
    }
    const subj = subjects.find((s) => s.name === form.subject);
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=addRevision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        subject_id: subj?.id ?? null,
        subject_name: form.subject,
        chapter: form.chapter,
        due_date: form.due_date,
        interval_days: form.interval_days,
        status: "pending",
      })
    });
    const data = await res.json();
    if (!data.success) return toast.error(data.message);
    toast.success("Scheduled");
    setForm({ ...form, chapter: "" });
    load();
  };

  const review = async (it: Item) => {
    const next = addDays(todayIso(), Math.max(1, it.interval_days * 2));
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=updateRevision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        id: it.id,
        status: "done",
        last_reviewed_at: new Date().toISOString(),
        due_date: next,
        interval_days: Math.min(60, it.interval_days * 2),
      })
    });
    const data = await res.json();
    if (!data.success) return toast.error(data.message);
    toast.success(`Next review in ${Math.min(60, it.interval_days * 2)} days`);
    load();
  };

  const reactivate = async (id: string) => {
    const token = localStorage.getItem("ff_token");
    await fetch(`${API_BASE}?action=updateRevision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id, status: "pending", due_date: todayIso() })
    });
    load();
  };

  const remove = async (id: string) => {
    const token = localStorage.getItem("ff_token");
    await fetch(`${API_BASE}?action=deleteRevision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    load();
  };

  const filtered = items.filter((i) =>
    tab === "PENDING" ? i.status === "pending" : i.status === "done",
  );
  const subjectNames = Array.from(
    new Set([...subjects.map((s) => s.name), ...items.map((i) => i.subject_name)]),
  );

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[0.05em] uppercase">
          Revision <span className="text-primary">Queue</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-wider">
          Spaced repetition. Don't let it decay.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <form
          onSubmit={submit}
          className="bg-card border border-border rounded-md p-6 space-y-4 h-fit"
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            + Add to Queue
          </div>

          <Field label="Subject">
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={inputCls}
            >
              {subjectNames.length === 0 && <option value="">— add subjects first —</option>}
              {subjectNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Chapter / Topic">
            <input
              required
              value={form.chapter}
              onChange={(e) => setForm({ ...form, chapter: e.target.value })}
              placeholder="e.g. Electrodynamics"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Due Date">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Interval (d)">
              <input
                type="number"
                min={1}
                value={form.interval_days}
                onChange={(e) => setForm({ ...form, interval_days: Number(e.target.value) || 1 })}
                className={inputCls}
              />
            </Field>
          </div>

          <button
            type="submit"
            className="w-full mt-2 rounded-md bg-[image:var(--gradient-primary)] px-4 py-2.5 text-xs font-bold tracking-[0.2em] uppercase text-primary-foreground glow-primary hover:scale-[1.02] transition"
          >
            Schedule Revision
          </button>
        </form>

        <div className="lg:col-span-2 bg-card border border-border rounded-md p-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Active Queue · {filtered.length}
            </span>
            <div className="flex bg-secondary rounded p-1 gap-1">
              {(["PENDING", "DONE"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition ${
                    tab === t
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="grid place-items-center h-64 text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Queue empty
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((it) => {
                const overdue = tab === "PENDING" && it.due_date < todayIso();
                return (
                  <div
                    key={it.id}
                    className={`flex items-center gap-3 p-3 bg-background border rounded-md ${overdue ? "border-destructive/60" : "border-border"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{it.chapter}</div>
                      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {it.subject_name} · due {new Date(it.due_date).toLocaleDateString()}
                        {overdue && <span className="text-destructive ml-2">OVERDUE</span>}
                      </div>
                    </div>
                    {tab === "PENDING" ? (
                      <button
                        onClick={() => review(it)}
                        title="Mark reviewed"
                        className="p-2 rounded text-success hover:bg-success/10 transition"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivate(it.id)}
                        title="Re-queue"
                        className="p-2 rounded text-primary hover:bg-primary/10 transition"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => remove(it.id)}
                      className="p-2 rounded text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
