import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import fs from "node:fs";
import path from "node:path";

function logDebug(message: string) {
  try {
    const logPath = path.resolve(process.cwd(), "coach_debug.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf-8");
  } catch (e) {
    // ignore
  }
}

function getEnvKey(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const index = trimmed.indexOf("=");
        const k = trimmed.substring(0, index).trim();
        const v = trimmed.substring(index + 1).trim();
        if (k === key) {
          return v.replace(/^["']|["']$/g, "");
        }
      }
    }
  } catch (e) {
    logDebug(`Failed to read .env file manually: ${e instanceof Error ? e.message : String(e)}`);
  }
  return undefined;
}

function getUserIdFromToken(request: Request): string | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logDebug("getUserIdFromToken: Missing or invalid Authorization header format");
      return null;
    }
    const token = authHeader.slice("Bearer ".length);
    const parts = token.split(".");
    if (parts.length !== 3) {
      logDebug(`getUserIdFromToken: Token parts count is ${parts.length} (expected 3)`);
      return null;
    }
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    const decoded = JSON.parse(jsonStr);
    
    const uid = decoded.sub || decoded.user_id || null;
    logDebug(`getUserIdFromToken: Decoded UID ${uid} from token`);
    return uid ? String(uid) : null;
  } catch (e) {
    logDebug(`getUserIdFromToken: Exception thrown during decode: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

async function saveCoachMessage(authHeader: string | null, role: "user" | "assistant", content: string) {
  try {
    const baseApi = getEnvKey("VITE_PHP_API_URL") || "http://localhost/focus-forge-os-main/php_backend/api.php";
    const phpApiUrl = `${baseApi}?action=addCoachMessage`;
    logDebug(`Saving coach message (${role}) via PHP API: ${phpApiUrl}...`);
    const res = await fetch(phpApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader || "",
      },
      body: JSON.stringify({ role, content }),
    });
    if (!res.ok) {
      logDebug(`PHP addCoachMessage returned status: ${res.status}`);
    } else {
      const data = await res.json().catch(() => ({}));
      logDebug(`PHP addCoachMessage response: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logDebug(`Failed to call PHP addCoachMessage: ${err instanceof Error ? err.message : String(err)}`);
  }
}
async function getUserDisplayName(authHeader: string | null, fallbackId: string): Promise<string> {
  if (!authHeader) return fallbackId;
  try {
    const baseApi = getEnvKey("VITE_PHP_API_URL") || "http://localhost/focus-forge-os-main/php_backend/api.php";
    const phpApiUrl = `${baseApi}?action=getProfile`;
    const res = await fetch(phpApiUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.success && data?.data?.profile) {
        const p = data.data.profile;
        return p.uid || p.full_name || fallbackId;
      }
    }
  } catch (err) {
    logDebug(`Failed to fetch profile for display name: ${err instanceof Error ? err.message : String(err)}`);
  }
  return fallbackId;
}

const getSystemPrompt = (displayName: string) => `You are Eduvix Coach, a warm but disciplined AI study coach for students.

IMPORTANT: You are speaking to the student: "${displayName}".
You MUST address/call the student by their name (which is: "${displayName}") in your conversation when greeting them or referring to them.

You help with:
- Solving math, physics, chemistry, and other academic problems step-by-step.
- Explaining tough concepts in simple language with relatable analogies.
- Building study plans, exam strategies, and daily routines.
- Motivating students who feel stuck, distracted, or burnt out.

Style:
- Use clean markdown: short paragraphs, bullet points, **bold** key terms, and fenced code/math blocks where helpful.
- Show working for math: give the final answer AND the steps.
- Be encouraging and direct. No fluff. No long disclaimers.`;

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          logDebug("POST /api/coach request started");
          
          const authHeader = request.headers.get("authorization");
          const userId = getUserIdFromToken(request);
          if (!userId) {
            logDebug("Error: Unauthorized (no userId extracted from Authorization header)");
            return new Response("Unauthorized", { status: 401 });
          }
          logDebug(`Authenticated user ID: ${userId}`);

          const body = (await request.json()) as { messages?: UIMessage[] };
          if (!Array.isArray(body.messages)) {
            logDebug("Error: Bad request (messages array is missing or invalid)");
            return new Response("Bad request", { status: 400 });
          }
          logDebug(`Received messages count: ${body.messages.length}`);

          const last = body.messages[body.messages.length - 1];
          const lastText =
            last?.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
          if (last?.role === "user" && lastText) {
            logDebug(`Last user message: ${lastText.slice(0, 100)}...`);
            await saveCoachMessage(authHeader, "user", lastText);
          }

          const apiKey = getEnvKey("GEMINI_API_KEY") || getEnvKey("LOVABLE_API_KEY");
          if (!apiKey) {
            logDebug("Error: Missing API Key (GEMINI_API_KEY and LOVABLE_API_KEY both unresolved)");
            return new Response("Missing GEMINI_API_KEY or LOVABLE_API_KEY", { status: 500 });
          }
          logDebug(`Resolved API Key (starts with ${apiKey.slice(0, 6)}...)`);

          let model;
          if (apiKey.startsWith("AIzaSy")) {
            logDebug("Detected Google Gemini API key. Initializing native Google provider.");
            const googleProvider = createGoogleGenerativeAI({
              apiKey: apiKey,
            });
            model = googleProvider("gemini-2.5-flash");
          } else {
            logDebug("Detected Lovable API key. Initializing Lovable AI Gateway provider.");
            const gateway = createLovableAiGatewayProvider(apiKey);
            model = gateway("google/gemini-3-flash-preview");
          }

          const displayName = await getUserDisplayName(authHeader, userId);
          logDebug(`Using display name: ${displayName}`);

          logDebug("Calling streamText...");
          const result = streamText({
            model,
            system: getSystemPrompt(displayName),
            messages: await convertToModelMessages(body.messages),
            onFinish: async ({ text }) => {
              if (text) {
                logDebug(`Stream finished. Assistant response: ${text.slice(0, 100)}...`);
                try {
                  await saveCoachMessage(authHeader, "assistant", text);
                  logDebug("Saved assistant message to store.");
                } catch (storeErr) {
                  logDebug(`Failed to save assistant message: ${storeErr instanceof Error ? storeErr.message : String(storeErr)}`);
                }
              } else {
                logDebug("Stream finished with empty response text.");
              }
            },
          });

          logDebug("Returning UI message stream response.");
          return result.toUIMessageStreamResponse();
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          const errStack = e instanceof Error ? e.stack : "";
          logDebug(`FATAL ROUTE ERROR: ${errMsg}\nStack: ${errStack}`);
          console.error("[coach] error", e);
          return new Response("Coach error", { status: 500 });
        }
      },
    },
  },
});
