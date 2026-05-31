import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Minus, AlertTriangle, TrendingUp, BookOpen } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";

const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Eduvix" }] }),
  component: AttendancePage,
});

type Subject = { id: string; name: string; color: string; attendance_target: number };
type Record = {
  id: string;
  subject_id: string;
  block_id: string;
  status: "attended" | "missed" | "cancelled";
  date: string;
};

function AttendancePage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async () => {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    try {
      // Sync first
      await fetch(`${API_BASE}?action=syncRoutineAttendance`, { headers: { Authorization: `Bearer ${token}` } });

      const [subRes, recRes, routineRes] = await Promise.all([
        fetch(`${API_BASE}?action=getSubjects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}?action=getAttendanceRecords`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}?action=getRoutineBlocks`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const subData = await subRes.json();
      const recData = await recRes.json();
      const routineData = await routineRes.json();

      setSubjects(subData.data?.subjects ?? []);
      setRecords((recData.data?.records ?? []) as Record[]);
      setBlocks(routineData.data?.blocks ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const markBlock = async (block: any, status: Record["status"]) => {
    if (!user) return;
    const isAlreadyAttended = records.find(r => String(r.block_id) === String(block.id) && r.date === today)?.status === 'attended';
    
    if (status === 'attended' && isAlreadyAttended) {
      toast.info("Attendance marked, XP gained!");
      return;
    }

    const token = localStorage.getItem("ff_token");
    try {
      const res = await fetch(`${API_BASE}?action=addAttendanceRecord`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          subjectId: block.subject_id || null, 
          blockId: block.id,
          status, 
          date: today 
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      if (status === 'attended') {
        toast.success("Marked as Present! +50 XP Gained.");
      } else {
        toast.success(`Marked as ${status}`);
      }
      
      window.dispatchEvent(new Event("xp-update"));
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark attendance");
    }
  };

  const todayBlocks = useMemo(() => {
    const dow = (new Date().getDay() + 6) % 7; // 0=Mon
    const anchorTitles = ["Wake", "Sleep", "Breakfast", "Lunch", "Dinner", "Evening Break", "Short Break", "Quick Break", "Rest & Refuel"];
    return blocks.filter(b => (b.day_of_week === dow || b.day_of_week === 0) && !anchorTitles.includes(b.title))
      .sort((a,b) => a.start_time.localeCompare(b.start_time));
  }, [blocks]);

  const summary = useMemo(() => {
    return subjects.map((s) => {
      const subRecs = records.filter((r) => r.subject_id === s.id);
      const attended = subRecs.filter((r) => r.status === "attended").length;
      const missed = subRecs.filter((r) => r.status === "missed").length;
      const counted = attended + missed;
      const pct = counted ? Math.round((attended / counted) * 100) : 0;
      return {
        subject: s,
        attended,
        missed,
        counted,
        pct,
        low: counted > 0 && pct < s.attendance_target,
      };
    });
  }, [subjects, records]);

  const overall = useMemo(() => {
    const a = records.filter((r) => r.status === "attended").length;
    const m = records.filter((r) => r.status === "missed").length;
    const t = a + m;
    return { pct: t ? Math.round((a / t) * 100) : 0, attended: a, missed: m };
  }, [records]);

  // last 14 days history
  const trend = useMemo(() => {
    const out: { date: string; pct: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const upto = records.filter((r) => r.date <= ds);
      const a = upto.filter((r) => r.status === "attended").length;
      const m = upto.filter((r) => r.status === "missed").length;
      const t = a + m;
      out.push({ date: ds.slice(5), pct: t ? Math.round((a / t) * 100) : 0 });
    }
    return out;
  }, [records]);

  const lowSubjects = summary.filter((s) => s.low);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">ATTENDANCE <span className="text-primary">SYNC</span></h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your attendance is now linked to your routine blocks.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Today's Checklist */}
        <div className="md:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em]">Today's Routine Checklist</h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </div>

          {todayBlocks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm italic">No routine blocks scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBlocks.map((b) => {
                const rec = records.find(r => 
                  String(r.block_id).trim() === String(b.id).trim() && 
                  new Date(r.date).toDateString() === new Date(today).toDateString()
                );
                const s = subjects.find(x => x.id === b.subject_id);
                const isAttended = rec?.status === 'attended';
                const isMissed = rec?.status === 'missed';
                const isCancelled = rec?.status === 'cancelled';
                
                return (
                  <div key={b.id} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-4 ${isAttended ? 'bg-success/10 border-success/40' : isMissed ? 'bg-destructive/5 border-destructive/30' : isCancelled ? 'bg-muted/10 border-border/30 opacity-60' : 'bg-secondary/20 border-border/40'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${isAttended ? 'bg-success text-white' : isMissed ? 'bg-destructive text-white' : 'bg-secondary text-muted-foreground'}`}>
                        {isAttended ? <Check className="h-5 w-5 stroke-[3]" /> : isMissed ? <X className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tracking-tight transition-all ${isAttended ? 'text-success' : ''}`}>{b.title}</span>
                          {s && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${s.color}20`, color: s.color }}>{s.name}</span>}
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">{b.start_time.slice(0,5)} — {b.end_time.slice(0,5)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button 
                        onClick={() => markBlock(b, 'attended')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${isAttended ? 'bg-success border-success text-white' : 'hover:border-success hover:text-success border-border'}`}
                      >
                        Attend
                      </button>
                      <button 
                        onClick={() => markBlock(b, 'missed')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${isMissed ? 'bg-destructive border-destructive text-white' : 'hover:border-destructive hover:text-destructive border-border'}`}
                      >
                        Miss
                      </button>
                      <button 
                        onClick={() => markBlock(b, 'cancelled')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${isCancelled ? 'bg-muted border-border text-foreground' : 'hover:bg-muted/50 border-border'}`}
                      >
                        Off
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">Overall Score</div>
            <div className="font-mono text-5xl font-bold text-gradient-primary leading-none">
              {overall.pct}%
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-mono">
              <span className="text-success">{overall.attended} Present</span>
              <span className="text-destructive">{overall.missed} Missed</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000" style={{ width: `${overall.pct}%` }} />
            </div>
          </div>

          {lowSubjects.length > 0 && (
            <div className="glass rounded-2xl p-6 border-destructive/20 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive mb-3">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">At Risk Subjects</span>
              </div>
              <div className="space-y-3">
                {lowSubjects.map(l => (
                  <div key={l.subject.id} className="flex items-center justify-between">
                    <span className="text-xs font-medium">{l.subject.name}</span>
                    <span className="text-xs font-mono text-destructive font-bold">{l.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-subject chart */}
      {subjects.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold mb-4">Subject performance</h2>
          <div className="glass rounded-2xl p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.map((s) => ({
                    name: s.subject.name,
                    pct: s.pct,
                    target: s.subject.attendance_target,
                    fill: s.subject.color,
                  }))}
                >
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10, fontFamily: "Space Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.23 0.02 260)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}%`, "Attendance"]}
                  />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <h2 className="font-display text-xl font-semibold mb-4">History</h2>
        <div className="glass rounded-2xl overflow-hidden">
          {records.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <BookOpen className="h-4 w-4" /> No records yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
              {records.slice(0, 50).map((r) => {
                const s = subjects.find((x) => x.id === r.subject_id);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-secondary/30 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: s?.color ?? "#999" }}
                      />
                      <span className="text-sm">{s?.name ?? "—"}</span>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded
                        ${r.status === "attended" ? "bg-success/15 text-success" : r.status === "missed" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{r.date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
