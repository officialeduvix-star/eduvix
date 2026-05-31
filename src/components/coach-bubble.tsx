import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Loader2, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_PHP_API_URL || "http://localhost/focus-forge-os-main/php_backend/api.php";

export function CoachBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history once
  useEffect(() => {
    if (!user || initial) return;
    (async () => {
      try {
        const token = localStorage.getItem("ff_token");
        const res = await fetch(`${API_BASE}?action=getCoachMessages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        const json = await res.json();
        const msgs: UIMessage[] = (json.success && json.data?.messages ? json.data.messages : []).map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text", text: m.content }],
        }));
        setInitial(msgs);
      } catch (err) {
        console.error("Failed to load coach messages", err);
        setInitial([]);
      }
    })();
  }, [user, initial]);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/coach",
      fetch: async (url, init) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("ff_token") : null;
        const headers = new Headers(init?.headers);
        if (token) headers.set("authorization", `Bearer ${token}`);
        return fetch(url, { ...init, headers });
      },
    }),
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    messages: initial ?? [],
    transport: transport.current,
  });

  // hydrate after load
  useEffect(() => {
    if (initial && messages.length === 0 && initial.length > 0) {
      setMessages(initial);
    }
  }, [initial, messages.length, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const busy = status === "submitted" || status === "streaming";

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  async function clearHistory() {
    if (!user) return;
    if (!confirm("Clear coach conversation?")) return;
    try {
      const token = localStorage.getItem("ff_token");
      await fetch(`${API_BASE}?action=deleteCoachMessages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      setMessages([]);
      toast.success("History cleared successfully!");
    } catch (err) {
      toast.error("Failed to clear conversation history.");
    }
  }

  if (!user) return null;

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-50 group"
        aria-label="Open AI Coach"
      >
        <span className="absolute inset-0 rounded-full bg-(image:--gradient-primary) blur-xl opacity-70 group-hover:opacity-100 animate-pulse" />
        <span className="relative grid place-items-center h-14 w-14 rounded-full bg-(image:--gradient-primary) text-primary-foreground shadow-2xl border border-primary/40">
          {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 240 }}
            className="fixed bottom-[90px] md:bottom-24 right-4 md:right-5 z-50 w-[calc(100vw-2rem)] sm:w-100 h-[70vh] max-h-160 glass-strong rounded-2xl border border-primary/30 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-linear-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/40 blur-md" />
                  <div className="relative h-8 w-8 rounded-full bg-(image:--gradient-primary) grid place-items-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-semibold text-sm leading-tight">
                    Forge Coach
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    {busy ? "thinking…" : "online"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearHistory}
                  title="Clear conversation"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 px-2">
                  <div className="inline-grid place-items-center h-12 w-12 rounded-2xl bg-primary/15 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Hey, I'm your study coach.</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Ask me anything — math, concepts, exam prep, or motivation.
                  </p>
                  <div className="grid gap-1.5 text-left">
                    {[
                      "Solve: ∫ x·sin(x) dx",
                      "Explain Newton's third law simply",
                      "Help me plan tomorrow's study day",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                        className="text-xs glass rounded-lg px-3 py-2 text-left hover:border-primary/40 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2 text-sm whitespace-pre-wrap wrap-break-word">
                        {text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex gap-2 items-start">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-primary/15 grid place-items-center mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="max-w-[85%] text-sm prose-coach">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {text || "…"}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })}

              {status === "submitted" && (
                <div className="flex gap-2 items-center text-muted-foreground text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}
            </div>

            <form
              onSubmit={submit}
              className="border-t border-border/50 p-3 flex items-end gap-2 bg-background/40"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                rows={1}
                placeholder="Ask anything…"
                className="flex-1 resize-none bg-secondary/40 border border-border/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 max-h-32"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-9 w-9 grid place-items-center rounded-xl bg-(image:--gradient-primary) text-primary-foreground disabled:opacity-40 glow-primary"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
