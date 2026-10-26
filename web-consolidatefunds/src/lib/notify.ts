import type { PreparedAttachment, SkippedFile } from "./attachments";
import type { Application } from "./types";

/** Fire the submission email (with document attachments) through the Vercel serverless function. */
export async function sendApplicationEmail(
  app: Application,
  attachments: PreparedAttachment[] = [],
  skipped: SkippedFile[] = [],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/submit-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application: app, attachments, skipped }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error || `Email service returned ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the email service" };
  }
}
