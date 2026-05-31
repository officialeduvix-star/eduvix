import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ClipboardList, Flame, Target, ArrowRight, BookOpen, Trophy, Info, X, Activity, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";
import { PomodoroTimer } from "@/components/pomodoro-timer";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Eduvix" }] }),
  component: Dashboard,
});

type Subj = { id: string; name: string; color: string; attendance_target: number };
type Att = { subject_id: string; status: string };
type LeaderboardUser = {
  id: number;
  full_name: string;
  uid: string;
  avatar_url: string | null;
  xp: number;
};

function getLevelInfo(totalXp: number) {
  const level = Math.floor(Math.pow(totalXp / 100, 1 / 1.5)) + 1;
  const prevLevelThreshold = Math.floor(100 * Math.pow(level - 1, 1.5));
  const nextLevelThreshold = Math.floor(100 * Math.pow(level, 1.5));
  
  const currentXpInLevel = Math.max(0, totalXp - prevLevelThreshold);
  const xpNeededForNextLevel = nextLevelThreshold - prevLevelThreshold;
  
  let rank = "Rookie";
  let rankColor = "#94A3B8"; // Gray

  if (level >= 1000) { rank = "Infinite Sage"; rankColor = "#EAB308"; }
  else if (level >= 900) { rank = "Divine Intellectual"; rankColor = "#EAB308"; }
  else if (level >= 800) { rank = "Universal Sage"; rankColor = "#EAB308"; }
  else if (level >= 700) { rank = "Cosmic Overlord"; rankColor = "#EAB308"; }
  else if (level >= 600) { rank = "Eternal Grandmaster"; rankColor = "#EAB308"; }
  else if (level >= 500) { rank = "Mythic Scholar"; rankColor = "#EAB308"; }
  else if (level >= 450) { rank = "Ascended Genius"; rankColor = "#EAB308"; }
  else if (level >= 400) { rank = "Omniscient Mind"; rankColor = "#EAB308"; }
  else if (level >= 350) { rank = "Infinite Guardian"; rankColor = "#EAB308"; }
  else if (level >= 300) { rank = "Supreme Scholar"; rankColor = "#EAB308"; }
  else if (level >= 250) { rank = "Grandmaster"; rankColor = "#EAB308"; }
  else if (level >= 200) { rank = "Divine Sage"; rankColor = "#F59E0B"; }
  else if (level >= 180) { rank = "Cosmic Strategist"; rankColor = "#F59E0B"; }
  else if (level >= 160) { rank = "Eternal Thinker"; rankColor = "#F59E0B"; }
  else if (level >= 140) { rank = "Celestial Scholar"; rankColor = "#F59E0B"; }
  else if (level >= 120) { rank = "Mythic Warrior"; rankColor = "#F59E0B"; }
  else if (level >= 100) { rank = "Grand Scholar"; rankColor = "#F59E0B"; }
  else if (level >= 95) { rank = "Wisdom Titan"; rankColor = "#EC4899"; }
  else if (level >= 90) { rank = "Knowledge Titan"; rankColor = "#EC4899"; }
  else if (level >= 85) { rank = "Brain Titan"; rankColor = "#EC4899"; }
  else if (level >= 80) { rank = "Focus Titan"; rankColor = "#EC4899"; }
  else if (level >= 75) { rank = "Academic Titan"; rankColor = "#EC4899"; }
  else if (level >= 70) { rank = "Study Legend"; rankColor = "#EC4899"; }
  else if (level >= 65) { rank = "Wisdom Legend"; rankColor = "#EC4899"; }
  else if (level >= 60) { rank = "Logic Legend"; rankColor = "#EC4899"; }
  else if (level >= 55) { rank = "Mind Conqueror"; rankColor = "#EC4899"; }
  else if (level >= 50) { rank = "Academic Elite"; rankColor = "#EC4899"; }
  else if (level === 49) { rank = "Wisdom Elite"; rankColor = "#8B5CF6"; }
  else if (level === 48) { rank = "Knowledge Elite"; rankColor = "#8B5CF6"; }
  else if (level === 47) { rank = "Study Elite"; rankColor = "#8B5CF6"; }
  else if (level === 46) { rank = "Focus Elite"; rankColor = "#8B5CF6"; }
  else if (level === 45) { rank = "Academic Elite"; rankColor = "#8B5CF6"; }
  else if (level === 44) { rank = "Brain Master"; rankColor = "#8B5CF6"; }
  else if (level === 43) { rank = "Logic Master"; rankColor = "#8B5CF6"; }
  else if (level === 42) { rank = "Knowledge Master"; rankColor = "#8B5CF6"; }
  else if (level === 41) { rank = "Wisdom Master"; rankColor = "#8B5CF6"; }
  else if (level === 40) { rank = "Learning Master"; rankColor = "#8B5CF6"; }
  else if (level === 39) { rank = "Study Vanguard"; rankColor = "#06B6D4"; }
  else if (level === 38) { rank = "Focus Guardian"; rankColor = "#06B6D4"; }
  else if (level === 37) { rank = "Brain Guardian"; rankColor = "#06B6D4"; }
  else if (level === 36) { rank = "Logic Guardian"; rankColor = "#06B6D4"; }
  else if (level === 35) { rank = "Academic Guardian"; rankColor = "#06B6D4"; }
  else if (level === 34) { rank = "Study Commander"; rankColor = "#06B6D4"; }
  else if (level === 33) { rank = "Wisdom Commander"; rankColor = "#06B6D4"; }
  else if (level === 32) { rank = "Knowledge Commander"; rankColor = "#06B6D4"; }
  else if (level === 31) { rank = "Brain Strategist"; rankColor = "#06B6D4"; }
  else if (level === 30) { rank = "Focus Knight"; rankColor = "#06B6D4"; }
  else if (level === 29) { rank = "Mind Strategist"; rankColor = "#3B82F6"; }
  else if (level === 28) { rank = "Learning Champion"; rankColor = "#3B82F6"; }
  else if (level === 27) { rank = "Study Champion"; rankColor = "#3B82F6"; }
  else if (level === 26) { rank = "Brain Champion"; rankColor = "#3B82F6"; }
  else if (level === 25) { rank = "Focus Champion"; rankColor = "#3B82F6"; }
  else if (level === 24) { rank = "Academic Expert"; rankColor = "#3B82F6"; }
  else if (level === 23) { rank = "Wisdom Expert"; rankColor = "#3B82F6"; }
  else if (level === 22) { rank = "Knowledge Expert"; rankColor = "#3B82F6"; }
  else if (level === 21) { rank = "Logic Expert"; rankColor = "#3B82F6"; }
  else if (level === 20) { rank = "Study Warrior"; rankColor = "#3B82F6"; }
  else if (level === 19) { rank = "Focus Warrior"; rankColor = "#22C55E"; }
  else if (level === 18) { rank = "Academic Warrior"; rankColor = "#22C55E"; }
  else if (level === 17) { rank = "Mind Guardian"; rankColor = "#22C55E"; }
  else if (level === 16) { rank = "Knowledge Fighter"; rankColor = "#22C55E"; }
  else if (level === 15) { rank = "Study Knight"; rankColor = "#22C55E"; }
  else if (level === 14) { rank = "Wisdom Seeker"; rankColor = "#22C55E"; }
  else if (level === 13) { rank = "Brain Worker"; rankColor = "#22C55E"; }
  else if (level === 12) { rank = "Focus Builder"; rankColor = "#22C55E"; }
  else if (level === 11) { rank = "Logic Learner"; rankColor = "#22C55E"; }
  else if (level === 10) { rank = "Scholar"; rankColor = "#22C55E"; }
  else if (level === 9) { rank = "Academic Starter"; rankColor = "#94A3B8"; }
  else if (level === 8) { rank = "Mind Explorer"; rankColor = "#94A3B8"; }
  else if (level === 7) { rank = "Thinker"; rankColor = "#94A3B8"; }
  else if (level === 6) { rank = "Study Trainee"; rankColor = "#94A3B8"; }
  else if (level === 5) { rank = "Knowledge Seeker"; rankColor = "#94A3B8"; }
  else if (level === 4) { rank = "Explorer"; rankColor = "#94A3B8"; }
  else if (level === 3) { rank = "Learner"; rankColor = "#94A3B8"; }
  else if (level === 2) { rank = "Beginner"; rankColor = "#94A3B8"; }
  else { rank = "Rookie"; rankColor = "#94A3B8"; }

  return { level, currentXp: currentXpInLevel, nextLvlXp: xpNeededForNextLevel, rank, rankColor };
}

function Dashboard() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [target, setTarget] = useState(75);
  const [subjects, setSubjects] = useState<Subj[]>([]);
  const [att, setAtt] = useState<Att[]>([]);
  const [blockCount, setBlockCount] = useState(0);
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [profileXp, setProfileXp] = useState(0);
  const [profileLevel, setProfileLevel] = useState(1);
  const [profileRank, setProfileRank] = useState("Rookie");
  const [rankColor, setRankColor] = useState("#94A3B8");
  const [profileStreak, setProfileStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    if (!token) return;

    const loadData = async () => {
      try {
        const [profRes, subsRes, attRes, routineRes, lbRes] = await Promise.all([
          fetch(`${API_BASE}?action=getProfile`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}?action=getSubjects`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}?action=getAttendanceRecords`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}?action=getRoutineBlocks`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}?action=getLeaderboard`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const prof = await profRes.json();
        const subs = await subsRes.json();
        const a = await attRes.json();
        const b = await routineRes.json();
        const lb = await lbRes.json();

        if (prof.data?.profile) {
          const nextXp = prof.data.profile.xp ?? 0;
          console.log("[Dashboard] getProfile xp update", nextXp, prof.data.profile);

          setName(prof.data.profile.full_name || "");
          setTarget(prof.data.profile.attendance_target ?? 75);
          setProfileXp(nextXp);
          setProfileLevel(prof.data.profile.level ?? 1);
          setProfileRank(prof.data.profile.rank ?? "Rookie");
          setRankColor(prof.data.profile.rank_color ?? "#94A3B8");
          setProfileStreak(prof.data.profile.streak ?? 0);
        }
        setSubjects((subs.data?.subjects ?? []) as Subj[]);
        setAtt(a.data?.records ?? []);
        const bls = b.data?.blocks ?? [];
        setBlocks(bls);
        setBlockCount(bls.length);
        setLeaderboard(lb.data?.leaderboard ?? []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };

    loadData();

    window.addEventListener("xp-update", loadData);
    return () => window.removeEventListener("xp-update", loadData);
  }, [user]);

function LiveActivity({ blocks, subjects }: { blocks: any[], subjects: any[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000); // update every 30s
    return () => clearInterval(t);
  }, []);

  const hhmm = now.toTimeString().slice(0, 5);
  const dow = (now.getDay() + 6) % 7; // 0=Mon
  
  // Use day-specific or template (day 0)
  const todayBlocks = blocks.filter(b => b.day_of_week === dow || b.day_of_week === 0)
    .sort((a,b) => a.start_time.localeCompare(b.start_time));

  const current = todayBlocks.find(b => b.start_time <= hhmm && b.end_time > hhmm);
  const next = todayBlocks.find(b => b.start_time > hhmm);

  const getSubj = (id: string) => subjects.find(s => s.id === id);

  return (
    <div className="bg-card border border-border rounded-md p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20 animate-pulse">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Current Activity</span>
          {current ? (
            <div className="mt-2 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg grid place-items-center bg-primary/10 border border-primary/20">
                {current.block_type === 'study' ? <BookOpen className="h-6 w-6 text-primary" /> : <ClipboardList className="h-6 w-6 text-primary" />}
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{current.title}</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {current.start_time.slice(0,5)} — {current.end_time.slice(0,5)} 
                  {current.subject_id && ` · ${getSubj(current.subject_id)?.name}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-muted-foreground text-sm font-medium italic">
              No active block. Check your routine.
            </div>
          )}
        </div>

        {next && (
          <div className="pt-4 border-t border-border/40 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Next Up</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: next.color || 'var(--primary)' }} />
                <span className="text-sm font-semibold">{next.title}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-muted-foreground">{next.start_time.slice(0,5)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

  const totalAttended = att.filter((r) => r.status === "attended").length;
  const totalCounted = att.filter((r) => r.status !== "cancelled").length;
  const overall = totalCounted ? Math.round((totalAttended / totalCounted) * 100) : 0;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const { currentXp: xp, nextLvlXp: xpMax } = getLevelInfo(profileXp);
  const level = profileLevel;
  const progress = Math.min(100, Math.round((overall / Math.max(target, 1)) * 100));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-start justify-between gap-6 flex-wrap"
      >
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wider uppercase">
            Command <span className="text-primary">Center</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            {today}
            {name ? ` · ${name.split(" ")[0]}` : ""}
          </p>
        </div>
        <div className="flex items-end gap-6 text-right">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setShowXpInfo(true)}
              className="p-2 rounded-full hover:bg-secondary/60 text-muted-foreground hover:text-primary transition"
              title="How to get XP"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="relative p-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-400 hover:bg-yellow-500/20 text-[#FFD700] hover:text-yellow-300 transition-all duration-300 shadow-[0_0_12px_rgba(234,179,8,0.2)] hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-pulse"
              title="Leaderboard"
            >
              <Trophy className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
              </span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event("show-pricing"))}
              className="p-2 rounded-full hover:bg-secondary/60 text-muted-foreground hover:text-emerald-400 transition"
              title="View Pricing Plans"
            >
              <CreditCard className="h-5 w-5" />
            </button>
          </div>
          <div className="min-w-45">
            <p className="text-xs text-muted-foreground uppercase tracking-wider text-right">Today's Progress</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <div className="h-1.5 w-32 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono text-primary font-bold text-sm">{progress}%</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Subjects" value={String(subjects.length)} icon={BookOpen} />
        <Stat label="Routine Blocks" value={String(blockCount)} icon={Calendar} />
        <Stat
          label="Attendance"
          value={`${overall}%`}
          icon={ClipboardList}
          accent={overall < target ? "warn" : "ok"}
        />
        <Stat label="Streak" value={`${profileStreak}d`} icon={Flame} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Live Activity Section */}
          <LiveActivity blocks={blocks} subjects={subjects} />

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="h-24 w-24 text-primary rotate-12" />
              </div>
              <div className="flex items-center justify-between mb-4 relative">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    Level {level}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ backgroundColor: `${rankColor}20`, color: rankColor }}>
                      {profileRank}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">{Math.floor(profileXp).toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total XP</div>
                </div>
              </div>
              
              <div className="space-y-2 relative">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.floor(xp)} / {Math.floor(xpMax)} XP</span>
                </div>
                <div className="h-3 bg-secondary/50 rounded-full overflow-hidden border border-border/40">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(xp / xpMax) * 100}%` }}
                    className="h-full bg-primary relative"
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickCard
              to="/routine"
              title="Build Your Routine"
              desc="Add weekly time blocks per subject + breaks."
              icon={Calendar}
            />
            <QuickCard
              to="/attendance"
              title="Mark Attendance"
              desc="Log today's classes and watch trends."
              icon={ClipboardList}
            />
          </div>
          <div className="bg-card border border-border rounded-md p-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
                Attendance Target
              </span>
            </div>
            <div className="font-mono text-4xl font-bold text-primary">{target}%</div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {overall >= target ? "ON TRACK. KEEP SHOWING UP." : "BELOW TARGET. TIME TO LOCK IN."}
            </p>
          </div>
        </div>
        <PomodoroTimer />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] mb-4 text-muted-foreground">
          Your Subjects
        </h2>
        {subjects.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No subjects yet. Add them in onboarding or settings.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => {
              const subAtt = att.filter((a) => a.subject_id === s.id);
              const at = subAtt.filter((a) => a.status === "attended").length;
              const tot = subAtt.filter((a) => a.status !== "cancelled").length;
              const pct = tot ? Math.round((at / tot) * 100) : 0;
              const low = tot > 0 && pct < s.attendance_target;
              return (
                <div key={s.id} className="bg-card border border-border rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="font-medium text-sm">{s.name}</span>
                    </div>
                    <span
                      className={`font-mono text-sm ${low ? "text-destructive" : "text-foreground"}`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: low ? "var(--destructive)" : s.color }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1.5 uppercase tracking-wider">
                    <span>
                      {at}/{tot} classes
                    </span>
                    <span>target {s.attendance_target}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showXpInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" /> XP System Rules
              </h2>
              <button onClick={() => setShowXpInfo(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-8 text-sm">
              <section>
                <h3 className="font-bold text-primary mb-3 flex items-center gap-2 border-b border-border/40 pb-2 uppercase tracking-widest text-xs">
                  <BookOpen className="h-4 w-4" /> Study Rewards
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                    <div className="text-foreground font-bold">+10 XP</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Pomodoro Session</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                    <div className="text-foreground font-bold">+25 XP</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Finish Session</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                    <div className="text-foreground font-bold">+40 XP</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Homework</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                    <div className="text-foreground font-bold">+70 XP</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Mock Test</div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-primary mb-3 flex items-center gap-2 border-b border-border/40 pb-2 uppercase tracking-widest text-xs">
                  <Activity className="h-4 w-4" /> Daily Activity
                </h3>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 transition">
                    <span className="text-muted-foreground italic">Maintain Attendance</span>
                    <span className="font-mono font-bold text-success">+10 XP</span>
                  </li>
                  <li className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 transition">
                    <span className="text-muted-foreground italic">Daily Login</span>
                    <span className="font-mono font-bold text-success">+5 XP</span>
                  </li>
                  <li className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 transition">
                    <span className="text-muted-foreground italic">Missed Session</span>
                    <span className="font-mono font-bold text-destructive">-10 XP</span>
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-primary mb-3 flex items-center gap-2 border-b border-border/40 pb-2 uppercase tracking-widest text-xs">
                  <Trophy className="h-4 w-4 text-[#FFD700]" /> Rank Progression
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 border border-border/40 rounded-xl p-2 bg-secondary/5">
                  {[
                    { lvl: "1", name: "Rookie", col: "#94A3B8" },
                    { lvl: "2", name: "Beginner", col: "#94A3B8" },
                    { lvl: "3", name: "Learner", col: "#94A3B8" },
                    { lvl: "4", name: "Explorer", col: "#94A3B8" },
                    { lvl: "5", name: "Knowledge Seeker", col: "#94A3B8" },
                    { lvl: "6", name: "Study Trainee", col: "#94A3B8" },
                    { lvl: "7", name: "Thinker", col: "#94A3B8" },
                    { lvl: "8", name: "Mind Explorer", col: "#94A3B8" },
                    { lvl: "9", name: "Academic Starter", col: "#94A3B8" },
                    { lvl: "10", name: "Scholar", col: "#22C55E" },
                    { lvl: "11", name: "Logic Learner", col: "#22C55E" },
                    { lvl: "12", name: "Focus Builder", col: "#22C55E" },
                    { lvl: "13", name: "Brain Worker", col: "#22C55E" },
                    { lvl: "14", name: "Wisdom Seeker", col: "#22C55E" },
                    { lvl: "15", name: "Study Knight", col: "#22C55E" },
                    { lvl: "16", name: "Knowledge Fighter", col: "#22C55E" },
                    { lvl: "17", name: "Mind Guardian", col: "#22C55E" },
                    { lvl: "18", name: "Academic Warrior", col: "#22C55E" },
                    { lvl: "19", name: "Focus Warrior", col: "#22C55E" },
                    { lvl: "20", name: "Study Warrior", col: "#3B82F6" },
                    { lvl: "21", name: "Logic Expert", col: "#3B82F6" },
                    { lvl: "22", name: "Knowledge Expert", col: "#3B82F6" },
                    { lvl: "23", name: "Wisdom Expert", col: "#3B82F6" },
                    { lvl: "24", name: "Academic Expert", col: "#3B82F6" },
                    { lvl: "25", name: "Focus Champion", col: "#3B82F6" },
                    { lvl: "26", name: "Brain Champion", col: "#3B82F6" },
                    { lvl: "27", name: "Study Champion", col: "#3B82F6" },
                    { lvl: "28", name: "Learning Champion", col: "#3B82F6" },
                    { lvl: "29", name: "Mind Strategist", col: "#3B82F6" },
                    { lvl: "30", name: "Focus Knight", col: "#06B6D4" },
                    { lvl: "31", name: "Brain Strategist", col: "#06B6D4" },
                    { lvl: "32", name: "Knowledge Commander", col: "#06B6D4" },
                    { lvl: "33", name: "Wisdom Commander", col: "#06B6D4" },
                    { lvl: "34", name: "Study Commander", col: "#06B6D4" },
                    { lvl: "35", name: "Academic Guardian", col: "#06B6D4" },
                    { lvl: "36", name: "Logic Guardian", col: "#06B6D4" },
                    { lvl: "37", name: "Brain Guardian", col: "#06B6D4" },
                    { lvl: "38", name: "Focus Guardian", col: "#06B6D4" },
                    { lvl: "39", name: "Study Vanguard", col: "#06B6D4" },
                    { lvl: "40", name: "Learning Master", col: "#8B5CF6" },
                    { lvl: "41", name: "Wisdom Master", col: "#8B5CF6" },
                    { lvl: "42", name: "Knowledge Master", col: "#8B5CF6" },
                    { lvl: "43", name: "Logic Master", col: "#8B5CF6" },
                    { lvl: "44", name: "Brain Master", col: "#8B5CF6" },
                    { lvl: "45", name: "Academic Elite", col: "#8B5CF6" },
                    { lvl: "46", name: "Focus Elite", col: "#8B5CF6" },
                    { lvl: "47", name: "Study Elite", col: "#8B5CF6" },
                    { lvl: "48", name: "Knowledge Elite", col: "#8B5CF6" },
                    { lvl: "49", name: "Wisdom Elite", col: "#8B5CF6" },
                    { lvl: "50+", name: "Academic Elite", col: "#EC4899" },
                    { lvl: "55+", name: "Mind Conqueror", col: "#EC4899" },
                    { lvl: "60+", name: "Logic Legend", col: "#EC4899" },
                    { lvl: "65+", name: "Wisdom Legend", col: "#EC4899" },
                    { lvl: "70+", name: "Study Legend", col: "#EC4899" },
                    { lvl: "75+", name: "Academic Titan", col: "#EC4899" },
                    { lvl: "80+", name: "Focus Titan", col: "#EC4899" },
                    { lvl: "85+", name: "Brain Titan", col: "#EC4899" },
                    { lvl: "90+", name: "Knowledge Titan", col: "#EC4899" },
                    { lvl: "95+", name: "Wisdom Titan", col: "#EC4899" },
                    { lvl: "100+", name: "Grand Scholar", col: "#F59E0B" },
                    { lvl: "120+", name: "Mythic Warrior", col: "#F59E0B" },
                    { lvl: "140+", name: "Celestial Scholar", col: "#F59E0B" },
                    { lvl: "160+", name: "Eternal Thinker", col: "#F59E0B" },
                    { lvl: "180+", name: "Cosmic Strategist", col: "#F59E0B" },
                    { lvl: "200+", name: "Divine Sage", col: "#F59E0B" },
                    { lvl: "250+", name: "Grandmaster", col: "#EAB308" },
                    { lvl: "300+", name: "Supreme Scholar", col: "#EAB308" },
                    { lvl: "350+", name: "Infinite Guardian", col: "#EAB308" },
                    { lvl: "400+", name: "Omniscient Mind", col: "#EAB308" },
                    { lvl: "450+", name: "Ascended Genius", col: "#EAB308" },
                    { lvl: "500+", name: "Mythic Scholar", col: "#EAB308" },
                    { lvl: "600+", name: "Eternal Grandmaster", col: "#EAB308" },
                    { lvl: "700+", name: "Cosmic Overlord", col: "#EAB308" },
                    { lvl: "800+", name: "Universal Sage", col: "#EAB308" },
                    { lvl: "900+", name: "Divine Intellectual", col: "#EAB308" },
                    { lvl: "1000+", name: "Infinite Sage", col: "#EAB308" }
                  ].map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-secondary/35 border border-border/10 hover:bg-secondary/50 transition">
                      <span className="text-muted-foreground font-semibold text-xs">Level {r.lvl}</span>
                      <span className="font-bold tracking-wide text-xs" style={{ color: r.col }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                <h3 className="font-black text-primary text-xs uppercase tracking-widest mb-2">Leveling Formula</h3>
                <code className="text-[10px] block font-mono bg-background/50 p-2 rounded border border-border/40 text-primary">
                  XP = 100 * (Level - 1)^1.5
                </code>
                <p className="text-[10px] text-muted-foreground mt-2 italic leading-relaxed">
                  Every level becomes slightly harder to reach, encouraging long-term consistency and academic growth.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#FFD700]" /> Global Leaderboard
              </h2>
              <button onClick={() => setShowLeaderboard(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-sm">
              {(() => {
                const myIndex = leaderboard.findIndex((u) => u.uid === user?.uid || u.full_name === name);
                if (myIndex < 0) return null;
                const me = leaderboard[myIndex];
                const { level, currentXp, nextLvlXp, rank, rankColor } = getLevelInfo(me.xp);
                return (
                  <div className="flex items-center gap-4 bg-primary/10 border border-primary/30 p-3 rounded-xl mb-4">
                    <div className="font-mono font-bold text-xl text-primary w-8 text-center">#{myIndex + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base truncate">{me.uid || me.full_name || "You"} (You)</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: rankColor }}>
                        {rank}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{currentXp.toLocaleString()} / {nextLvlXp.toLocaleString()} XP</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Level {level}</div>
                    </div>
                  </div>
                );
              })()}

              {leaderboard.slice(0, 10).map((u, i) => {
                const color = i === 0 ? "text-[#FFD700]" : i === 1 ? "text-[#C0C0C0]" : i === 2 ? "text-[#CD7F32]" : "text-muted-foreground";
                const isMe = u.uid === user?.uid || u.full_name === name;
                const { level, currentXp, nextLvlXp, rank, rankColor } = getLevelInfo(u.xp);
                return (
                  <div key={u.id} className={`flex items-center gap-4 p-3 rounded-xl border border-transparent ${isMe ? "bg-secondary/60" : "hover:bg-secondary/40"}`}>
                    <div className={`font-mono font-bold text-xl w-8 text-center ${color}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`truncate ${isMe ? "font-bold text-primary" : "font-semibold"}`}>{u.uid || u.full_name || "Operator"}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: rankColor }}>
                        {rank}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{currentXp.toLocaleString()} / {nextLvlXp.toLocaleString()} XP</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Level {level}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Calendar;
  accent?: "ok" | "warn";
}) {
  const color =
    accent === "warn" ? "text-destructive" : accent === "ok" ? "text-success" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className={`font-mono text-3xl font-bold mt-3 ${color}`}>{value}</div>
    </div>
  );
}

function QuickCard({
  to,
  title,
  desc,
  icon: Icon,
}: {
  to: string;
  title: string;
  desc: string;
  icon: typeof Calendar;
}) {
  return (
    <Link
      to={to}
      className="group bg-card border border-border rounded-md p-6 hover:border-primary/50 transition-all"
    >
      <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 grid place-items-center mb-3 group-hover:bg-primary/20 transition">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="font-semibold text-sm uppercase tracking-wider flex items-center justify-between">
        {title}{" "}
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{desc}</p>
    </Link>
  );
}
