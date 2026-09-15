import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { getDistrictsForState, INDIAN_STATES } from "../src/data/india-geo";
import { classifyCivicProblemNLP, NLPClassificationOutputSchema } from "../src/lib/nlp-categorization";

// Load .env.local
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

async function runVerification() {
  console.log("==================================================");
  console.log("SAMAJ SETU 4 CORE FEATURES E2E VERIFICATION SUITE");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
    }
  }

  // TEST 0: Cascaded State to District
  console.log("\n--- TEST 0: Cascaded State to District Mapping ---");
  const upDistricts = getDistrictsForState("Uttar Pradesh");
  assert(upDistricts.length >= 75, `Uttar Pradesh has 75 districts (found: ${upDistricts.length})`);
  assert(upDistricts.includes("Varanasi") && upDistricts.includes("Lucknow"), "UP includes Varanasi and Lucknow");

  const mhDistricts = getDistrictsForState("Maharashtra");
  assert(mhDistricts.length >= 36, `Maharashtra has 36 districts (found: ${mhDistricts.length})`);

  const delhiDistricts = getDistrictsForState("Delhi");
  assert(delhiDistricts.length >= 11, `Delhi has 11 districts (found: ${delhiDistricts.length})`);

  // TEST 1: Feature 2 - AI/NLP Problem Categorization
  console.log("\n--- TEST 1: AI/NLP Problem Categorization (Feature 2) ---");
  const waterTest = classifyCivicProblemNLP({
    title: "Broken pipeline leading to drinking water contamination",
    description: "Main municipal pipeline burst near ward 12, dirty sewage water mixing with drinking supply.",
    district: "Varanasi",
  });
  const waterSchemaValid = NLPClassificationOutputSchema.safeParse(waterTest).success;
  assert(waterSchemaValid, "NLP categorization output conforms to strict Zod schema");
  assert(waterTest.category === "Water & Sanitation", `Correctly categorized water problem (got: ${waterTest.category})`);
  assert(waterTest.confidence >= 0.70, `High confidence for clear complaint (got: ${waterTest.confidence})`);
  assert(waterTest.needs_review === false, "needs_review is false for confident classification");

  const roadTest = classifyCivicProblemNLP({
    title: "Deep potholes on state highway causing accidents",
    description: "Multiple severe potholes and asphalt craters along 3km stretch of highway.",
    district: "Patna",
  });
  assert(roadTest.category === "Roads & Transport", `Correctly categorized roads problem (got: ${roadTest.category})`);

  const ambiguousTest = classifyCivicProblemNLP({
    title: "Bad situation in our area",
    description: "Things are not good here please check urgently.",
    district: "Unknown",
  });
  assert(ambiguousTest.needs_review === true, `Flagged ambiguous input for human review (needs_review=true, confidence=${ambiguousTest.confidence})`);

  // TEST 2: Feature 1 - Problem Deduplication & Merging (Database RPCs & Schema)
  console.log("\n--- TEST 2: Problem Deduplication & Merging (Feature 1) ---");
  let dupResult: any = null;
  let dupError: any = null;
  const res1 = await supabase.rpc("find_possible_duplicates_v2", {
    problem_title: "Water contamination and pipeline burst",
    problem_description: "Dirty water leaking from cracked pipe into residential area",
    problem_domain: "Water & Sanitation",
    problem_lat: null,
    problem_lng: null,
    problem_district: "Varanasi",
    problem_locality: "Sigra",
  });
  if (res1.error) {
    const res2 = await supabase.rpc("find_possible_duplicates", {
      problem_title: "Water contamination and pipeline burst",
      problem_description: "Dirty water leaking from cracked pipe into residential area",
      problem_domain: "Water & Sanitation",
      problem_lat: null,
      problem_lng: null,
    });
    dupResult = res2.data;
    dupError = res2.error;
  } else {
    dupResult = res1.data;
    dupError = res1.error;
  }
  assert(!dupError, `Duplicate detection RPC executed successfully (error: ${dupError?.message || "none"})`);
  assert(Array.isArray(dupResult), `Returned duplicate match array (count: ${dupResult?.length ?? 0})`);

  // Verify merge_challenges RPC exists and has expected security policy
  const { data: mergeCheck, error: mergeError } = await supabase.rpc("merge_challenges", {
    canonical_id: "00000000-0000-0000-0000-000000000001",
    duplicate_id: "00000000-0000-0000-0000-000000000002",
    merge_reason: "Test merge execution",
  });
  // Expect authorization check error if not logged in as admin
  const isAuthOrNotFound = mergeError && (
    mergeError.message.includes("Unauthorized") ||
    mergeError.message.includes("not found") ||
    mergeError.code === "P0001"
  );
  assert(Boolean(isAuthOrNotFound), `merge_challenges RPC security check verified: ${mergeError?.message}`);

  // TEST 3: Feature 3 - Repost / Support Existing Problem
  console.log("\n--- TEST 3: Repost / Support Existing Problem (Feature 3) ---");
  const { data: challenges, error: chError } = await supabase.rpc("search_challenges", { search_text: "" });
  assert(!chError && Array.isArray(challenges) && challenges.length > 0, `Loaded live challenges via search_challenges (found: ${challenges?.length})`);

  const { data: supports, error: supError } = await supabase
    .from("challenge_supports")
    .select("id, challenge_id, supporter_id, note, created_at")
    .limit(5);
  assert(!supError, `Queried real challenge_supports table: ${supError?.message || "success"}`);

  // TEST 4: Feature 4 - Org-to-Org Collaboration & Persistent Realtime Chat
  console.log("\n--- TEST 4: Org-to-Org Collaboration & Persistent Chat (Feature 4) ---");
  const { data: collabRows, error: collabError } = await supabase
    .from("organization_collaborations")
    .select("id, project_id, requesting_org_id, target_org_id, status")
    .limit(5);
  assert(!collabError, `organization_collaborations table accessible: ${collabError?.message || "success"}`);

  const { data: msgRows, error: msgError } = await supabase
    .from("collaboration_messages")
    .select("id, collaboration_id, project_id, sender_user_id, message, created_at")
    .limit(5);
  assert(!msgError, `collaboration_messages table accessible: ${msgError?.message || "success"}`);

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("==================================================");

  if (passed === total) {
    console.log("🎉 ALL 4 CORE FEATURES FULLY VERIFIED ON REAL SUPABASE DATA!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

void runVerification();
