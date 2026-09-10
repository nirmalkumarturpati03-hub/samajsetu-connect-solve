import { createServerFn } from "@tanstack/react-start";

/**
 * Issues a short-lived, single-use token for the browser's realtime Scribe
 * connection. The ElevenLabs API key stays exclusively on the server.
 */
export const createElevenLabsScribeToken = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Voice transcription is not configured. Add ELEVENLABS_API_KEY to the server environment.");
  }

  const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
  });
  const body = await response.json().catch(() => null) as { token?: string; detail?: string; message?: string } | null;

  if (!response.ok || !body?.token) {
    throw new Error(body?.detail || body?.message || "ElevenLabs could not create a voice transcription session.");
  }

  return { token: body.token };
});
