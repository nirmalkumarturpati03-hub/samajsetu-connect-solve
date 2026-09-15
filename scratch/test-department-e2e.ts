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

async function runDepartmentE2ETest(): Promise<void> {
  console.log("=== STEP 1: AUTHENTICATE AS GOVERNMENT DEPARTMENT OFFICIAL ===");
  const testEmail = "dept.officer.1789456576630@gmail.com";
  const testPassword = "DeptPassword@123456";

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError || !loginData?.user) {
    throw new Error(`Login failed: ${loginError?.message ?? "User not found"}`);
  }
  const loggedInUser = loginData.user;
  console.log("✓ Successfully signed in as Line Department official:", loggedInUser.id, loggedInUser.email);

  console.log("\n=== STEP 2: VERIFY DEPARTMENT ROLE & METADATA ===");
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, display_name, district")
    .eq("id", loggedInUser.id)
    .single();

  if (profileError || !userProfile) {
    throw new Error(`Profile query failed: ${profileError?.message ?? "Profile not found"}`);
  }
  console.log("✓ Profile data:", userProfile);
  if (userProfile.role !== "government_department" && userProfile.role !== "government") {
    throw new Error(`Expected role to be government or government_department, got: ${userProfile.role}`);
  }
  console.log("✓ Verified profile role authorizes department access!");

  console.log("\n=== STEP 3: VERIFY ORGANIZATION ACCOUNT IDENTITY ===");
  const { data: orgData, error: orgError } = await supabase
    .from("organization_accounts")
    .select("id, name, organization_type, district, locality, contact_name, expertise, capabilities")
    .eq("owner_id", loggedInUser.id)
    .single();

  if (orgError || !orgData) {
    throw new Error(`Org account query failed: ${orgError?.message ?? "Org not found"}`);
  }
  console.log("✓ Department entity linked:", orgData.name, `(${orgData.district})`);
  console.log("✓ Technical Sectors:", orgData.expertise);

  console.log("\n=== STEP 4: TEST OPERATIONAL WORK ORDER LIFECYCLE (TRACK A) ===");
  // Query existing challenges to link work order
  const { data: challenges, error: challengesError } = await supabase
    .from("challenges")
    .select("id, public_id, title, summary, domain, district, block, locality")
    .limit(5);

  if (challengesError || !challenges || challenges.length === 0) {
    throw new Error("No challenges available to link work order");
  }

  const targetChallenge = challenges[0];
  if (!targetChallenge) throw new Error("Target challenge not found");

  const woNumber = `WO-${Date.now().toString().slice(-6)}`;
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Create Work Order
  const { data: newWorkOrder, error: createWoError } = await supabase
    .from("problem_assignments")
    .insert({
      challenge_id: targetChallenge.id,
      organization_id: orgData.id,
      assigned_by: loggedInUser.id,
      status: "assigned",
      work_order_number: woNumber,
      assigned_team: "Division Pothole & Road Repair Squad",
      contractor_name: "Apex Infrastructure Works Ltd",
      priority: "HIGH",
      sla_deadline: deadline,
      started_at: new Date().toISOString(),
      completion_note: "Cold-mix asphalt patch repair and compaction within 7 days.",
    })
    .select()
    .single();

  if (createWoError || !newWorkOrder) {
    throw new Error(`Failed to create work order: ${createWoError?.message}`);
  }
  console.log(`✓ Created Operational Work Order #${woNumber} (ID: ${newWorkOrder.id})`);

  // Progress Work Order: assigned -> in_progress -> resolved -> verified
  const { error: updateWoError } = await supabase
    .from("problem_assignments")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      completion_note: "Patch repair completed with 50mm compacted asphalt course. Quality inspection passed.",
      completed_by: loggedInUser.id,
    })
    .eq("id", newWorkOrder.id);

  if (updateWoError) {
    throw new Error(`Failed to resolve work order: ${updateWoError.message}`);
  }
  console.log("✓ Operational Work Order progressed to resolved (Evidence submitted)");

  // Verify Work Order closure
  const { error: verifyWoError } = await supabase
    .from("problem_assignments")
    .update({
      status: "verified",
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: loggedInUser.id,
    })
    .eq("id", newWorkOrder.id);

  if (verifyWoError) {
    throw new Error(`Failed to verify work order: ${verifyWoError.message}`);
  }
  console.log("✓ Operational Work Order officially verified & closed by Executive Engineer");

  console.log("\n=== STEP 5: TEST SYSTEMIC ENGINEERING CHALLENGES (TRACK B) ===");
  // Attach Baseline Dataset
  const { data: baselineRecord, error: baselineError } = await supabase
    .from("challenge_baseline_datasets")
    .insert({
      challenge_id: targetChallenge.id,
      title: "Pavement Surface Degradation & Hydraulic Load Test",
      description: "Core drill sample tests and CBR load testing report",
      dataset_type: "lab_report",
      file_path: `${targetChallenge.id}/baseline_cbr_test.pdf`,
      file_name: "baseline_cbr_test.pdf",
      file_size: 1048576,
      mime_type: "application/pdf",
      uploaded_by: loggedInUser.id,
    })
    .select()
    .single();

  if (baselineError || !baselineRecord) {
    throw new Error(`Baseline dataset insertion failed: ${baselineError?.message}`);
  }
  console.log("✓ Attached technical baseline dataset record:", baselineRecord.title);

  // Execute define_government_scope RPC
  const { error: scopeError } = await supabase.rpc("define_government_scope", {
    challenge_uuid: targetChallenge.id,
    dept: orgData.name,
    scope_text: "High-durability permeable polymer-modified bitumen road surface",
    outcome_text: "Zero pothole recurrence over 3 monsoons with 120 kN axle load endurance",
    constraints_text: "Budget FY 2026-27, non-disruption of peak commuter traffic",
    gov_data: "State Highway Survey Sheet #88",
    reg_req: "IRC:37-2018 Guidelines for Design of Flexible Pavements",
    safety_req: "Reflective hazard retro-signage during construction",
    pilot_req: "200-meter test strip deployment in high-waterlogging zone",
    eval_crit: "Rut depth < 3mm after 500,000 equivalent standard axles",
    needed_support: ["State Highways & PWD", "Academic Materials Research Lab"],
  });

  if (scopeError) {
    throw new Error(`define_government_scope RPC failed: ${scopeError.message}`);
  }
  console.log("✓ Successfully executed define_government_scope RPC");

  // Publish Academic Challenge
  const { error: publishError } = await supabase
    .from("challenges")
    .update({
      academic_title: "Development of Self-Draining Polymer-Modified Asphalt for Heavy Rainfall Zones",
      academic_published_at: new Date().toISOString(),
      current_trl: 3,
      target_trl: 7,
      stage: "matched",
      engineering_requirements: [
        { requirement: "CBR Value", type: "Mechanical", target: "≥ 10%", mandatory: true, validationMethod: "ASTM D1883" },
        { requirement: "Marshall Stability", type: "Structural", target: "≥ 12 kN", mandatory: true, validationMethod: "AASHTO T245" },
      ],
    })
    .eq("id", targetChallenge.id);

  if (publishError) {
    throw new Error(`Publishing academic challenge failed: ${publishError.message}`);
  }
  console.log("✓ Successfully formulated and published Academic Challenge with TRL 3 -> 7");

  console.log("\n=== STEP 6: TEST UNIVERSITY PILOT REVIEW, MENTOR ASSIGNMENT & VALIDATION ===");
  // Create or query pilot
  const { data: pilots, error: pilotsError } = await supabase
    .from("pilots")
    .select("id, project_id, status")
    .limit(1);

  if (pilotsError) {
    throw new Error(`Pilots query failed: ${pilotsError.message}`);
  }

  let testPilotId: string;
  if (!pilots || pilots.length === 0) {
    // Check if project exists
    const { data: existingProjects } = await supabase.from("projects").select("id").limit(1);
    let projId = existingProjects?.[0]?.id;
    if (!projId) {
      const { data: newProj, error: projErr } = await supabase
        .from("projects")
        .insert({
          title: "Polymer Asphalt Test Strip",
          objective: "Validate high-durability polymer asphalt under heavy monsoon load",
          challenge_id: targetChallenge.id,
          created_by: loggedInUser.id,
          status: "active",
          health_score: 90,
        })
        .select()
        .single();
      if (projErr || !newProj) {
        throw new Error(`Failed to create test project: ${projErr?.message}`);
      }
      projId = newProj.id;
    }

    const { data: newPilot, error: newPilotError } = await supabase
      .from("pilots")
      .insert({
        project_id: projId,
        location_text: "Sector 4 Main Road Junction",
        baseline: "Rut depth: 15mm / monsoon",
        target: "Rut depth: < 3mm",
        observed_result: "Rut depth: 1.8mm after 3 months",
        status: "approved",
      })
      .select()
      .single();

    if (newPilotError || !newPilot) throw new Error(`Could not create test pilot: ${newPilotError?.message ?? "empty"}`);
    testPilotId = newPilot.id;
    console.log("✓ Created test pilot for validation");
  } else {
    testPilotId = pilots[0]?.id || "";
  }

  // Assign Technical Mentor
  const { error: mentorError } = await supabase
    .from("pilots")
    .update({
      mentor_name: "Executive Engineer S. R. Murthy",
      mentor_designation: "Executive Engineer (Roads)",
      mentor_id: loggedInUser.id,
    })
    .eq("id", testPilotId);

  if (mentorError) {
    throw new Error(`Mentor assignment failed: ${mentorError.message}`);
  }
  console.log("✓ Successfully assigned Department Technical Mentor to pilot");

  // Technical Benchmark Validation Decision
  const { error: validationError } = await supabase
    .from("pilots")
    .update({
      technical_validation_status: "validated",
      validation_notes: "Surface wear testing confirms rutting under 2.0mm. Benchmark criteria satisfied.",
      validated_at: new Date().toISOString(),
      validated_by: loggedInUser.id,
      scaling_stage: "procurement_readiness",
    })
    .eq("id", testPilotId);

  if (validationError) {
    throw new Error(`Technical validation update failed: ${validationError.message}`);
  }
  console.log("✓ Successfully executed Technical Benchmark Validation decision (VALIDATED)");

  // Prepare Procurement Handoff
  const { error: handoffError } = await supabase
    .from("pilots")
    .update({
      scaling_stage: "procurement_handoff",
      handoff_notes: "Specifications approved for inclusion in State Highway Schedule of Rates (SoR) and GeM Category.",
      handoff_prepared_at: new Date().toISOString(),
      handoff_prepared_by: loggedInUser.id,
    })
    .eq("id", testPilotId);

  if (handoffError) {
    throw new Error(`Procurement handoff failed: ${handoffError.message}`);
  }
  console.log("✓ Successfully prepared Procurement & Government Adoption Handoff");

  console.log("\n=======================================================================");
  console.log(">>> ALL GOVERNMENT LINE DEPARTMENT E2E INTEGRATION TESTS PASSED! <<<");
  console.log("=======================================================================");
}

runDepartmentE2ETest().catch((err: unknown) => {
  console.error("Fatal error:", err);
  throw err;
});
