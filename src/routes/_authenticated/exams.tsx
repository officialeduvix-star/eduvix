import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Plus, Trash2, CalendarDays } from "lucide-react";

import { useAuth } from '@/hooks/use-auth';
const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams — Eduvix" }] }),
  component: ExamsPage,
});

type Subject = { id: string; name: string; color: string };
type Exam = {
  id: string;
  title: string;
  subject_id: string | null;
  exam_date: string;
  syllabus_progress: number;
  notes: string | null;
};
type SyllabusItem = {
  id: string;
  exam_id: string;
  chapter: string;
  completed: boolean;
};

function safeParseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // If it's YYYY-MM-DD (standard from input type="date")
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00`);
  }
  // If it's DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }
  // Fallback
  let iso = dateStr;
  if (!iso.includes('T')) iso += "T00:00:00";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function daysUntil(date: string) {
  const d = safeParseDate(date);
  if (!d) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function ExamsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const [subRes, eRes, iRes] = await Promise.all([
      fetch(`${API_BASE}?action=getSubjects`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}?action=getExams`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}?action=getSyllabusItems`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const subs = await subRes.json();
    const e = await eRes.json();
    const items = await iRes.json();
    setSubjects(subs.data?.subjects ?? []);
    setExams(e.data?.exams ?? []);
    setSyllabusItems(items.data?.items ?? []);
  }

  useEffect(() => {
    void load();
  }, [user]);

  function examItems(examId: string) {
    return syllabusItems.filter((item) => item.exam_id === examId);
  }

  function computeExamProgress(exam: Exam) {
    const items = examItems(exam.id);
    if (!items.length) return exam.syllabus_progress;
    return Math.round((items.filter((item) => item.completed).length / items.length) * 100);
  }

  function computeSubjectProgress(subjectId: string) {
    const subjectExams = exams.filter((exam) => exam.subject_id === subjectId);
    if (!subjectExams.length) return 0;
    const subjectItems = syllabusItems.filter((item) =>
      subjectExams.some((exam) => exam.id === item.exam_id),
    );
    if (subjectItems.length) {
      return Math.round(
        (subjectItems.filter((item) => item.completed).length / subjectItems.length) * 100,
      );
    }
    return Math.round(
      subjectExams.reduce((sum, exam) => sum + exam.syllabus_progress, 0) / subjectExams.length,
    );
  }

  async function addExam() {
    if (!user || !title || !date) {
      toast.error("Title and date required");
      return;
    }
    let finalDate = date;
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(date)) {
      let [p1, p2, y] = date.split(/[-/]/);
      // p1 and p2 could be DD-MM or MM-DD.
      // If p1 > 12, it MUST be DD.
      if (parseInt(p1) > 12) {
        finalDate = `${y}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
      } else {
        // Assume MM-DD by default, or DD-MM.
        // If we want to be safe, standard fallback:
        finalDate = `${y}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
      }
    }

    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=addExam`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        title,
        exam_date: finalDate,
        subject_id: subjectId || null,
        notes: notes || null,
        syllabus_progress: 0,
      })
    });
    const data = await res.json();

    if (!data.success) {
      toast.error(data.message);
      return;
    }
    setTitle("");
    setDate("");
    setSubjectId("");
    setNotes("");
    setShowForm(false);
    toast.success("Exam added");
    window.dispatchEvent(new Event("xp-update"));
    void load();
  }

  async function updateProgress(id: string, value: number) {
    const token = localStorage.getItem("ff_token");
    setExams((x) =>
      x.map((exam) => (exam.id === id ? { ...exam, syllabus_progress: value } : exam)),
    );
    await fetch(`${API_BASE}?action=updateExam`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id, syllabus_progress: value })
    });
  }

  async function refreshExamProgress(examId: string, nextItems?: SyllabusItem[]) {
    const items = nextItems ?? syllabusItems.filter((item) => item.exam_id === examId);
    const progress = items.length
      ? Math.round((items.filter((item) => item.completed).length / items.length) * 100)
      : (exams.find((exam) => exam.id === examId)?.syllabus_progress ?? 0);

    const token = localStorage.getItem("ff_token");
    setExams((x) =>
      x.map((exam) => (exam.id === examId ? { ...exam, syllabus_progress: progress } : exam)),
    );
    await fetch(`${API_BASE}?action=updateExam`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id: examId, syllabus_progress: progress })
    });
  }

  async function addSyllabusItem(examId: string, chapter: string) {
    if (!user || !chapter.trim()) return;
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=addSyllabusItem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        exam_id: examId,
        chapter: chapter.trim(),
        completed: false,
      })
    });
    const { success, message, data } = await res.json();
    if (!success) {
      toast.error(message);
      return;
    }
    const nextItems = [...syllabusItems, data];
    setSyllabusItems(nextItems);
    await refreshExamProgress(examId, nextItems);
    window.dispatchEvent(new Event("xp-update"));
  }

  async function toggleSyllabusItem(item: SyllabusItem, completed: boolean) {
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=updateSyllabusItem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id: item.id, completed })
    });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.message);
      return;
    }
    const nextItems = syllabusItems.map((entry) =>
      entry.id === item.id ? { ...entry, completed } : entry,
    );
    setSyllabusItems(nextItems);
    await refreshExamProgress(item.exam_id, nextItems);
    window.dispatchEvent(new Event("xp-update"));
  }

  async function removeSyllabusItem(item: SyllabusItem) {
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=deleteSyllabusItem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id: item.id })
    });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.message);
      return;
    }
    const nextItems = syllabusItems.filter((entry) => entry.id !== item.id);
    setSyllabusItems(nextItems);
    await refreshExamProgress(item.exam_id, nextItems);
  }

  async function remove(id: string) {
    const token = localStorage.getItem("ff_token");
    await fetch(`${API_BASE}?action=deleteExam`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    setExams((x) => x.filter((exam) => exam.id !== id));
    setSyllabusItems((list) => list.filter((item) => item.exam_id !== id));
  }

  const upcoming = exams.filter((e) => daysUntil(e.exam_date) >= 0);
  const past = exams.filter((e) => daysUntil(e.exam_date) < 0);
  const subjectSummaries = useMemo(
    () =>
      subjects
        .map((subject) => ({
          subject,
          progress: computeSubjectProgress(subject.id),
          exams: exams.filter((exam) => exam.subject_id === subject.id),
          items: syllabusItems.filter((item) =>
            exams.some((exam) => exam.id === item.exam_id && exam.subject_id === subject.id),
          ),
        }))
        .filter((summary) => summary.exams.length > 0),
    [subjects, exams, syllabusItems],
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Exams
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Countdown to victory.
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium glow-primary"
        >
          <Plus className="h-4 w-4" /> Add exam
        </button>
      </motion.header>

      {showForm && (
        <div className="glass rounded-2xl p-5 mb-6 grid md:grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Exam title (e.g. Midterm — Calculus)"
            className="md:col-span-2 bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="md:col-span-2 bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm"
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={addExam}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {subjectSummaries.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          {subjectSummaries.map(({ subject, progress, items }) => (
            <div key={subject.id} className="glass rounded-2xl p-5 border border-border/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {subject.name}
                  </p>
                  <p className="text-2xl font-semibold">{progress}%</p>
                </div>
                <span className="h-3 w-3 rounded-full" style={{ background: subject.color }} />
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {items.length} chapter{items.length === 1 ? "" : "s"} tracked
              </p>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" /> Upcoming
      </h2>
      {upcoming.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
          No upcoming exams. Add your first one.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {upcoming.map((exam) => (
            <ExamCard
              key={exam.id}
              e={exam}
              subjects={subjects}
              items={examItems(exam.id)}
              progress={computeExamProgress(exam)}
              onProgress={updateProgress}
              onRemove={remove}
              onAddSyllabusItem={addSyllabusItem}
              onToggleSyllabusItem={toggleSyllabusItem}
              onRemoveSyllabusItem={removeSyllabusItem}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold mt-8 mb-3 text-muted-foreground">
            Past
          </h2>
          <div className="grid md:grid-cols-2 gap-3 opacity-70">
            {past.map((exam) => (
              <ExamCard
                key={exam.id}
                e={exam}
                subjects={subjects}
                items={examItems(exam.id)}
                progress={computeExamProgress(exam)}
                onProgress={updateProgress}
                onRemove={remove}
                onAddSyllabusItem={addSyllabusItem}
                onToggleSyllabusItem={toggleSyllabusItem}
                onRemoveSyllabusItem={removeSyllabusItem}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ExamCard({
  e,
  subjects,
  items,
  progress,
  onProgress,
  onRemove,
  onAddSyllabusItem,
  onToggleSyllabusItem,
  onRemoveSyllabusItem,
}: {
  e: Exam;
  subjects: Subject[];
  items: SyllabusItem[];
  progress: number;
  onProgress: (id: string, v: number) => void;
  onRemove: (id: string) => void;
  onAddSyllabusItem: (examId: string, chapter: string) => Promise<void>;
  onToggleSyllabusItem: (item: SyllabusItem, completed: boolean) => Promise<void>;
  onRemoveSyllabusItem: (item: SyllabusItem) => Promise<void>;
}) {
  const subj = subjects.find((s) => s.id === e.subject_id);
  const [newChapter, setNewChapter] = useState("");
  const days = daysUntil(e.exam_date);
  const urgent = days >= 0 && days <= 7;
  const dObj = safeParseDate(e.exam_date);
  const dateStr = dObj ? dObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : "Invalid Date";
  const completedCount = items.filter((item) => item.completed).length;
  const hasItems = items.length > 0;

  return (
    <div
      className={`glass rounded-2xl p-5 border ${urgent ? "border-destructive/40" : "border-border/40"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {subj && <span className="h-2 w-2 rounded-full" style={{ background: subj.color }} />}
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {subj?.name ?? "General"}
            </span>
          </div>
          <h3 className="font-semibold truncate">{e.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
        <div className="text-right shrink-0">
          <div
            className={`font-mono text-3xl font-bold ${urgent ? "text-destructive" : "text-gradient-primary"}`}
          >
            {days < 0 ? "—" : days}
          </div>
          <div className="text-[9px] font-mono uppercase text-muted-foreground">
            {days === 1 ? "DAY" : "DAYS"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
          <span>SYLLABUS</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-[image:var(--gradient-primary)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        {hasItems && (
          <p className="text-xs text-muted-foreground mt-2">
            {completedCount}/{items.length} chapters completed
          </p>
        )}

        <div className="mt-4 space-y-3">
          {hasItems ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <label className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(ev) => void onToggleSyllabusItem(item, ev.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span
                    className={`truncate ${item.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.chapter}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => void onRemoveSyllabusItem(item)}
                  className="text-sm text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-secondary/50 px-3 py-3 text-xs text-muted-foreground">
              Add chapters to track syllabus progress automatically.
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border/40 flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Add New Chapter to Syllabus</label>
            <div className="flex gap-2">
              <input
                value={newChapter}
                onChange={(e) => setNewChapter(e.target.value)}
                placeholder="Type chapter name here..."
                className="flex-1 bg-background border border-primary/50 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
              <button
                type="button"
                onClick={async () => {
                  await onAddSyllabusItem(e.id, newChapter);
                  setNewChapter("");
                }}
                className="px-4 py-2 rounded-lg bg-[#FF5722] hover:bg-[#F4511E] text-white text-sm font-bold shadow-lg shadow-primary/20 transition whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {e.notes && <p className="text-xs text-muted-foreground mt-3">{e.notes}</p>}
      <div className="flex justify-end mt-3">
        <button
          onClick={() => onRemove(e.id)}
          className="text-muted-foreground hover:text-destructive p-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
