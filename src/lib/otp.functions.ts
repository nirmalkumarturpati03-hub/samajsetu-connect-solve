import { createServerFn } from "@tanstack/react-start";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-safe environment variable resolver with fallback to .env.local
 */
function getServerEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...rest] = trimmed.split("=");
        if (k?.trim() === key) {
          const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
          process.env[key] = val;
          return val;
        }
      }
    }
  } catch {
    // Ignore in non-filesystem environments
  }
  return undefined;
}

// Helper for server-side Supabase client
function getSupabaseClient() {
  const url = getServerEnv("VITE_SUPABASE_URL") || getServerEnv("SUPABASE_URL");
  const key = getServerEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getServerEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    throw new Error("Supabase is not configured on the server environment.");
  }
  return createClient(url, key);
}

export interface RequestOtpInput {
  email: string;
  name?: string;
  purpose?: string;
}

export interface RequestOtpResponse {
  success: boolean;
  requestId: string;
  cooldownSeconds: number;
  expiresAt: string;
  message: string;
}

export interface VerifyOtpInput {
  email: string;
  requestId: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

/**
 * Mask email for safe user display (e.g. j***e@example.com)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Server Function: Request Registration Verification OTP
 * 
 * 1. Validates email format.
 * 2. Generates cryptographically secure 6-digit numeric OTP.
 * 3. Hashes OTP with a random 16-byte salt via SHA-256.
 * 4. Stores hash, salt, and strictly 60-second expiration in Supabase.
 * 5. Dispatches request to n8n webhook with Bearer secret.
 * 6. Returns minimal response without plaintext OTP.
 */
export const requestRegistrationOtp = createServerFn({ method: "POST" })
  .validator((data: RequestOtpInput) => {
    if (!data || typeof data.email !== "string") {
      throw new Error("A valid email address is required.");
    }
    const email = data.email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format.");
    }
    return {
      email,
      name: typeof data.name === "string" ? data.name.trim() : "Civic Official",
      purpose: data.purpose || "registration_verification",
    };
  })
  .handler(async ({ data }): Promise<RequestOtpResponse> => {
    const supabase = getSupabaseClient();
    const { email, name, purpose } = data;

    // Generate cryptographically secure 6-digit OTP (100000 - 999999)
    const rawOtp = crypto.randomInt(100000, 1000000).toString();

    // Generate unique random salt (16 bytes)
    const salt = crypto.randomBytes(16).toString("hex");

    // Compute salted SHA-256 hash
    const otpHash = crypto
      .createHash("sha256")
      .update(rawOtp + salt)
      .digest("hex");

    // Strictly 60-second validity (1 minute)
    const now = Date.now();
    const expiresAt = new Date(now + 60 * 1000);
    const requestId = `req_${now}_${crypto.randomBytes(4).toString("hex")}`;

    // Store in Supabase via SECURITY DEFINER procedure
    const { data: dbResult, error: dbError } = await supabase.rpc("save_verification_otp", {
      p_email: email,
      p_request_id: requestId,
      p_otp_hash: otpHash,
      p_salt: salt,
      p_expires_at: expiresAt.toISOString(),
      p_purpose: purpose,
    });

    if (dbError) {
      console.error("Database save_verification_otp error:", dbError);
      throw new Error("Failed to initialize verification request. Please try again.");
    }

    if (dbResult && dbResult.success === false) {
      throw new Error(dbResult.message || "Failed to process OTP request.");
    }

    // Call n8n Cloud Webhook (Server-Side Only)
    const n8nWebhookUrl =
      getServerEnv("N8N_OTP_WEBHOOK_URL") ||
      "https://samajsetu.app.n8n.cloud/webhook/civicaura-otp-verification";
    const n8nSecret = getServerEnv("N8N_WEBHOOK_SECRET");

    let n8nDeliverySuccess = false;

    if (!n8nSecret) {
      console.error("[Samaj Setu OTP Service] Server configuration missing: N8N_WEBHOOK_SECRET is not set in .env.local.");
      try {
        await supabase.rpc("invalidate_verification_otp", { p_request_id: requestId });
      } catch (invalErr) {
        console.error("Failed to invalidate un-delivered OTP:", invalErr);
      }
      throw new Error("Unable to send verification email: N8N_WEBHOOK_SECRET is missing in .env.local.");
    }

    let n8nErrorDetail = "";

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${n8nSecret}`,
        },
        body: JSON.stringify({
          email,
          otp: rawOtp,
          expires_at: expiresAt.toISOString(),
          request_id: requestId,
        }),
        signal: AbortSignal.timeout(8000), // 8-second network timeout
      });

      if (response.ok) {
        const respData = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;
        if (respData && respData.success === true) {
          n8nDeliverySuccess = true;
        } else {
          n8nErrorDetail = respData?.error || "unverified n8n response";
          console.error("[Samaj Setu OTP Service] n8n returned unverified response status:", n8nErrorDetail);
        }
      } else {
        if (response.status === 401) {
          n8nErrorDetail = "n8n Cloud rejected the request (HTTP 401 Unauthorized). The N8N_WEBHOOK_SECRET in .env.local does not match n8n Cloud.";
        } else {
          n8nErrorDetail = `n8n Cloud returned HTTP ${response.status} ${response.statusText}`;
        }
        console.error(`[Samaj Setu OTP Service] ${n8nErrorDetail}`);
      }
    } catch (webhookErr: any) {
      const isTimeout = webhookErr?.name === "TimeoutError" || webhookErr?.name === "AbortError";
      n8nErrorDetail = isTimeout
        ? "Connection to n8n Cloud timed out after 8 seconds."
        : `Network error connecting to n8n Cloud: ${webhookErr?.message || "unreachable"}`;
      console.error(`[Samaj Setu OTP Service] ${n8nErrorDetail}`);
      n8nDeliverySuccess = false;
    }

    // Data Consistency: Invalidate OTP if email delivery could not be confirmed
    if (!n8nDeliverySuccess) {
      try {
        await supabase.rpc("invalidate_verification_otp", { p_request_id: requestId });
      } catch (invalErr) {
        console.error("Failed to invalidate un-delivered OTP:", invalErr);
      }
      throw new Error(
        n8nErrorDetail
          ? `Email delivery failed: ${n8nErrorDetail}`
          : "Unable to send the verification email right now. Please try again."
      );
    }

    return {
      success: true,
      requestId,
      cooldownSeconds: 60,
      expiresAt: expiresAt.toISOString(),
      message: `Verification code sent to ${maskEmail(email)}. Valid for 60 seconds.`,
    };
  });

/**
 * Server Function: Verify Registration OTP
 * 
 * 1. Checks that the record exists and is within 60 seconds validity.
 * 2. Fetches the cryptographic salt.
 * 3. Computes SHA-256(submitted_otp + salt).
 * 4. Calls Supabase verify_and_consume_otp procedure to atomically check & consume.
 */
export const verifyRegistrationOtp = createServerFn({ method: "POST" })
  .validator((data: VerifyOtpInput) => {
    if (!data || typeof data.email !== "string" || typeof data.otp !== "string" || typeof data.requestId !== "string") {
      throw new Error("Missing required verification parameters.");
    }
    const email = data.email.trim().toLowerCase();
    const otp = data.otp.trim();
    const requestId = data.requestId.trim();

    if (!/^\d{6}$/.test(otp)) {
      throw new Error("Verification code must be exactly 6 numeric digits.");
    }
    return { email, otp, requestId };
  })
  .handler(async ({ data }): Promise<VerifyOtpResponse> => {
    const supabase = getSupabaseClient();
    const { email, otp, requestId } = data;

    // Retrieve salt for this active request
    const { data: salt, error: saltError } = await supabase.rpc("get_otp_salt", {
      p_email: email,
      p_request_id: requestId,
    });

    if (saltError || !salt) {
      throw new Error("This verification code has expired (60 seconds) or is invalid. Please request a new OTP.");
    }

    // Hash submitted OTP with stored salt
    const candidateHash = crypto
      .createHash("sha256")
      .update(otp + salt)
      .digest("hex");

    // Atomically verify & consume in database
    const { data: result, error: verifyError } = await supabase.rpc("verify_and_consume_otp", {
      p_email: email,
      p_request_id: requestId,
      p_otp_hash: candidateHash,
    });

    if (verifyError) {
      console.error("Database verify_and_consume_otp error:", verifyError);
      throw new Error("Verification failed due to a database error. Please retry.");
    }

    if (!result || !result.success) {
      const attemptsRemaining = result?.attempts_remaining;
      const attemptsMsg = typeof attemptsRemaining === "number" ? ` (${attemptsRemaining} attempt(s) remaining)` : "";
      throw new Error((result?.message || "Invalid verification code.") + attemptsMsg);
    }

    return {
      success: true,
      message: "Email address verified successfully.",
    };
  });
