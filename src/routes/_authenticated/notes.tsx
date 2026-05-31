import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Pin, PinOff, Trash2, Search } from "lucide-react";

import { useAuth } from '@/hooks/use-auth';
const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — Eduvix" }] }),
  component: NotesPage,
});

type Subject = { id: string; name: string; color: string };
type Note = {
  id: string;
  title: string;
  content: string;
  subject_id: string | null;
  pinned: boolean;
  tags: string[] | null;
  updated_at: string;
};

function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const [nRes, subRes] = await Promise.all([
      fetch(`${API_BASE}?action=getNotes`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}?action=getSubjects`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const ns = await nRes.json();
    const subs = await subRes.json();
    setNotes((ns.data?.notes ?? []).sort((a: Note, b: Note) => Number(b.pinned) - Number(a.pinned)) as Note[]);
    setSubjects(subs.data?.subjects ?? []);
    if (!activeId && ns.data?.notes?.length) setActiveId(ns.data.notes[0].id);
  }
  useEffect(() => {
    void load();
  }, [user]);

  const active = notes.find((n) => n.id === activeId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, query]);

  async function newNote() {
    if (!user) return;
    const token = localStorage.getItem("ff_token");
    const res = await fetch(`${API_BASE}?action=addNote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ title: "Untitled", content: "" })
    });
    const data = await res.json();
    if (!data.success) {
      toast.error("Failed");
      return;
    }
    const n = { id: data.data.id, title: "Untitled", content: "", subject_id: null, pinned: false, tags: [], updated_at: new Date().toISOString() };
    setNotes((x) => [n, ...x]);
    setActiveId(n.id);
  }

  function update(patch: Partial<Note>) {
    if (!active) return;
    setNotes((x) =>
      x.map((n) =>
        n.id === active.id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n,
      ),
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const token = localStorage.getItem("ff_token");
      await fetch(`${API_BASE}?action=updateNote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ id: active.id, ...patch })
      });
    }, 400);
  }

  async function togglePin(n: Note) {
    setNotes((x) => x.map((m) => (m.id === n.id ? { ...m, pinned: !m.pinned } : m)));
    const token = localStorage.getItem("ff_token");
    await fetch(`${API_BASE}?action=updateNote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id: n.id, pinned: !n.pinned })
    });
  }

  async function remove(n: Note) {
    if (!confirm("Delete this note?")) return;
    setNotes((x) => x.filter((m) => m.id !== n.id));
    if (activeId === n.id) setActiveId(null);
    const token = localStorage.getItem("ff_token");
    await fetch(`${API_BASE}?action=deleteNote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ id: n.id })
    });
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Notes
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Your second brain.
          </h1>
        </div>
        <button
          onClick={newNote}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium glow-primary"
        >
          <Plus className="h-4 w-4" /> New note
        </button>
      </motion.header>

      <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* List */}
        <aside className="glass rounded-2xl flex flex-col overflow-hidden">
          <div className="relative p-3 border-b border-border/40">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-secondary/40 border border-border/40 rounded-lg pl-7 pr-3 py-1.5 text-xs"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground text-center p-6">No notes yet.</div>
            )}
            {filtered.map((n) => {
              const subj = subjects.find((s) => s.id === n.subject_id);
              const isActive = n.id === activeId;
              return (
                <button
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  className={`w-full text-left rounded-lg p-2.5 text-xs border transition ${
                    isActive
                      ? "bg-primary/10 border-primary/40"
                      : "border-transparent hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                    {subj && (
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: subj.color }}
                      />
                    )}
                    <span className="font-medium text-sm truncate flex-1">
                      {n.title || "Untitled"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                    {n.content || "No content"}
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground/70 mt-1">
                    {new Date(n.updated_at).toLocaleDateString()}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Editor */}
        <section className="glass-strong rounded-2xl flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Select or create a note to get started.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 border-b border-border/40">
                <input
                  value={active.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Title…"
                  className="flex-1 bg-transparent text-lg font-display font-semibold focus:outline-none"
                />
                <select
                  value={active.subject_id ?? ""}
                  onChange={(e) => update({ subject_id: e.target.value || null })}
                  className="bg-secondary/40 border border-border/40 rounded-lg px-2 py-1 text-xs"
                >
                  <option value="">No subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => togglePin(active)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary"
                >
                  {active.pinned ? (
                    <Pin className="h-4 w-4 text-primary" />
                  ) : (
                    <PinOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => remove(active)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                key={active.id}
                value={active.content}
                onChange={(e) => update({ content: e.target.value })}
                placeholder="Start writing… markdown welcome."
                className="flex-1 w-full bg-transparent p-5 text-sm leading-relaxed focus:outline-none resize-none font-mono"
              />
              <div className="px-4 py-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex justify-between">
                <span>
                  {active.content.length} chars ·{" "}
                  {active.content.split(/\s+/).filter(Boolean).length} words
                </span>
                <span>autosaved</span>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
