/// <reference types="node" />
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

const envFile = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8");
const envVars: Record<string, string> = {};
envFile.split("\n").forEach((line: string) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) envVars[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabaseUrl = process.env["VITE_SUPABASE_URL"] || envVars["VITE_SUPABASE_URL"];
const supabaseAnonKey = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || envVars["VITE_SUPABASE_PUBLISHABLE_KEY"];

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function registerAndTest(): Promise<void> {
  const timestamp = Date.now();
  const testEmail = `dept.officer.${timestamp}@gmail.com`;
  const testPassword = "DeptPassword@123456";

  console.log("=== STEP 1: REGISTER REAL GOVERNMENT LINE DEPARTMENT USER ===");
  console.log(`Registering email: ${testEmail}`);

  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        display_name: "Executive Engineer S. R. Murthy",
        account_type: "department",
        role: "government_department",
        organization_type: "Government",
        official_category: "Government Department",
        organization_name: "Public Works Department (PWD)",
        department_sector: "Roads & Infrastructure",
        designation: "Executive Engineer (Roads)",
        office_unit: "Visakhapatnam Division",
        jurisdiction: "District-wide",
        district: "Visakhapatnam",
        state: "Andhra Pradesh",
        employee_id: "GOV-DEPT-PWD-2026",
        email_verified: true,
      },
    },
  });

  if (signupError) {
    throw new Error(`Signup error: ${signupError.message}`);
  }

  console.log("✓ Signed up user ID:", signupData.user?.id);
  console.log("✓ Identities length:", signupData.user?.identities?.length);
  console.log("✓ Has session:", !!signupData.session);

  // Return the email and user ID for confirmation
  console.log(JSON.stringify({ testEmail, userId: signupData.user?.id }));
}

registerAndTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
