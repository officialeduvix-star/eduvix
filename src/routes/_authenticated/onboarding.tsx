import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Target,
  Clock,
  BookOpen,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Eduvix" }] }),
  component: Onboarding,
});

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

type Subject = { name: string; color: string };

function Onboarding() {
  const { user, signIn, signOut } = useAuth();
  // Firebase user uid (auth.ts elsewhere maps it to `user.uid`)
  const uid = user?.uid;
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubj, setNewSubj] = useState("");
  const [goals, setGoals] = useState("");
  const [target, setTarget] = useState(75);
  const [studyStart, setStudyStart] = useState("06:00");
  const [studyEnd, setStudyEnd] = useState("22:00");
  const [targetExamTitle, setTargetExamTitle] = useState("");


  const addSubject = () => {
    const name = newSubj.trim();
    if (!name) return;
    setSubjects((s) => [...s, { name, color: COLORS[s.length % COLORS.length] }]);
    setNewSubj("");
  };

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    if (!user || !uid) return;

    setBusy(true);
    try {
      const token = localStorage.getItem("ff_token");

      if (subjects.length) {
        await Promise.all(
          subjects.map((s) => fetch(`${API_BASE}?action=addSubject`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
              name: s.name,
              color: s.color,
              attendance_target: target,
            })
          }))
        );
      }

      const examTitle = targetExamTitle.trim();

      const pRes = await fetch(`${API_BASE}?action=updateProfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          attendance_target: target,
          study_start: studyStart,
          study_end: studyEnd,
          goals,
          target_exam_title: examTitle,
          onboarded: true,
        })
      });
      const pData = await pRes.json();
      if (!pData.success) throw new Error(pData.message);

      // Update the user session state
      if (user && token) {
        signIn({ ...user, onboarded: true }, token);
      }

      // Clear registration flag so onboarding won't show on future logins
      localStorage.removeItem("ff_just_registered");

      toast.success("All set! Welcome to your dashboard.");
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { icon: BookOpen, title: "Your subjects", sub: "Add the subjects you study this term." },
    { icon: Target, title: "Your goals", sub: "What are you working towards?" },
    {
      icon: ClipboardIcon,
      title: "Target exam",
      sub: "What exam are you preparing for?",
    },
    {
      icon: ClipboardIcon,
      title: "Attendance target",
      sub: "Set your minimum attendance percentage.",
    },
    { icon: Clock, title: "Study timings", sub: "When does your typical study day run?" },
  ];


  const canNext =
    (step === 0 && subjects.length > 0) ||
    step === 1 ||
    (step === 2 && targetExamTitle.trim().length > 0) ||
    step === 3 ||
    step === 4;



  return (
    <div className="min-h-screen bg-background bg-hero relative">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center glow-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Eduvix</span>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Sign out
          </button>
        </div>

        {/* progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors
              ${i <= step ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-strong rounded-2xl p-8 shadow-elevated"
        >
          <div className="flex items-center gap-3 mb-1">
            {(() => {
              const Ic = steps[step].icon;
              return <Ic className="h-5 w-5 text-primary" />;
            })()}
            <span className="font-mono text-xs text-muted-foreground">
              STEP {step + 1} / {steps.length}
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">{steps[step].title}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{steps[step].sub}</p>

          <div className="mt-8">
            {step === 0 && (
              <div>
                <div className="flex gap-2">
                  <input
                    value={newSubj}
                    onChange={(e) => setNewSubj(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
                    placeholder="e.g. Mathematics"
                    className="flex-1 px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={addSubject}
                    className="px-4 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground glow-primary hover:scale-105 transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {subjects.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-sm"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                      <button
                        onClick={() => setSubjects((arr) => arr.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  {subjects.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add at least one subject to continue.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Score 95% in finals, finish DSA syllabus, 4h focused study daily..."
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            )}


            {step === 2 && (
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Target exam title</label>
                <input
                  value={targetExamTitle}
                  onChange={(e) => setTargetExamTitle(e.target.value)}
                  placeholder="e.g. JEE Main 2026"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This will help generate a focused study plan.
                </p>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-5xl font-bold text-gradient-primary">
                    {target}%
                  </span>
                  <span className="text-xs text-muted-foreground">Min. attendance</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="w-full accent-[oklch(0.74_0.2_50)]"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-2 gap-4">
                <TimeField label="Day starts" value={studyStart} onChange={setStudyStart} />
                <TimeField label="Day ends" value={studyEnd} onChange={setStudyEnd} />
              </div>
            )}

          </div>

          <div className="mt-10 flex justify-between">
            <button
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={next}
                disabled={!canNext}
                className="flex items-center gap-1.5 rounded-lg bg-[image:var(--gradient-primary)] px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary hover:scale-105 disabled:opacity-50 transition"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-[image:var(--gradient-primary)] px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary hover:scale-105 disabled:opacity-50 transition"
              >
                {busy ? (
                  "Saving…"
                ) : (
                  <>
                    Finish <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full px-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}

function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
