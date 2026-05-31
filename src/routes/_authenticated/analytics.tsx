import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Timer, Flame, ClipboardList, BookOpen } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";

const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Eduvix" }] }),
  component: AnalyticsPage,
});

type Subject = { id: string; name: string; color: string };
type FS = {
  duration_seconds: number;
  subject_id: string | null;
  started_at: string;
  session_type: string;
  completed: boolean;
};
type Att = { subject_id: string; status: string; date: string };
type HC = { habit_id: string; date: string };
type Habit = { id: string; name: string; color: string };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function AnalyticsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<FS[]>([]);
  const [att, setAtt] = useState<Att[]>([]);
  const [hcs, setHcs] = useState<HC[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [examCount, setExamCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    if (!token) return;

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString().slice(0, 19).replace('T', ' ');

    (async () => {
      try {
        const res = await fetch(`${API_BASE}?action=getAnalyticsSummary`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ sinceIso })
        });
        const json = await res.json();
        const data = json.data || {};

        setSubjects(data.subjects ?? []);
        setSessions(data.sessions ?? []);
        setAtt(data.attendance ?? []);
        setHabits((data.habits ?? []).map((x: any) => ({ ...x, color: x.color ?? "#f59e0b" })));
        setHcs(data.habit_checkins ?? []);
        setExamCount(data.exams_count ?? 0);
        setNoteCount(data.notes_count ?? 0);
      } catch (err) {
        console.error("Failed to load analytics", err);
      }
    })();
  }, [user]);

  // Daily focus minutes (last 14d)
  const dailyFocus = useMemo(() => {
    const out: { day: string; mins: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const mins = Math.round(
        sessions
          .filter(
            (s) =>
              s.session_type === "focus" &&
              new Date(s.started_at) >= d &&
              new Date(s.started_at) < next,
          )
          .reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60,
      );
      out.push({ day: `${d.getMonth() + 1}/${d.getDate()}`, mins });
    }
    return out;
  }, [sessions]);

  // Focus minutes by subject (30d)
  const focusBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (s.session_type !== "focus") continue;
      const k = s.subject_id ?? "none";
      map.set(k, (map.get(k) ?? 0) + s.duration_seconds);
    }
    return Array.from(map.entries())
      .map(([k, secs]) => {
        const subj = subjects.find((x) => x.id === k);
        return {
          name: subj?.name ?? "Unassigned",
          mins: Math.round(secs / 60),
          color: subj?.color ?? "#64748b",
        };
      })
      .sort((a, b) => b.mins - a.mins);
  }, [sessions, subjects]);

  // Attendance by subject
  const attBySubject = useMemo(() => {
    return subjects.map((s) => {
      const rows = att.filter((r) => r.subject_id === s.id);
      const attended = rows.filter((r) => r.status === "attended").length;
      const counted = rows.filter((r) => r.status !== "cancelled").length;
      return {
        name: s.name,
        pct: counted ? Math.round((attended / counted) * 100) : 0,
        color: s.color,
      };
    });
  }, [subjects, att]);

  // Habits last 30d
  const habitTotals = useMemo(() => {
    return habits.map((h) => ({
      name: h.name,
      color: h.color,
      checkins: hcs.filter((c) => c.habit_id === h.id).length,
    }));
  }, [habits, hcs]);

  // Totals
  const totalFocusMin =
    sessions.filter((s) => s.session_type === "focus").reduce((a, s) => a + s.duration_seconds, 0) /
    60;
  const completedSessions = sessions.filter(
    (s) => s.session_type === "focus" && s.completed,
  ).length;
  const overallAtt = (() => {
    const a = att.filter((r) => r.status === "attended").length;
    const t = att.filter((r) => r.status !== "cancelled").length;
    return t ? Math.round((a / t) * 100) : 0;
  })();

  // Weekly grade based on focus minutes
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const weekMin =
    sessions
      .filter((s) => s.session_type === "focus" && new Date(s.started_at) >= weekStart)
      .reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60;
  const grade =
    weekMin > 1500 ? "S" : weekMin > 900 ? "A" : weekMin > 450 ? "B" : weekMin > 120 ? "C" : "D";
  const gradeColor =
    grade === "S" || grade === "A"
      ? "text-success border-success bg-success/10"
      : grade === "B"
        ? "text-primary border-primary bg-primary/10"
        : "text-destructive border-destructive bg-destructive/10";

  const weekEnd = new Date();
  const range = `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wider uppercase">
            Weekly <span className="text-primary">Report</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-wider">
            {range}
          </p>
        </div>
        <div
          className={`h-14 w-14 grid place-items-center rounded-md border font-mono text-2xl font-bold ${gradeColor}`}
        >
          {grade}
        </div>
      </motion.header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Focus (30d)" value={`${Math.round(totalFocusMin)}m`} icon={Timer} accent />
        <Stat label="Sessions Done" value={String(completedSessions)} icon={Flame} />
        <Stat label="Attendance" value={`${overallAtt}%`} icon={ClipboardList} />
        <Stat label="Notes · Exams" value={`${noteCount} · ${examCount}`} icon={BookOpen} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <Header title="Daily focus minutes" sub="LAST 14 DAYS" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyFocus}>
                <defs>
                  <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 45)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="oklch(0.3 0.02 250)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="day" stroke="oklch(0.6 0.02 250)" fontSize={10} />
                <YAxis stroke="oklch(0.6 0.02 250)" fontSize={10} unit="m" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v} min`, "Focus"]}
                />
                <Area
                  type="monotone"
                  dataKey="mins"
                  stroke="oklch(0.75 0.2 45)"
                  strokeWidth={2}
                  fill="url(#focusFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <Header title="Focus by subject" sub="30 DAYS" />
          {focusBySubject.length === 0 ? (
            <Empty>Run a Pomodoro to see this chart.</Empty>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={focusBySubject}
                    dataKey="mins"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {focusBySubject.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v} min`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <Header title="Attendance per subject" />
          {attBySubject.length === 0 ? (
            <Empty>Add subjects and mark attendance.</Empty>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attBySubject} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid
                    stroke="oklch(0.3 0.02 250)"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="oklch(0.6 0.02 250)"
                    fontSize={10}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="oklch(0.6 0.02 250)"
                    fontSize={10}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}%`, "Attendance"]}
                  />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                    {attBySubject.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <Header title="Habit check-ins" sub="LAST 30 DAYS" />
          {habitTotals.length === 0 ? (
            <Empty>Add habits to track them here.</Empty>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitTotals}>
                  <CartesianGrid
                    stroke="oklch(0.3 0.02 250)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis dataKey="name" stroke="oklch(0.6 0.02 250)" fontSize={10} />
                  <YAxis stroke="oklch(0.6 0.02 250)" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="checkins" radius={[6, 6, 0, 0]}>
                    {habitTotals.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "oklch(0.18 0.02 250)",
  border: "1px solid oklch(0.3 0.02 250)",
  borderRadius: 8,
  fontSize: 12,
};

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Timer;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-mono text-2xl font-bold mt-1 ${accent ? "text-gradient-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {sub && <span className="text-[10px] font-mono text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-64 grid place-items-center text-xs text-muted-foreground text-center px-6">
      {children}
    </div>
  );
}
