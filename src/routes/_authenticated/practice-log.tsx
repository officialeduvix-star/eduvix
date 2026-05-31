import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from '@/hooks/use-auth';
const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";

export const Route = createFileRoute("/_authenticated/practice-log")({
  head: () => ({ meta: [{ title: "Practice Log — Eduvix" }] }),
  component: PracticeLogPage,
});

type Subject = { id: string; name: string; color: string };
type Log = {
  id: string;
  subject_name: string;
  chapter: string;
  attempted: number;
  correct: number;
  wrong: number;
  time_minutes: number;
  difficulty: string;
  log_date: string;
  created_at: string;
};

function PracticeLogPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({
    subject: "",
    chapter: "",
    attempted: 0,
    correct: 0,
    wrong: 0,
    time_minutes: 0,
    difficulty: "Medium",
  });

  const load = async () => {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const [subRes, lRes] = await Promise.all([
      fetch(`${API_BASE}?action=getSubjects`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}?action=getPracticeLogs`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const subs = await subRes.json();
    const l = await lRes.json();
    setSubjects(subs.data?.subjects ?? []);
    setLogs(l.data?.logs ?? []);
    if (!form.subject && subs.data?.subjects?.length) setForm((f) => ({ ...f, subject: subs.data.subjects[0].name }));
  };

  useEffect(() => {
    load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.subject || !form.chapter) {
      toast.error("Subject and chapter required");
      return;
    }
    const subj = subjects.find((s) => s.name === form.subject);
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=addPracticeLog`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        subject_id: subj?.id ?? null,
        subject_name: form.subject,
        chapter: form.chapter,
        attempted: form.attempted,
        correct: form.correct,
        wrong: form.wrong,
        time_minutes: form.time_minutes,
        difficulty: form.difficulty,
        log_date: new Date().toISOString().slice(0, 10),
      })
    });
    const data = await res.json();
    if (!data.success) return toast.error(data.message);
    toast.success("Logged");
    setForm({ ...form, chapter: "", attempted: 0, correct: 0, wrong: 0, time_minutes: 0 });
    load();
  };

  const remove = async (id: string) => {
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=deletePracticeLog`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (!data.success) return toast.error(data.message);
    load();
  };

  const filtered = filter === "All" ? logs : logs.filter((l) => l.subject_name === filter);
  const subjectNames = Array.from(
    new Set([...subjects.map((s) => s.name), ...logs.map((l) => l.subject_name)]),
  );

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[0.05em] uppercase">
            Practice <span className="text-primary">Log</span>
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-wider">
          Drill. Score. Iterate.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <form
          onSubmit={submit}
          className="bg-card border border-border rounded-md p-6 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Log Practice
            </span>
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
              placeholder="e.g. Rotational Mechanics"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Attempted">
              <NumIn v={form.attempted} on={(v) => setForm({ ...form, attempted: v })} />
            </Field>
            <Field label="Correct">
              <NumIn v={form.correct} on={(v) => setForm({ ...form, correct: v })} />
            </Field>
            <Field label="Wrong">
              <NumIn v={form.wrong} on={(v) => setForm({ ...form, wrong: v })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Time (min)">
              <NumIn v={form.time_minutes} on={(v) => setForm({ ...form, time_minutes: v })} />
            </Field>
            <Field label="Difficulty">
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className={inputCls}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </Field>
          </div>

          <button
            type="submit"
            className="w-full mt-2 rounded-md bg-[image:var(--gradient-primary)] px-4 py-2.5 text-xs font-bold tracking-[0.2em] uppercase text-primary-foreground glow-primary hover:scale-[1.02] transition"
          >
            Add Entry
          </button>
        </form>

        {/* Logs */}
        <div className="bg-card border border-border rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Recent Sessions
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono"
            >
              <option>All</option>
              {subjectNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="grid place-items-center h-48 border border-dashed border-border rounded-md text-xs text-muted-foreground font-mono uppercase tracking-wider">
              No entries yet
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map((l) => {
                const acc = l.attempted ? Math.round((l.correct / l.attempted) * 100) : 0;
                return (
                  <div key={l.id} className="bg-background border border-border rounded-md p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm">{l.chapter}</div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {l.subject_name} · {l.difficulty} ·{" "}
                          {new Date(l.log_date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(l.id)}
                        className="text-muted-foreground hover:text-destructive transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 bg-secondary/40 rounded p-2">
                      <Cell label="Q" value={l.attempted} />
                      <Cell label="✓" value={l.correct} color="text-success" />
                      <Cell label="✗" value={l.wrong} color="text-destructive" />
                      <Cell label="ACC" value={`${acc}%`} color="text-primary" />
                    </div>
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

function NumIn({ v, on }: { v: number; on: (n: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={v}
      onChange={(e) => on(Number(e.target.value) || 0)}
      className={inputCls}
    />
  );
}

function Cell({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-mono text-sm font-bold ${color}`}>{value}</span>
      <span className="font-mono text-[9px] text-muted-foreground uppercase">{label}</span>
    </div>
  );
}
