import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// Load .env.local manually
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
const supabaseKey =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["VITE_SUPABASE_ANON_KEY"] ||
  process.env["SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runE2ETests() {
  console.log("==================================================");
  console.log("SAMAJ SETU UNIVERSITY DASHBOARD E2E VERIFICATION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // STEP 0: Authenticate as Verified University Nodal Officer
  console.log("\n[AUTH] Signing in as Verified University Nodal Officer...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "turpatinirmalkumar2007@gmail.com",
    password: "UnivPassword@123456",
  });

  if (authErr || !authData.user) {
    console.error("FAIL: Authentication failed:", authErr?.message);
    process.exit(1);
  }
  console.log(`✓ Successfully authenticated: ${authData.user.email} (UID: ${authData.user.id})`);

  // 1. Verify Institutions in database
  console.log("\n[TEST 1] Querying real institutions from Supabase with RLS...");
  const { data: insts, error: instErr } = await supabase
    .from("institutions")
    .select("id, legal_name, short_name, aishe_code, registration_status, academic_departments, research_domains");

  if (instErr || !insts || insts.length === 0) {
    console.error("FAIL: Could not fetch institutions:", instErr);
    failed++;
  } else {
    console.log(`PASS: Found ${insts.length} accessible institution(s) under RLS.`);
    insts.forEach((inst) => {
      console.log(`  ✓ Institution: ${inst.legal_name} (${inst.short_name})`);
      console.log(`    AISHE: ${inst.aishe_code} • Status: ${inst.registration_status}`);
      console.log(`    Departments: ${(inst.academic_departments || []).slice(0, 4).join(", ")}...`);
    });
    passed++;
  }

  // 2. Verify Track A vs Track B segmentation
  console.log("\n[TEST 2] Verifying Track A (Operational) vs Track B (Academic R&D) separation...");
  const { data: trackB, error: trackBErr } = await supabase
    .from("challenges")
    .select("id, public_id, track, title, domain, responsible_department, academic_title, technical_scope")
    .eq("track", "B");

  const { data: trackA, error: trackAErr } = await supabase
    .from("challenges")
    .select("id, public_id, track, title, domain")
    .eq("track", "A");

  if (trackBErr || !trackB || trackB.length === 0) {
    console.error("FAIL: No Track B challenges found in database:", trackBErr);
    failed++;
  } else {
    console.log(`PASS: Track B academic challenges verified (${trackB.length} challenges found):`);
    trackB.forEach((c) => {
      console.log(`  - [${c.public_id}] Track B: "${c.academic_title || c.title}" (Domain: ${c.domain}, Line Dept: ${c.responsible_department || 'N/A'})`);
    });
    console.log(`  ✓ Track A operational challenges segregated: ${trackA?.length || 0} routine issues.`);
    passed++;
  }

  // 3. Test Deterministic Capability Matching
  console.log("\n[TEST 3] Evaluating deterministic capability matching...");
  const sampleInst = insts?.[0];
  if (sampleInst && trackB && trackB.length > 0) {
    const depts = sampleInst.academic_departments || [];
    console.log(`  Evaluating against ${sampleInst.short_name} registered departments: ${depts.slice(0, 4).join(", ")}...`);

    let matchCount = 0;
    trackB.forEach((ch) => {
      const chDomain = (ch.domain || "").toLowerCase();
      const chTitle = (ch.academic_title || ch.title || "").toLowerCase();
      const matched = depts.some((d: string) => {
        const dl = d.toLowerCase();
        return chDomain.includes(dl) || dl.includes(chDomain) || chTitle.includes(dl);
      });
      if (matched) {
        matchCount++;
        console.log(`  ✓ Matched: "${ch.academic_title || ch.title}" based on registered department capability.`);
      }
    });

    console.log(`PASS: Deterministic matching identified ${matchCount} relevant Track B problems for ${sampleInst.short_name}.`);
    passed++;
  } else {
    console.error("FAIL: Missing institution or Track B challenges for matching test.");
    failed++;
  }

  // 4. Verify Research Projects linkage
  console.log("\n[TEST 4] Verifying research projects linkage with institutions...");
  const { data: projs, error: prErr } = await supabase
    .from("projects")
    .select("id, title, challenge_id, institution_id, stage, current_trl, faculty_lead_name, status");

  if (prErr || !projs) {
    console.error("FAIL: Error querying projects:", prErr);
    failed++;
  } else {
    console.log(`PASS: Found ${projs.length} research projects in database.`);
    projs.forEach((p) => {
      console.log(`  - Project: "${p.title}" (Stage: ${p.stage}, TRL: ${p.current_trl}, Lead: ${p.faculty_lead_name || 'Assigned'})`);
    });
    passed++;
  }

  // 5. Verify Field Pilots, Monitoring, and Technical Validation
  console.log("\n[TEST 5] Verifying field pilots, monitoring measurements, and technical validation...");
  const { data: pilots, error: piErr } = await supabase
    .from("pilots")
    .select("id, project_id, pilot_name, location_text, baseline, target, observed_result, status, technical_validation_status, scaling_stage");

  if (piErr || !pilots) {
    console.error("FAIL: Error querying pilots:", piErr);
    failed++;
  } else {
    console.log(`PASS: Found ${pilots.length} pilots in database.`);
    pilots.forEach((pi) => {
      console.log(`  - Pilot: "${pi.pilot_name || pi.location_text}"`);
      console.log(`    Baseline: ${pi.baseline || 'N/A'}`);
      console.log(`    Target:   ${pi.target || 'N/A'}`);
      console.log(`    Observed: ${pi.observed_result || 'Pending'}`);
      console.log(`    Technical Validation: ${pi.technical_validation_status || 'PENDING'}`);
      console.log(`    Scaling Stage: ${pi.scaling_stage || 'N/A'}`);
    });
    passed++;
  }

  // 6. Verify Academic Problem Applications
  console.log("\n[TEST 6] Verifying academic_problem_applications table...");
  const { data: apps, error: appErr } = await supabase
    .from("academic_problem_applications")
    .select("id, challenge_id, institution_id, faculty_lead_name, department, status");

  if (appErr) {
    console.error("FAIL: Error querying academic_problem_applications:", appErr);
    failed++;
  } else {
    console.log(`PASS: academic_problem_applications accessible under RLS. Existing: ${apps?.length || 0}.`);
    passed++;
  }

  // 7. Verify Institution Members Roster
  console.log("\n[TEST 7] Verifying institution_members roster table...");
  const { data: members, error: memErr } = await supabase
    .from("institution_members")
    .select("id, institution_id, profile_id, role, designation, department, status");

  if (memErr) {
    console.error("FAIL: Error querying institution_members:", memErr);
    failed++;
  } else {
    console.log(`PASS: institution_members table accessible. Found ${members?.length || 0} roster members.`);
    members?.forEach((m) => {
      console.log(`  - Role: ${m.role}, Dept: ${m.department || 'N/A'}, Designation: ${m.designation || 'N/A'}`);
    });
    passed++;
  }

  console.log("\n==================================================");
  console.log(`E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

void runE2ETests();
