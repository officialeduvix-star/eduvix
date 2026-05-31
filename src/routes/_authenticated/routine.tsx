import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Coffee, BookOpen, Trash2, Clock, Activity, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from '@/hooks/use-auth';
const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";

export const Route = createFileRoute("/_authenticated/routine")({
  head: () => ({ meta: [{ title: "Routine Planner — Eduvix" }] }),
  component: RoutinePage,
});

type Subject = { id: string; name: string; color: string; attendance_target?: number };
type Block = {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  block_type: "study" | "break";
  title: string;
  subject_id: string | null;
  color: string | null;
};

const DEFAULT_ANCHORS = {
  wake: "06:00",
  sleep: "23:00",
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "21:00",
  evening_break: "15:00"
};

const minutes = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const to12h = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

function RoutinePage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [anchors, setAnchors] = useState(DEFAULT_ANCHORS);
  const [editing, setEditing] = useState<Partial<Block> | null>(null);
  const [coachingSlots, setCoachingSlots] = useState<{start: string, end: string}[]>([]);
  const [extraWorks, setExtraWorks] = useState<{title: string, start: string, end: string}[]>([]);
  const [newCoaching, setNewCoaching] = useState({ start: "", end: "" });
  const [newExtra, setNewExtra] = useState({ title: "", start: "", end: "" });

  const load = async () => {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const [subRes, bRes] = await Promise.all([
      fetch(`${API_BASE}?action=getSubjects`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}?action=getRoutineBlocks`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const subs = await subRes.json();
    const bls = await bRes.json();
    setSubjects(subs.data?.subjects ?? []);
    
    const allBlocks = bls.data?.blocks ?? [];
    // Filter template blocks (day_of_week = 0)
    const templateBlocks = allBlocks.filter((b: Block) => b.day_of_week === 0);
    
    // Extract anchors if they exist
    const anchorMap = { ...DEFAULT_ANCHORS };
    const customBlocks: Block[] = [];
    
    templateBlocks.forEach((b: Block) => {
      if (b.title === "Wake") anchorMap.wake = b.start_time.slice(0,5);
      else if (b.title === "Sleep") anchorMap.sleep = b.start_time.slice(0,5);
      else if (b.title === "Breakfast") anchorMap.breakfast = b.start_time.slice(0,5);
      else if (b.title === "Lunch") anchorMap.lunch = b.start_time.slice(0,5);
      else if (b.title === "Dinner") anchorMap.dinner = b.start_time.slice(0,5);
      else if (b.title === "Evening Break") anchorMap.evening_break = b.start_time.slice(0,5);
      else customBlocks.push(b);
    });
    
    setAnchors(anchorMap);
    setBlocks(customBlocks);
  };

  useEffect(() => {
    load();
  }, [user]);

  const saveBlock = async () => {
    if (!user || !editing) return;
    if (!editing.title || !editing.start_time || !editing.end_time) {
      toast.error("Title and times are required");
      return;
    }
    if (minutes(editing.end_time) <= minutes(editing.start_time)) {
      toast.error("End time must be after start time");
      return;
    }
    const subj = subjects.find((s) => s.id === editing.subject_id);
    const payload = {
      user_id: user.id,
      day_of_week: 0, // template day
      start_time: editing.start_time,
      end_time: editing.end_time,
      block_type: editing.block_type ?? "study",
      title: editing.title,
      subject_id: editing.block_type === "break" ? null : (editing.subject_id ?? null),
      color: editing.block_type === "break" ? "#64748b" : (subj?.color ?? "#f59e0b"),
    };
    const token = localStorage.getItem("ff_token");
    if (editing.id) {
      const res = await fetch(`${API_BASE}?action=updateRoutineBlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ id: editing.id, ...payload })
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.message);
      toast.success("Block updated");
    } else {
      const res = await fetch(`${API_BASE}?action=addRoutineBlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) return toast.error(data.message);
      toast.success("Block added");
    }
    setEditing(null);
    load();
  };

  const removeBlock = async (id: string) => {
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=deleteRoutineBlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (!data.success) return toast.error(data.message);
    toast.success("Removed");
    load();
  };

  const updateRoutine = async () => {
    const token = localStorage.getItem("ff_token");
    
    const anchorList = [
      { title: "Wake", start_time: anchors.wake, end_time: anchors.wake, color: "#FF5722" },
      { title: "Sleep", start_time: anchors.sleep, end_time: anchors.sleep, color: "#FF5722" },
      { title: "Breakfast", start_time: anchors.breakfast, end_time: anchors.breakfast, color: "#4CAF50" },
      { title: "Lunch", start_time: anchors.lunch, end_time: anchors.lunch, color: "#4CAF50" },
      { title: "Dinner", start_time: anchors.dinner, end_time: anchors.dinner, color: "#4CAF50" },
      { title: "Evening Break", start_time: anchors.evening_break, end_time: anchors.evening_break, color: "#9E9E9E" }
    ].map(a => ({ ...a, day_of_week: 0, block_type: "break" as const, subject_id: null }));

    try {
      const res = await fetch(`${API_BASE}?action=syncRoutineBlocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ anchors: anchorList, blocks: blocks })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      toast.success("Routine saved successfully!");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save routine");
    }
  };

  const openNew = (type: "study" | "break") => {
    setEditing({
      day_of_week: 0,
      start_time: "09:00",
      end_time: "10:00",
      block_type: type,
      title: type === "study" ? "" : "Break",
      subject_id: null,
      color: null,
    });
  };

  // Build the generated timeline
  const scheduleItems = useMemo(() => {
    const items = [];
    items.push({ time: anchors.wake, title: "Wake Up", type: "event", color: "#FF5722" });
    items.push({ time: anchors.breakfast, end: "", title: "Breakfast", type: "meal", color: "#4CAF50" });
    items.push({ time: anchors.lunch, end: "", title: "Lunch", type: "meal", color: "#4CAF50" });
    items.push({ time: anchors.evening_break, end: "", title: "Evening Break", type: "break", color: "#9E9E9E" });
    items.push({ time: anchors.dinner, end: "", title: "Dinner", type: "meal", color: "#4CAF50" });
    items.push({ time: anchors.sleep, title: "Sleep", type: "event", color: "#FF5722" });

    blocks.forEach(b => {
      items.push({
        id: b.id,
        time: b.start_time.slice(0,5),
        end: b.end_time.slice(0,5),
        title: b.title,
        type: b.block_type,
        color: b.color || (b.block_type === 'study' ? "#FF5722" : "#9E9E9E"),
        subject: subjects.find(s => s.id === b.subject_id)?.name
      });
    });

    return items.sort((a, b) => minutes(a.time) - minutes(b.time));
  }, [anchors, blocks, subjects]);

  const [isGenerating, setIsGenerating] = useState(false);

  const generateAIRoutine = () => {
    if (subjects.length === 0) {
      toast.error("Add subjects in Settings first so the routine uses subject names!");
      return;
    }

    setIsGenerating(true);
    
    // Artificial delay to simulate "AI Analysis"
    setTimeout(() => {
      const aw = anchors.wake        || DEFAULT_ANCHORS.wake;
      const as_ = anchors.sleep      || DEFAULT_ANCHORS.sleep;
      const ab = anchors.breakfast   || DEFAULT_ANCHORS.breakfast;
      const al = anchors.lunch       || DEFAULT_ANCHORS.lunch;
      const ad = anchors.dinner      || DEFAULT_ANCHORS.dinner;
      const aeb = anchors.evening_break || DEFAULT_ANCHORS.evening_break;

      const formatTime = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
      const w  = minutes(aw);
      const s  = minutes(as_);
      const b  = minutes(ab);
      const l  = minutes(al);
      const d  = minutes(ad);
      const eb = minutes(aeb);

      // 1. Define Fixed Constraints (Blocked Times)
      const constraints: {start: number, end: number}[] = [
        { start: b,  end: b  + 35 }, // Breakfast
        { start: l,  end: l  + 50 }, // Lunch
        { start: eb, end: eb + 30 }, // Evening Break
        { start: d,  end: d  + 50 }, // Dinner
        { start: s,  end: s  + 600 }, // Sleep (blocked until next morning)
      ];

      coachingSlots.forEach(c => {
        if (c.start && c.end) constraints.push({ start: minutes(c.start), end: minutes(c.end) });
      });
      extraWorks.forEach(e => {
        if (e.start && e.end) constraints.push({ start: minutes(e.start), end: minutes(e.end) });
      });

      constraints.sort((x, y) => x.start - y.start);

      // 2. Identify Available Windows
      const windows: {start: number, end: number}[] = [];
      let cur = w + 20; // Start 20m after wake for morning routine
      
      for (const c of constraints) {
        if (c.start > cur + 30) {
          windows.push({ start: cur, end: c.start });
        }
        cur = Math.max(cur, c.end);
      }

      // 3. Prepare Subjects (Weighted by Attendance Target if available)
      const sortedSubs = [...subjects].sort((x, y) => (y.attendance_target || 0) - (x.attendance_target || 0));
      let subIdx = 0;

      const newBlocks: Partial<Block>[] = [];

      // Pre-add fixed items for visual consistency
      coachingSlots.forEach(c => {
        newBlocks.push({ day_of_week: 0, start_time: c.start, end_time: c.end, block_type: "study", title: "Coaching", subject_id: null, color: "#8B5CF6" });
      });
      extraWorks.forEach(e => {
        newBlocks.push({ day_of_week: 0, start_time: e.start, end_time: e.end, block_type: "break", title: e.title, subject_id: null, color: "#F43F5E" });
      });

      // 4. Fill Windows with Smart Blocks
      for (const win of windows) {
        let winCur = win.start;
        let winRem = win.end - winCur;

        while (winRem >= 45) {
          let duration = 60;
          
          // Morning (until 12:30): Deep Work (90m blocks)
          if (winCur < 750) {
            duration = winRem >= 105 ? 90 : winRem;
          } 
          // Evening (after 19:30): Lighter Study (45m blocks)
          else if (winCur > 1170) {
            duration = 45;
          }
          // Afternoon: Standard (60m)
          else {
            duration = winRem >= 75 ? 60 : winRem;
          }

          duration = Math.min(duration, winRem);
          if (duration < 30) break;

          const subj = sortedSubs[subIdx % sortedSubs.length];
          newBlocks.push({
            day_of_week: 0,
            start_time: formatTime(winCur),
            end_time: formatTime(winCur + duration),
            block_type: "study",
            title: subj.name,
            subject_id: subj.id,
            color: subj.color
          });

          winCur += duration;
          winRem -= duration;
          subIdx++;

          // Short break after study
          if (winRem >= 15) {
            const breakDur = duration >= 90 ? 15 : 10;
            newBlocks.push({
              day_of_week: 0,
              start_time: formatTime(winCur),
              end_time: formatTime(winCur + breakDur),
              block_type: "break",
              title: "Rest & Refuel",
              subject_id: null,
              color: "#64748b"
            });
            winCur += breakDur;
            winRem -= breakDur;
          }
        }
      }

      setBlocks(newBlocks.map((bl, i) => ({ ...bl, id: `ai_${i}` } as Block)));
      setIsGenerating(false);
      toast.success("AI Routine Analysis Complete!");
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden text-foreground" style={{fontSize: '13px'}}>
      {/* Compact Header */}
      <header className="flex-none px-6 py-4 flex items-center justify-between border-b border-border/30 bg-background/60 backdrop-blur">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-xl font-bold tracking-[0.08em] uppercase">
            ROUTINE <span className="text-primary">PLANNER</span>
          </h1>
          <span className="hidden md:block text-[10px] text-muted-foreground font-mono tracking-wider border border-border/40 px-2 py-0.5 rounded">
            Structure your day
          </span>
        </div>
      </header>

      {/* Two-column body — each column scrolls independently */}
      <div className="flex-1 flex overflow-hidden min-h-0 text-sm">
        {/* Left Panel: Daily Framework */}
        <div className="w-[380px] flex-none border-r border-border/30 overflow-y-auto bg-[#0e0e0e]">
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-white mb-3">Daily Framework</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>WAKE</Label>
                  <Input type="time" value={anchors.wake} onChange={(e) => setAnchors({...anchors, wake: e.target.value})} />
                </div>
                <div>
                  <Label>SLEEP</Label>
                  <Input type="time" value={anchors.sleep} onChange={(e) => setAnchors({...anchors, sleep: e.target.value})} />
                </div>
                <div>
                  <Label>BREAKFAST</Label>
                  <Input type="time" value={anchors.breakfast} onChange={(e) => setAnchors({...anchors, breakfast: e.target.value})} />
                </div>
                <div>
                  <Label>LUNCH</Label>
                  <Input type="time" value={anchors.lunch} onChange={(e) => setAnchors({...anchors, lunch: e.target.value})} />
                </div>
                <div>
                  <Label>DINNER</Label>
                  <Input type="time" value={anchors.dinner} onChange={(e) => setAnchors({...anchors, dinner: e.target.value})} />
                </div>
                <div>
                  <Label>EVE. BREAK</Label>
                  <Input type="time" value={anchors.evening_break} onChange={(e) => setAnchors({...anchors, evening_break: e.target.value})} />
                </div>
              </div>
            </div>

            <hr className="border-border/30" />

            {/* Coaching Slots */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coaching Slot</span>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>FROM</Label>
                  <Input type="time" value={newCoaching.start} onChange={e => setNewCoaching({...newCoaching, start: e.target.value})} />
                </div>
                <div className="flex-1">
                  <Label>TO</Label>
                  <Input type="time" value={newCoaching.end} onChange={e => setNewCoaching({...newCoaching, end: e.target.value})} />
                </div>
                <button
                  onClick={() => {
                    if (!newCoaching.start || !newCoaching.end) return toast.error("Set both times");
                    setCoachingSlots([...coachingSlots, newCoaching]);
                    setNewCoaching({ start: "", end: "" });
                  }}
                  className="px-3 py-2 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 text-[#8B5CF6] text-xs font-bold hover:bg-[#8B5CF6]/30 transition mb-0.5"
                >Add</button>
              </div>
              {coachingSlots.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
                    <span className="text-xs font-semibold">Coaching</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{to12h(c.start)} – {to12h(c.end)}</span>
                  <button onClick={() => setCoachingSlots(coachingSlots.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive ml-2"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>

            {/* Extra Work */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Extra Work</span>
              <div>
                <Label>TITLE</Label>
                <Input placeholder="e.g. Sports, Gym, Project..." value={newExtra.title} onChange={e => setNewExtra({...newExtra, title: e.target.value})} />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>FROM</Label>
                  <Input type="time" value={newExtra.start} onChange={e => setNewExtra({...newExtra, start: e.target.value})} />
                </div>
                <div className="flex-1">
                  <Label>TO</Label>
                  <Input type="time" value={newExtra.end} onChange={e => setNewExtra({...newExtra, end: e.target.value})} />
                </div>
                <button
                  onClick={() => {
                    if (!newExtra.title || !newExtra.start || !newExtra.end) return toast.error("Fill all fields");
                    setExtraWorks([...extraWorks, newExtra]);
                    setNewExtra({ title: "", start: "", end: "" });
                  }}
                  className="px-3 py-2 rounded bg-[#F43F5E]/20 border border-[#F43F5E]/50 text-[#F43F5E] text-xs font-bold hover:bg-[#F43F5E]/30 transition mb-0.5"
                >Add</button>
              </div>
              {extraWorks.map((e, i) => (
                <div key={i} className="flex items-center justify-between bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#F43F5E]" />
                    <span className="text-xs font-semibold">{e.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{to12h(e.start)} – {to12h(e.end)}</span>
                  <button onClick={() => setExtraWorks(extraWorks.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive ml-2"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>

            {/* Existing custom blocks summary */}
            {blocks.length > 0 && (
              <div className="space-y-1.5">
                {blocks.map(b => (
                  <div key={b.id} onClick={() => setEditing(b)} className="flex items-center justify-between bg-secondary/20 hover:bg-secondary/40 border border-border/30 rounded-md px-2.5 py-1.5 cursor-pointer group transition">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full flex-none" style={{ background: b.color || '#FF5722' }} />
                      <span className="text-[11px] font-semibold truncate">{b.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground flex-none ml-2">
                      {to12h(b.start_time.slice(0,5))}–{to12h(b.end_time.slice(0,5))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={updateRoutine}
              className="w-full text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition py-1.5 border border-border/30 rounded-md"
            >
              Save Routine
            </button>
            <button
              onClick={generateAIRoutine}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-md py-3 text-xs font-bold tracking-[0.2em] uppercase transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isGenerating ? (
                <>
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  Analyzing Framework...
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" /> AI AUTO-GEN
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Generated Timeline */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-widest">Generated Schedule</h2>
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{scheduleItems.length} items</span>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:inset-0 before:ml-[5px] before:h-full before:w-px before:bg-border/20">
              {scheduleItems.map((item, i) => {
                const now = new Date();
                const hhmm = now.toTimeString().slice(0, 5);
                const isCurrent = 'time' in item && 'end' in item && item.time <= hhmm && item.end! >= hhmm;
                
                return (
                  <div key={i} className={`relative cursor-pointer group ${isCurrent ? 'scale-[1.02]' : ''}`} onClick={() => { if('id' in item && item.id) setEditing(blocks.find(b=>b.id === item.id) || null) }}>
                    <div className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border border-background shadow-sm ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} style={{ background: item.color }} />
                    <div className={`flex items-center gap-2 flex-wrap ${isCurrent ? 'text-primary' : ''}`}>
                      <span className="text-sm font-bold font-mono tracking-wider text-foreground">{to12h(item.time)}</span>
                      {'end' in item && item.end && <span className="text-xs font-mono text-muted-foreground">– {to12h(item.end)}</span>}
                      <span className="font-semibold text-sm group-hover:text-primary transition">{item.title}</span>
                      {item.type !== "event" && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                          {item.type}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse ml-2">Now</span>
                      )}
                      {'id' in item && !!item.id && (
                        <span className="ml-auto text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition">click to edit</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] border border-border/40 rounded-xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-sm font-bold uppercase tracking-widest">
                  {editing.id ? "Edit block" : "New block"}
                </h3>
                <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, block_type: "study" })}
                  className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition
                    ${editing.block_type === "study" ? "border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]" : "border-border/40 text-muted-foreground"}`}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Study
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, block_type: "break" })}
                  className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition
                    ${editing.block_type === "break" ? "border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]" : "border-border/40 text-muted-foreground"}`}
                >
                  <Coffee className="h-3.5 w-3.5" /> Break
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>TITLE</Label>
                  <Input
                    value={editing.title ?? ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder={editing.block_type === "break" ? "Break / Exercise" : "Physics"}
                  />
                </div>

                {editing.block_type === "study" && (
                  <div>
                    <Label>SUBJECT</Label>
                    <select
                      value={editing.subject_id ?? ""}
                      onChange={(e) => setEditing({ ...editing, subject_id: e.target.value || null })}
                      className="w-full bg-[#1A1A1A] border border-border/40 rounded-md px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[#FF5722] transition"
                    >
                      <option value="">— none —</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>START TIME</Label>
                    <Input
                      type="time"
                      value={editing.start_time?.slice(0, 5) ?? ""}
                      onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>END TIME</Label>
                    <Input
                      type="time"
                      value={editing.end_time?.slice(0, 5) ?? ""}
                      onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center">
                {editing.id ? (
                  <button
                    onClick={() => {
                      removeBlock(editing.id!);
                      setEditing(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-destructive hover:text-red-400 uppercase transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={saveBlock}
                  className="rounded-md bg-[#FF5722] hover:bg-[#F4511E] px-6 py-2.5 text-xs font-bold tracking-widest uppercase text-white shadow-lg shadow-[#FF5722]/20 transition"
                >
                  Save Block
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <label className={`block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1.5 ${className}`}>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[#1A1A1A] border border-border/40 rounded-md px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[#FF5722] transition"
    />
  );
}
