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

async function runE2ETest(): Promise<void> {
  console.log("=== STEP 1: AUTHENTICATE AS PRI USER ===");
  const testEmail = "pri.officer.1789451434978@gmail.com";
  const testPassword = "TestPassword@123456";

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError || !loginData?.user) {
    throw new Error(`Login failed: ${loginError?.message ?? "User not found"}`);
  }
  const loggedInUser = loginData.user;
  console.log("✓ Successfully signed in as PRI user:", loggedInUser.id, loggedInUser.email);

  console.log("\n=== STEP 2: VERIFY PROFILE ROLE & METADATA ===");
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, display_name, district")
    .eq("id", loggedInUser.id)
    .single();

  if (profileError || !userProfile) {
    throw new Error(`Profile query failed: ${profileError?.message ?? "Profile not found"}`);
  }
  console.log("✓ Profile data:", userProfile);
  if (userProfile.role !== "pri") {
    throw new Error(`Expected role to be 'pri', got: ${userProfile.role}`);
  }
  console.log("✓ Verified profile.role === 'pri'!");

  console.log("\n=== STEP 3: VERIFY ORGANIZATION ACCOUNT IDENTITY ===");
  const { data: orgData, error: orgError } = await supabase
    .from("organization_accounts")
    .select("id, name, organization_type, district, locality, contact_name, expertise, capabilities")
    .eq("owner_id", loggedInUser.id)
    .single();

  if (orgError || !orgData) {
    throw new Error(`Org account query failed: ${orgError?.message ?? "Org not found"}`);
  }
  console.log("✓ Organization account linked:", orgData);

  console.log("\n=== STEP 4: VERIFY PRI RLS ACCESS (CHALLENGES, REPORTS, PILOTS) ===");
  // Query challenges using PRIDashboard fields
  const { data: challenges, error: challengesError } = await supabase
    .from("challenges")
    .select("id, public_id, title, summary, domain, district, block, locality, priority_score, priority_level, verification, stage, created_at")
    .limit(5);

  if (challengesError || !challenges) {
    throw new Error(`Challenges query failed under PRI role: ${challengesError?.message ?? "Unknown error"}`);
  }
  console.log(`✓ PRI successfully queried challenges (${challenges.length} records returned)`);

  // Query reports using PRIDashboard fields
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("id, challenge_id, description, district, block, locality, created_at, category")
    .limit(5);

  if (reportsError || !reports) {
    throw new Error(`Reports query failed under PRI role: ${reportsError?.message ?? "Unknown error"}`);
  }
  console.log(`✓ PRI successfully queried reports (${reports.length} records returned)`);

  // Query pilots using PRIDashboard fields
  const { data: pilots, error: pilotsError } = await supabase
    .from("pilots")
    .select("id, project_id, location_text, status")
    .limit(5);

  if (pilotsError || !pilots) {
    throw new Error(`Pilots query failed under PRI role: ${pilotsError?.message ?? "Unknown error"}`);
  }
  console.log(`✓ PRI successfully queried pilots (${pilots.length} records returned)`);

  console.log("\n=== STEP 5: VERIFY STORED PROCEDURES (define_government_scope) ===");
  if (challenges.length > 0) {
    const targetChallenge = challenges[0];
    if (!targetChallenge) throw new Error("Target challenge not found");
    console.log(`Testing define_government_scope on challenge: ${targetChallenge.id} (${targetChallenge.title})`);
    const { error: scopeError } = await supabase.rpc("define_government_scope", {
      challenge_uuid: targetChallenge.id,
      dept: "Thagarapuvalasa Gram Panchayat Office",
      scope_text: "Restoration of village drainage culvert and clearing obstruction",
      outcome_text: "Unobstructed storm water flow across village main street",
      constraints_text: "Gram Panchayat budget FY 2026-27, completion within 15 days",
      gov_data: "Survey sheet No. 42 / Thagarapuvalasa Village",
      reg_req: "AP Panchayat Raj Act 1994 compliance",
      safety_req: "Temporary pedestrian barricades during excavation",
      pilot_req: "Pre-cast concrete culvert sections",
      eval_crit: "Zero water stagnation during heavy rainfall test",
      needed_support: ["Panchayat Raj Institution", "Field Volunteers", "GPDP Convergence"],
    });

    if (scopeError) {
      throw new Error(`RPC define_government_scope failed: ${scopeError.message}`);
    }
    console.log("✓ Successfully executed define_government_scope RPC as PRI user!");

    console.log("\n=== STEP 6: VERIFY STORED PROCEDURES (review_challenge) ===");
    const { error: reviewError } = await supabase.rpc("review_challenge", {
      challenge_uuid: targetChallenge.id,
      next_status: "officially_verified",
      review_method: "Panchayat On-Site Inspection",
      review_note: "Ground verification confirmed by Panchayat Secretary K. Varma.",
    });

    if (reviewError) {
      throw new Error(`RPC review_challenge failed: ${reviewError.message}`);
    }
    console.log("✓ Successfully executed review_challenge RPC as PRI user!");
  }

  console.log("\n=======================================================");
  console.log(">>> ALL PRI E2E VERIFICATIONS PASSED SUCCESSFULLY! <<<");
  console.log("=======================================================");
}

runE2ETest().catch((err: unknown) => {
  console.error("Fatal error:", err);
  throw err;
});
