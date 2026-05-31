import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Edit3,
  GraduationCap,
  Moon,
  Plus,
  Sun,
  Trash2,
  User,
  Target,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { settingsService } from "@/lib/settings-service";

import maleAvatarPng from "@/assets/male avtar.png";
import femaleAvatarWebp from "@/assets/female avtar.webp";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Eduvix" }] }),
  component: SettingsPage,
});

type Subject = {
  id: string;
  name: string;
  color: string;
  attendance_target?: number;
};

type ThemePreference = "dark" | "light";

type Gender = "male" | "female" | "";

type ProfileFields = {
  full_name?: string;
  avatar_url?: string;
  gender?: Gender;
  theme_preference?: ThemePreference;
  attendance_target?: number;
  study_start?: string;
  study_end?: string;
  goals?: string;
  target_exam_title?: string;
};

const COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#eab308",
];

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function normalizeTime(v: string, fallback: string) {
  const s = (v ?? "").trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  return fallback;
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}

function GenderButton({
  active,
  label,
  avatarSrc,
  onClick,
}: {
  active: boolean;
  label: string;
  avatarSrc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex items-center gap-3 px-4 py-3 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground glow-primary text-sm font-semibold border border-primary/30"
          : "flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/40 border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
      }
    >
      <img src={avatarSrc} alt={label} className="h-7 w-7 rounded-full object-cover" />
      {label}
    </button>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const attendanceTarget = Number(profile.attendance_target ?? 75);

  const [theme, setTheme] = useState<ThemePreference>(
    (profile.theme_preference ?? "dark") as ThemePreference,
  );

  const avatarUrl = (profile.avatar_url ?? "").trim();
  const avatarByGender = profile.gender === "female" ? femaleAvatarWebp : maleAvatarPng;
  const effectiveAvatar = avatarUrl || avatarByGender;

  const fullNameInitial = useMemo(() => {
    const name = (profile.full_name ?? "").trim();
    if (name) return (name[0] ?? "?").toUpperCase();
    return (user?.email?.[0] ?? "?").toUpperCase();
  }, [profile.full_name, user?.email]);

  // subjects add
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(COLORS[0]);

  // subjects edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState(COLORS[0]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setBusy(true);
      try {
        const [pRes, sRes] = await Promise.all([settingsService.getProfile(), settingsService.getSubjects()]);

        if (pRes.error) throw new Error(pRes.error);
        if (sRes.error) throw new Error(sRes.error);

        setProfile((pRes.data ?? {}) as ProfileFields);
        setTheme(((pRes.data as any)?.theme_preference ?? "dark") as ThemePreference);
        setSubjects(sRes.data);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        setBusy(false);
      }
    })();
  }, [user]);

  async function saveProfile() {
    if (!user) return;

    const parsed = Number(profile.attendance_target ?? 75);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Attendance target must be between 0 and 100");
      return;
    }

    const payload: ProfileFields = {
      ...profile,
      attendance_target: parsed,
      study_start: normalizeTime(profile.study_start ?? "06:00", "06:00"),
      study_end: normalizeTime(profile.study_end ?? "22:00", "22:00"),
      goals: profile.goals ?? "",
      target_exam_title: (profile.target_exam_title ?? "").trim(),
      avatar_url: avatarUrl || undefined,
      gender: profile.gender ?? "",
      theme_preference: theme,
    };

    setBusy(true);
    try {
      const res = await settingsService.updateProfile(payload);
      if (res.error) throw new Error(res.error);
      toast.success("Profile saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  async function setThemeAndPersist(next: ThemePreference) {
    if (!user) return;
    setTheme(next);

    setBusy(true);
    try {
      const res = await settingsService.updateProfile({ theme_preference: next });
      if (res.error) throw new Error(res.error);
      toast.success(`Theme set to ${next}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save theme");
    } finally {
      setBusy(false);
    }
  }

  async function addSubject() {
    if (!user) return;

    const name = newSubjectName.trim();
    if (!name) return;

    setBusy(true);
    try {
      const res = await settingsService.addSubject({
        name,
        color: newSubjectColor,
        attendance_target: attendanceTarget,
      });
      if (res.error) throw new Error(res.error);

      const sRes = await settingsService.getSubjects();
      if (sRes.error) throw new Error(sRes.error);
      setSubjects(sRes.data);

      setNewSubjectName("");
      setNewSubjectColor(COLORS[(subjects.length + 1) % COLORS.length]);
      toast.success("Subject added");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add subject");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(s: Subject) {
    setEditingId(s.id);
    setEditingName(s.name);
    setEditingColor(s.color);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
    setEditingColor(COLORS[0]);
  }

  async function saveSubjectEdit() {
    if (!user || !editingId) return;

    const name = editingName.trim();
    if (!name) {
      toast.error("Subject name required");
      return;
    }

    setBusy(true);
    try {
      const res = await settingsService.updateSubject(editingId, {
        name,
        color: editingColor,
        attendance_target: attendanceTarget,
      });
      if (res.error) throw new Error(res.error);

      const sRes = await settingsService.getSubjects();
      if (sRes.error) throw new Error(sRes.error);
      setSubjects(sRes.data);

      cancelEdit();
      toast.success("Subject updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update subject");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubject(id: string) {
    if (!user) return;

    setBusy(true);
    try {
      const res = await settingsService.deleteSubject(id);
      if (res.error) throw new Error(res.error);

      const sRes = await settingsService.getSubjects();
      if (sRes.error) throw new Error(sRes.error);
      setSubjects(sRes.data);

      if (editingId === id) cancelEdit();
      toast.success("Subject deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete subject");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" /> Settings
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">
          Your profile & study system
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update your name, gender avatar, attendance target, exam target, study timings,
          subjects, and theme.
        </p>
      </motion.header>

      <div className="glass rounded-2xl p-5 border border-border/40 mb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Theme
            </div>
            <p className="text-xs text-muted-foreground mt-1">Toggle dark/light (saved to Firestore).</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void setThemeAndPersist("dark")}
              disabled={busy}
              className={
                theme === "dark"
                  ? "px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground glow-primary text-sm font-semibold"
                  : "px-4 py-2 rounded-lg bg-secondary/40 border border-border text-sm text-muted-foreground hover:text-foreground transition"
              }
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => void setThemeAndPersist("light")}
              disabled={busy}
              className={
                theme === "light"
                  ? "px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground glow-primary text-sm font-semibold"
                  : "px-4 py-2 rounded-lg bg-secondary/40 border border-border text-sm text-muted-foreground hover:text-foreground transition"
              }
            >
              Light
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile */}
        <div className="glass rounded-2xl p-5 border border-border/40">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" /> Profile
              </div>
              <p className="text-xs text-muted-foreground mt-1">Update your name, gender avatar, targets, and goals.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-primary font-bold overflow-hidden">
              {effectiveAvatar ? (
                <img src={effectiveAvatar} alt="avatar" className="h-12 w-12 object-cover" />
              ) : (
                <span>{fullNameInitial}</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Display name</label>
              <input
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Aditi Sharma"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-2">Avatar gender</label>
            <div className="grid grid-cols-2 gap-2">
              <GenderButton
                active={profile.gender !== "female"}
                label="Male"
                avatarSrc={maleAvatarPng}
                onClick={() => setProfile((p) => ({ ...p, gender: "male" }))}
              />
              <GenderButton
                active={profile.gender === "female"}
                label="Female"
                avatarSrc={femaleAvatarWebp}
                onClick={() => setProfile((p) => ({ ...p, gender: "female" }))}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">Avatar URL (optional)</label>
            <input
              value={profile.avatar_url ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, avatar_url: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="https://..."
            />
            <p className="text-[11px] text-muted-foreground mt-1">If empty, we use the selected gender avatar.</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Field
              icon={<Target className="h-4 w-4" />}
              label="Attendance target (%)"
              value={String(profile.attendance_target ?? 75)}
              onChange={(v) => setProfile((p) => ({ ...p, attendance_target: Number(v) }))}
              placeholder="75"
            />
            <Field
              icon={<Clock className="h-4 w-4" />}
              label="Study start"
              value={profile.study_start ?? "06:00"}
              onChange={(v) => setProfile((p) => ({ ...p, study_start: v }))}
              type="time"
            />
            <Field
              icon={<Clock className="h-4 w-4" />}
              label="Study end"
              value={profile.study_end ?? "22:00"}
              onChange={(v) => setProfile((p) => ({ ...p, study_end: v }))}
              type="time"
            />
            <Field
              icon={<GraduationCap className="h-4 w-4" />}
              label="Target exam"
              value={profile.target_exam_title ?? ""}
              onChange={(v) => setProfile((p) => ({ ...p, target_exam_title: v }))}
              placeholder="e.g. JEE Main 2026"
            />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Goals</label>
              <textarea
                value={profile.goals ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, goals: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={4}
                placeholder="e.g. Score 95% in finals..."
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground glow-primary text-sm font-semibold disabled:opacity-50 transition"
              >
                {busy ? <span>Saving…</span> : <CheckCircle2 className="h-4 w-4" />}
                Save profile
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-secondary/40 border border-border text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Subjects */}
        <div className="glass rounded-2xl p-5 border border-border/40">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Subjects
              </div>
              <p className="text-xs text-muted-foreground mt-1">Add, edit, and delete subjects.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Subject name</label>
              <input
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Mathematics"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addSubject();
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Color</label>
              <select
                value={newSubjectColor}
                onChange={(e) => setNewSubjectColor(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mb-5">
            <button
              type="button"
              onClick={() => void addSubject()}
              disabled={busy || !newSubjectName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground glow-primary text-sm font-semibold disabled:opacity-50 transition"
            >
              <Plus className="h-4 w-4" /> Add subject
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-sm text-muted-foreground">No subjects yet.</div>
          ) : (
            <div className="space-y-2">
              {subjects.map((s) => {
                const isEditing = editingId === s.id;
                return (
                  <div key={s.id} className="rounded-xl bg-secondary/30 border border-border/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        {!isEditing ? (
                          <span className="truncate">{s.name}</span>
                        ) : (
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <select
                              value={editingColor}
                              onChange={(e) => setEditingColor(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                              {COLORS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            disabled={busy}
                            className="p-2 rounded-lg hover:bg-secondary/50 transition text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void saveSubjectEdit()}
                              disabled={busy}
                              className="px-3 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground glow-primary text-sm font-semibold disabled:opacity-50 transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={busy}
                              className="px-3 py-2 rounded-lg bg-secondary/40 border border-border text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => void deleteSubject(s.id)}
                          disabled={busy}
                          className="p-2 rounded-lg hover:bg-destructive/15 transition text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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

