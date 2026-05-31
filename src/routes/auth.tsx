import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  UserRound,
  IdCard,
  User,
  GraduationCap,
  Smile,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Eduvix" }] }),
  component: AuthPage,
});

const API_BASE = "http://localhost/focus-forge-os-main/php_backend/auth.php";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

  const isSignup = mode === "signup";

  // Single email input used for both OTP + signup/login
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpInputs, setOtpInputs] = useState<string[]>(Array(6).fill(""));
  const [emailVerified, setEmailVerified] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [uid, setUid] = useState("");
  const [className, setClassName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  // Backend expects an email; use the same email field for OTP + account.

  // Email OTP

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [busy, setBusy] = useState(false);

  const [uidAvailable, setUidAvailable] = useState<boolean | null>(null);
  const [checkingUid, setCheckingUid] = useState(false);

  useEffect(() => {
    if (!uid) {
      setUidAvailable(null);
      return;
    }
    const isValidFormat = /^[a-zA-Z0-9_\-\.\@]+$/.test(uid);
    if (!isValidFormat) {
      setUidAvailable(false);
      return;
    }
    
    setCheckingUid(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}?action=check_uid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid }),
        });
        const data = await res.json();
        setUidAvailable(data.success);
      } catch (err) {
        setUidAvailable(false);
      } finally {
        setCheckingUid(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [uid]);

  useEffect(() => {
    if (!loading && user) {
      if (user.onboarded) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/onboarding" });
      }
    }
  }, [user, loading, navigate]);

  const otpEmail = (email).trim();

  const handleOtpChange = (val: string, index: number) => {
    const newVal = val.replace(/[^0-9]/g, "");
    const newInputs = [...otpInputs];
    newInputs[index] = newVal;
    setOtpInputs(newInputs);

    // Auto-focus next box
    if (newVal && index < 5) {
      const nextInput = document.querySelector(`input[data-otp-index='${index + 1}']`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
      const prevInput = document.querySelector(`input[data-otp-index='${index - 1}']`) as HTMLInputElement;
      prevInput?.focus();
      // Also clear the prev input's value
      const newInputs = [...otpInputs];
      newInputs[index - 1] = "";
      setOtpInputs(newInputs);
    }
  };


  // single source of truth for OTP verification: Exam Email (or fallback Email)


  const handleSendOtp = async () => {
    if (!otpEmail) {
      toast.error("Enter a valid email for OTP");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}?action=send_email_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setOtpSent(true);
      toast.success(data.message); // Dev mode shows OTP
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpEmail.length === 0) {
      toast.error("Enter an email first");
      return;
    }
    if (otpInputs.some(v => v === "")) {
      toast.error("Enter the 6-digit OTP");
      return;
    }



    setBusy(true);
      try {
        const combinedOtp = otpInputs.join("");
        const res = await fetch(`${API_BASE}?action=verify_email_otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: otpEmail, otp: combinedOtp.trim() }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        setEmailVerified(true);
        toast.success("Email verified successfully!");
        // Sync otp state for other uses
        setOtp(combinedOtp);
      } catch (err: any) {
        toast.error(err.message || "OTP verification failed");
      } finally {
        setBusy(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!emailVerified) {
          toast.error("Please verify your email first");
          setBusy(false);
          return;
        }

        if (!otpSent || otpInputs.some(v => v === "")) {
          toast.error("Please verify the 6-digit OTP");
          setBusy(false);
          return;
        }

        if (!uidAvailable) {
          toast.error("Please enter a valid and available UID");
          setBusy(false);
          return;
        }

        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setBusy(false);
          return;
        }

        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) throw new Error("First name and last name are required");

        const res = await fetch(`${API_BASE}?action=register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            class: className,
            gender,
            email: email,
            exam_email: email,
            phone: email,
            password,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        signIn(data.data.user, data.data.token);
        localStorage.setItem("ff_just_registered", "1");
        localStorage.setItem("ff_show_pricing", "1");
        toast.success("Account created! Let's set up your profile.");
        navigate({ to: "/onboarding" });
      } else if (mode === "signin") {
        const res = await fetch(`${API_BASE}?action=login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        signIn(data.data.user, data.data.token);
        localStorage.setItem("ff_show_pricing", "1");
        toast.success("Welcome back.");
        if (data.data.user.onboarded) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/onboarding" });
        }
      } else if (mode === "forgot") {
        // Enforce password policy: min 8 chars, at least one number and one special character
        const pwd = password;
        const pwdRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
        if (!pwdRegex.test(pwd)) {
          toast.error("Password must be at least 8 characters and include a number and a special character.");
          setBusy(false);
          return;
        }
        const res = await fetch(`${API_BASE}?action=reset_password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, new_password: pwd }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast.success("Password reset successful. Please sign in.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background bg-hero flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-(image:--gradient-primary) grid place-items-center glow-primary">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">Eduvix</span>
        </Link>

        <div className="glass-strong rounded-2xl p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin"
              ? "Sign in to keep forging."
              : mode === "signup"
              ? "Start building disciplined habits today."
              : "Enter your email to reset your password."}
          </p>

          <div className="space-y-3 mt-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-3">
                  <Field
                    icon={<UserRound className="h-4 w-4" />}
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={setFirstName}
                    required
                  />
                  <Field
                    icon={<User className="h-4 w-4" />}
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={setLastName}
                    required
                  />

                  <Field
                    icon={<IdCard className="h-4 w-4" />}
                    type="text"
                    placeholder="UID"
                    value={uid}
                    onChange={setUid}
                    required
                    suffixIcon={
                      uid ? (
                        checkingUid ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : uidAvailable ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )
                      ) : null
                    }
                  />

                  <SelectField
                    icon={<GraduationCap className="h-4 w-4" />}
                    value={className}
                    onChange={setClassName}
                    options={[
                      { value: "", label: "Select Class" },
                      { value: "1", label: "1st" },
                      { value: "2", label: "2nd" },
                      { value: "3", label: "3rd" },
                      { value: "4", label: "4th" },
                      { value: "5", label: "5th" },
                      { value: "6", label: "6th" },
                      { value: "7", label: "7th" },
                      { value: "8", label: "8th" },
                      { value: "9", label: "9th" },
                      { value: "10", label: "10th" },
                      { value: "11", label: "11th" },
                      { value: "12", label: "12th" },
                    ]}
                    required
                  />

                  <SelectField
                    icon={<Smile className="h-4 w-4" />}
                    value={gender}
                    onChange={(v) =>
                      setGender(v as "male" | "female" | "")
                    }
                    options={[
                      { value: "", label: "Select Gender" },
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ]}
                    required
                  />


                </div>

              )}

              {/* Email & OTP verification flow for signup and forgot */}
              {(mode === "signup" || mode === "forgot") ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Field
                      icon={<Mail className="h-4 w-4" />}
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={setEmail}
                      required
                      disabled={emailVerified}
                    />
                    {!emailVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={busy || !email}
                        className="rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary text-primary-foreground px-4 text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center min-w-[90px]"
                      >
                        {busy && !otpSent ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : otpSent ? (
                          "Resend OTP"
                        ) : (
                          "Verify"
                        )}
                      </button>
                    )}
                  </div>

                  {otpSent && !emailVerified && (
                    <div className="space-y-2 mt-2 p-3 border border-border/40 rounded-xl bg-secondary/5 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-xs text-muted-foreground font-medium text-center">
                        Enter the 6-digit code sent to your email
                      </p>
                      <div className="flex gap-2 items-center justify-between">
                        <div className="flex gap-2 justify-center mx-auto">
                          {otpInputs.map((val, i) => (
                            <input
                              key={i}
                              type="text"
                              maxLength={1}
                              data-otp-index={i}
                              pattern="[0-9]*"
                              inputMode="numeric"
                              className="w-10 h-10 text-center text-lg font-bold border border-border/60 rounded-xl bg-surface-elevated/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                              value={val}
                              onChange={(e) => handleOtpChange(e.target.value, i)}
                              onKeyDown={(e) => handleOtpKeyDown(e, i)}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={busy || otpInputs.some((v) => v === "")}
                          className="rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary text-primary-foreground px-4 h-10 text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify OTP"}
                        </button>
                      </div>
                    </div>
                  )}

                  {emailVerified && (
                    <div className="mt-2 p-3 border border-green-500/20 bg-green-500/5 rounded-xl flex items-center gap-2 text-green-500 text-xs font-semibold animate-in zoom-in-95 duration-200">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Email verified successfully! You can now proceed.</span>
                    </div>
                  )}
                </div>
              ) : (
                <Field
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={setEmail}
                  required
                />
              )}

              {/* Show password field only after email is verified for forgot mode */}
              {/* Password field for signin */}
              {(mode === "signup" || (mode === "forgot" && emailVerified)) && (
                  <>
                    <div className="relative">
                      <Field
                        icon={<Lock className="h-4 w-4" />}
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={setPassword}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Field
                      icon={<Lock className="h-4 w-4" />}
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      required
                      minLength={8}
                    />
                  </>
                )}
              {mode === "signin" && (
                <Field
                  icon={<Lock className="h-4 w-4" />}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={8}
                />
              )}

              <button
                type="submit"
                disabled={busy || ((mode === "signin" && false) || (mode === "signup" && !emailVerified) || (mode === "forgot" && !emailVerified))}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-(image:--gradient-primary) px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary hover:scale-[1.02] transition disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setEmailVerified(false);
                  setOtpSent(false);
                  setOtp("");
                  setOtpInputs(Array(6).fill(""));
                  setBusy(false);
                }}
                className="text-primary font-medium hover:underline"
              >
                {mode === "signin" ? "Create account" : "Sign in"}
              </button>
              {/* Forgot password link */}
              {mode === "signin" && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setEmailVerified(false);
                      setOtpSent(false);
                      setOtp("");
                      setOtpInputs(Array(6).fill(""));
                      setBusy(false);
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
  minLength,
  disabled,
  suffixIcon,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
  suffixIcon?: React.ReactNode;
}) {
  return (
    <div className="relative flex-1">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        disabled={disabled}
        className={`w-full pl-10 ${suffixIcon ? "pr-10" : "pr-3"} py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition disabled:opacity-50`}
      />
      {suffixIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {suffixIcon}
        </div>
      )}
    </div>
  );
}

function SelectField({
  icon,
  value,
  onChange,
  options,
  required,
  disabled,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="relative flex-1">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface-elevated/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition disabled:opacity-50 appearance-none text-foreground"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-background text-foreground">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

