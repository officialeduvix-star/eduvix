import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Plus, Trash2, Check } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

import { useAuth } from '@/hooks/use-auth';
const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/habits")({
  head: () => ({ meta: [{ title: "Habits — Eduvix" }] }),
  component: HabitsPage,
});

type Habit = { id: string; name: string; color: string; target_per_week: number };
type Checkin = { id: string; habit_id: string; date: string };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}

function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#f59e0b");
  const [target, setTarget] = useState(7);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const [hRes, cRes] = await Promise.all([
      fetch(`${API_BASE}?action=getHabits`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}?action=getHabitCheckins`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const hs = await hRes.json();
    const cs = await cRes.json();
    setHabits((hs.data?.habits ?? []).map((h: any) => ({ ...h, color: h.color ?? "#f59e0b" })));
    setCheckins(cs.data?.checkins ?? []);
  }
  useEffect(() => {
    void load();
  }, [user]);

  async function addHabit() {
    if (!user || !name.trim()) return;
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=addHabit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        name: name.trim(),
        color,
        target_per_week: target,
      })
    });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.message);
      return;
    }
    setName("");
    setShowForm(false);
    toast.success("Habit added");
    void load();
  }

  async function toggle(habit: Habit, date: string) {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const existing = checkins.find((c) => c.habit_id === habit.id && c.date === date);
    if (existing) {
      await fetch(`${API_BASE}?action=deleteHabitCheckin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ id: existing.id })
      });
      setCheckins((x) => x.filter((c) => c.id !== existing.id));
    } else {
      const res = await fetch(`${API_BASE}?action=addHabitCheckin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ habit_id: habit.id, date })
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("Failed");
        return;
      }
      setCheckins((x) => [...x, { id: data.data.id, habit_id: habit.id, date }]);
      window.dispatchEvent(new Event("xp-update")); // Trigger XP update for habit
    }
  }

  async function removeHabit(id: string) {
    const token = localStorage.getItem("ff_token");
    await fetch(`${API_BASE}?action=deleteHabit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    setHabits((x) => x.filter((h) => h.id !== id));
    setCheckins((x) => x.filter((c) => c.habit_id !== id));
  }

  function streak(habitId: string) {
    const set = new Set(checkins.filter((c) => c.habit_id === habitId).map((c) => c.date));
    let s = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while (set.has(isoDate(d))) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }

  // Weekly chart: last 8 weeks completion %
  const weekData = useMemo(() => {
    const totalTarget = habits.reduce((a, h) => a + h.target_per_week, 0);
    const out: { week: string; pct: number; done: number }[] = [];
    const thisWeek = startOfWeek(new Date());
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(thisWeek);
      wStart.setDate(wStart.getDate() - i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      const inWeek = checkins.filter((c) => c.date >= isoDate(wStart) && c.date < isoDate(wEnd));
      const pct =
        totalTarget > 0 ? Math.min(100, Math.round((inWeek.length / totalTarget) * 100)) : 0;
      out.push({
        week: `${wStart.getMonth() + 1}/${wStart.getDate()}`,
        pct,
        done: inWeek.length,
      });
    }
    return out;
  }, [habits, checkins]);

  // last 7 days for grid
  const days = useMemo(() => {
    const arr: { date: string; label: string; dayLabel: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      arr.push({
        date: isoDate(d),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        dayLabel: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
      });
    }
    return arr;
  }, []);

  const today = isoDate(new Date());
  const completedToday = habits.filter((h) =>
    checkins.some((c) => c.habit_id === h.id && c.date === today),
  ).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Flame className="h-4 w-4" /> Habits
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Daily discipline.
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {completedToday}/{habits.length} done today
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium glow-primary"
        >
          <Plus className="h-4 w-4" /> Add habit
        </button>
      </motion.header>

      {showForm && (
        <div className="glass rounded-2xl p-5 mb-6 grid md:grid-cols-4 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Read 30 min"
            className="md:col-span-2 bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="bg-secondary/40 border border-border/40 rounded-lg h-10 px-1"
          />
          <select
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}× / week
              </option>
            ))}
          </select>
          <div className="md:col-span-4 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={addHabit}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          No habits yet. Build your daily rituals.
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-4 md:p-5 overflow-x-auto mb-6">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-muted-foreground">
                  <th className="text-left pb-3">Habit</th>
                  {days.map((d) => (
                    <th key={d.date} className="px-1 pb-3 text-center w-10">
                      <div>{d.dayLabel}</div>
                      <div className="text-[9px] opacity-60">{d.label}</div>
                    </th>
                  ))}
                  <th className="px-2 pb-3 text-center">Streak</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <tr key={h.id} className="border-t border-border/30">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: h.color ?? "#f59e0b" }}
                        />
                        <div>
                          <div className="font-medium text-sm">{h.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {h.target_per_week}× / week
                          </div>
                        </div>
                      </div>
                    </td>
                    {days.map((d) => {
                      const done = checkins.some((c) => c.habit_id === h.id && c.date === d.date);
                      const isToday = d.date === today;
                      return (
                        <td key={d.date} className="px-1 py-2 text-center">
                          <button
                            onClick={() => toggle(h, d.date)}
                            className={`h-9 w-9 rounded-lg border transition grid place-items-center ${
                              done
                                ? "border-transparent text-primary-foreground"
                                : isToday
                                  ? "border-primary/40 hover:bg-primary/10"
                                  : "border-border/40 hover:border-border"
                            }`}
                            style={done ? { background: h.color ?? "#f59e0b" } : undefined}
                            title={d.date}
                          >
                            {done && <Check className="h-4 w-4" />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 text-center">
                      <div className="inline-flex items-center gap-1 font-mono text-sm">
                        <Flame
                          className={`h-3.5 w-3.5 ${streak(h.id) > 0 ? "text-primary" : "text-muted-foreground"}`}
                        />
                        {streak(h.id)}
                      </div>
                    </td>
                    <td className="text-right pl-2">
                      <button
                        onClick={() => removeHabit(h.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Weekly completion</h2>
              <span className="text-[10px] font-mono text-muted-foreground">LAST 8 WEEKS</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <XAxis dataKey="week" stroke="oklch(0.6 0.02 250)" fontSize={10} />
                  <YAxis stroke="oklch(0.6 0.02 250)" fontSize={10} unit="%" />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.02 250)",
                      border: "1px solid oklch(0.3 0.02 250)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, _n, p) => [
                      `${v}% (${p.payload.done} check-ins)`,
                      "Completion",
                    ]}
                  />
                  <Bar dataKey="pct" fill="oklch(0.7 0.2 45)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
