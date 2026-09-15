import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const { data: challenges, error: chErr } = await supabase
    .from("challenges")
    .select("id, public_id, title, summary, domain, district, locality, block, merged_into_id, duplicate_status, report_count, priority_score, stage");
  console.log("CHALLENGES COUNT:", challenges?.length, "ERROR:", chErr?.message);
  console.log(JSON.stringify(challenges, null, 2));

  // Check if any duplicate matches exist between existing challenges
  if (challenges && challenges.length > 0) {
    for (const c of challenges) {
      const { data: dupes } = await supabase.rpc("find_possible_duplicates", {
        problem_title: c.title,
        problem_description: c.summary || c.title,
        problem_domain: c.domain,
        problem_lat: null,
        problem_lng: null,
      });
      const filtered = (dupes || []).filter((d: any) => d.challenge_id !== c.id);
      if (filtered.length > 0) {
        console.log(`FOUND DUPLICATE MATCH FOR: ${c.public_id} - "${c.title}"`);
        console.log("MATCHES:", JSON.stringify(filtered, null, 2));
      }
    }
  }

  // Check admin reports view
  const { data: adminData } = await supabase.rpc("admin_problem_review");
  console.log("ADMIN ITEMS COUNT:", adminData?.length);
  if (adminData) {
    console.log("ADMIN ITEMS:", JSON.stringify(adminData.map((a: any) => ({
      challenge_id: a.challenge_id,
      public_id: a.public_id,
      title: a.title,
      district: a.district,
      domain: a.domain
    })), null, 2));
  }
}

void check();
