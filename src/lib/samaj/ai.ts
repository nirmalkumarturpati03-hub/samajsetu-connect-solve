/**
 * AI Problem Doctor — deterministic on-device analysis engine (demo/mock service
 * behind a clean interface). In production this call is replaced by an LLM +
 * multilingual embedding pipeline; the returned shape stays identical.
 *
 * Every field produced here is AI-GENERATED and REQUIRES VERIFICATION.
 */
import {
  challenges,
  DOMAIN_CODE,
  DOMAINS,
  EXPERTISE,
  type Challenge,
  type Domain,
  type ProblemDNA,
  type ScoreFactor,
  type Severity,
} from "./data";

export type AnalysisInput = {
  text: string;
  district: string;
  block?: string;
  village?: string;
  media?: string[];
};

export type DuplicateMatch = {
  challenge: Challenge;
  similarity: number;
  reasons: string[];
};

export type Analysis = {
  challengeId: string;
  title: string;
  dna: ProblemDNA;
  factors: ScoreFactor[];
  score: number;
  duplicates: DuplicateMatch[];
  rootCauses: string[];
  solutionDirections: { idea: string; kind: "AI suggestion" | "Verified source"; note: string }[];
};

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  Water: ["water", "handpump", "hand pump", "borewell", "well", "tap", "pipeline", "pani", "drinking"],
  Education: ["school", "teacher", "class", "student", "study", "dropout", "learning"],
  Healthcare: ["health", "hospital", "clinic", "doctor", "medicine", "anaemia", "ambulance", "sub-centre"],
  Agriculture: ["crop", "farm", "yield", "soil", "irrigation", "seed", "pest", "harvest", "paddy"],
  Sanitation: ["toilet", "drain", "sewage", "garbage", "waste", "sanitation", "waterlogging"],
  Environment: ["pollution", "dust", "forest", "mine", "river", "air", "pond", "tree"],
  "Rural Livelihoods": ["income", "job", "employment", "shg", "migration", "market", "weaver", "livelihood"],
  Accessibility: ["disability", "wheelchair", "ramp", "blind", "hearing", "accessible"],
  "Urban Infrastructure": ["road", "street light", "streetlight", "bus", "footpath", "colony", "ward"],
  "Public Services": ["certificate", "ration", "scheme", "office", "network", "connectivity", "pension"],
};

const SUBDOMAIN_HINT: Record<Domain, string> = {
  Water: "Rural drinking water",
  Education: "School infrastructure",
  Healthcare: "Primary care access",
  Agriculture: "Crop yield",
  Sanitation: "Toilet functionality",
  Environment: "Air quality",
  "Rural Livelihoods": "Market linkage",
  Accessibility: "Mobility access",
  "Urban Infrastructure": "Street lighting",
  "Public Services": "Scheme delivery",
};

const EXPERTISE_HINT: Record<Domain, string[]> = {
  Water: ["Civil Engineering", "Mechanical Engineering", "Water Resources", "IoT", "Community Development"],
  Education: ["Education Technology", "Social Science", "Design", "Computer Science"],
  Healthcare: ["Public Health", "Data Science", "Community Development", "Electrical Engineering"],
  Agriculture: ["Agronomy", "Data Science", "Environmental Science", "IoT"],
  Sanitation: ["Civil Engineering", "Environmental Science", "Community Development"],
  Environment: ["Environmental Science", "Data Science", "Materials Science"],
  "Rural Livelihoods": ["Social Science", "Design", "Data Science"],
  Accessibility: ["Design", "Civil Engineering", "Social Science"],
  "Urban Infrastructure": ["Civil Engineering", "Electrical Engineering", "Data Science"],
  "Public Services": ["Computer Science", "Social Science", "Data Science"],
};

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

function classifyDomain(text: string): { domain: Domain; confidence: number } {
  const t = text.toLowerCase();
  let best: Domain = "Public Services";
  let bestHits = 0;
  for (const d of DOMAINS) {
    const hits = DOMAIN_KEYWORDS[d].filter((k) => t.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = d;
    }
  }
  return { domain: best, confidence: bestHits === 0 ? 0.52 : Math.min(0.96, 0.68 + bestHits * 0.08) };
}

function severityFrom(text: string): { severity: Severity; urgency: Severity } {
  const t = text.toLowerCase();
  const strong = ["not work", "broken", "no water", "closed", "failed", "months", "year", "unsafe", "danger"];
  const hits = strong.filter((k) => t.includes(k)).length;
  const scale: Severity[] = ["Moderate", "High", "High", "Critical"];
  return {
    severity: scale[Math.min(3, hits)]!,
    urgency: scale[Math.min(3, hits + (t.includes("children") || t.includes("school") ? 1 : 0))]!,
  };
}

function durationFrom(text: string) {
  const m = text.match(/(\d+)\s*(day|week|month|year)/i);
  if (m) return `${m[1]} ${m[2]!.toLowerCase()}${Number(m[1]) > 1 ? "s" : ""}`;
  if (/months/i.test(text)) return "Several months";
  return "Not stated — verification required";
}

function affectedFrom(text: string, fallback: number) {
  const m = text.match(/(\d{2,5})\s*\+?\s*(people|persons|families|households|villagers|students|children)/i);
  if (m) return Number(m[1]) * (/famil|household/i.test(m[2]!) ? 5 : 1);
  return fallback;
}

/* -------------------------- lightweight vector search ------------------------- */
function vectorize(text: string) {
  const map = new Map<string, number>();
  for (const w of tokenize(text)) map.set(w, (map.get(w) ?? 0) + 1);
  return map;
}
function cosine(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0;
  for (const [k, v] of a) dot += v * (b.get(k) ?? 0);
  const na = Math.sqrt([...a.values()].reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt([...b.values()].reduce((s, v) => s + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}

export function findDuplicates(input: AnalysisInput, domain: Domain): DuplicateMatch[] {
  const qv = vectorize(input.text + " " + (input.village ?? "") + " " + input.district);
  return challenges
    .map((c) => {
      const corpus = [c.title, c.summary, c.dna.subdomain, ...c.reports.slice(0, 4).map((r) => r.text)].join(" ");
      const semantic = cosine(qv, vectorize(corpus));
      const geo = c.district === input.district ? 1 : 0;
      const cat = c.domain === domain ? 1 : 0;
      const village = input.village && c.village.toLowerCase() === input.village.toLowerCase() ? 1 : 0;
      const similarity = Math.min(
        0.98,
        semantic * 0.5 + geo * 0.2 + cat * 0.2 + village * 0.1 + (semantic > 0.1 ? 0.05 : 0),
      );
      const reasons = [
        semantic > 0.08 ? `Semantic similarity ${(semantic * 100).toFixed(0)}% on problem description` : null,
        geo ? `Same district (${c.district})` : null,
        village ? `Same habitation (${c.village})` : null,
        cat ? `Same domain (${c.domain})` : null,
        `Reported within the current monitoring window`,
      ].filter(Boolean) as string[];
      return { challenge: c, similarity, reasons };
    })
    .filter((m) => m.similarity > 0.45)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

export function buildFactors(dna: ProblemDNA, reports: number): ScoreFactor[] {
  return [
    {
      label: "Population affected",
      points: Math.min(20, 6 + Math.round(dna.affected / 40)),
      note: `${dna.affected.toLocaleString("en-IN")} people in the reported catchment`,
    },
    {
      label: "Severity of impact",
      points: { Low: 6, Moderate: 11, High: 16, Critical: 20 }[dna.severity],
      note: `${dna.severity} severity classified from the citizen description`,
    },
    {
      label: "Urgency",
      points: { Low: 4, Moderate: 8, High: 13, Critical: 16 }[dna.urgency],
      note: `${dna.urgency} urgency — reported duration ${dna.duration}`,
    },
    {
      label: "Vulnerable groups",
      points: 6 + dna.vulnerableGroups.length * 3,
      note: `${dna.vulnerableGroups.join(", ")} directly affected`,
    },
    {
      label: "Evidence quality",
      points: { Weak: 4, Moderate: 8, Strong: 12 }[dna.evidenceQuality],
      note: `${dna.evidenceQuality} evidence attached to this submission`,
    },
    {
      label: "Corroborating reports",
      points: Math.min(12, 2 + reports),
      note: `${reports} related citizen reports detected nearby`,
    },
    {
      label: "Service criticality",
      points: ["Water", "Healthcare", "Education"].includes(dna.domain) ? 10 : 6,
      note: `${dna.domain} sits in the essential-service band`,
    },
  ];
}

export const scoreFrom = (factors: ScoreFactor[]) =>
  Math.max(28, Math.min(98, Math.round(factors.reduce((s, f) => s + f.points, 0) * 0.86)));

export function analyzeProblem(input: AnalysisInput): Analysis {
  const { domain, confidence } = classifyDomain(input.text);
  const { severity, urgency } = severityFrom(input.text);
  const duplicates = findDuplicates(input, domain);
  const t = input.text.toLowerCase();

  const vulnerable = [
    /child|school|student/.test(t) ? "Schoolchildren" : null,
    /women|mother|girl/.test(t) ? "Women" : null,
    /elder|old age|senior/.test(t) ? "Elderly" : null,
    /farmer|kisan/.test(t) ? "Farmers" : null,
  ].filter(Boolean) as string[];

  const evidenceQuality: ProblemDNA["evidenceQuality"] =
    (input.media?.length ?? 0) >= 2 ? "Strong" : (input.media?.length ?? 0) === 1 ? "Moderate" : "Weak";

  const dna: ProblemDNA = {
    domain,
    subdomain: SUBDOMAIN_HINT[domain],
    location: [input.village, input.block, input.district].filter(Boolean).join(", "),
    severity,
    urgency,
    duration: durationFrom(input.text),
    affected: affectedFrom(input.text, 80 + duplicates.length * 40),
    vulnerableGroups: vulnerable.length ? vulnerable : ["General population"],
    problemType: /broken|not work|damage|fail/.test(t) ? "Infrastructure failure" : "Service delivery gap",
    evidenceQuality,
    possibleCauses: [
      "Deferred or unfunded maintenance",
      "No trained local repair capacity",
      "Unclear ownership between departments",
      "Seasonal / environmental variability",
    ],
    requiredExpertise: EXPERTISE_HINT[domain] ?? EXPERTISE.slice(0, 4),
    interventionAreas: [
      "Low-cost technical retrofit",
      "Remote monitoring & early warning",
      "Community maintenance model",
    ],
    infrastructure: /handpump|pump/.test(t)
      ? ["Handpump", "School building"]
      : ["Local public infrastructure (to be confirmed)"],
    sdgs: {
      Water: ["SDG 6", "SDG 3"],
      Education: ["SDG 4"],
      Healthcare: ["SDG 3"],
      Agriculture: ["SDG 2", "SDG 8"],
      Sanitation: ["SDG 6", "SDG 11"],
      Environment: ["SDG 13", "SDG 15"],
      "Rural Livelihoods": ["SDG 8", "SDG 1"],
      Accessibility: ["SDG 10", "SDG 11"],
      "Urban Infrastructure": ["SDG 11"],
      "Public Services": ["SDG 16"],
    }[domain],
    confidence,
  };

  const factors = buildFactors(dna, duplicates.reduce((s, d) => s + d.challenge.reports.length, 0));

  return {
    challengeId: `JH-${DOMAIN_CODE[domain]}-${String(10000 + Math.floor(Math.abs(hash(input.text)) % 89999)).slice(0, 5)}`,
    title: suggestTitle(input.text, domain),
    dna,
    factors,
    score: scoreFrom(factors),
    duplicates,
    rootCauses: dna.possibleCauses,
    solutionDirections: [
      {
        idea: "Low-cost retrofit of the failed component with locally available spares",
        kind: "AI suggestion",
        note: "Hypothesis — requires field validation of the actual failure mode.",
      },
      {
        idea: "Sensor-based functionality monitoring with SMS escalation",
        kind: "AI suggestion",
        note: "Prior art exists in public WASH literature; not yet validated for this site.",
      },
      {
        idea: "District groundwater / service datasets for site diagnosis",
        kind: "Verified source",
        note: "Central Ground Water Board public data (cgwb.gov.in).",
      },
    ],
  };
}

function suggestTitle(text: string, domain: Domain) {
  const clean = text.trim().replace(/\s+/g, " ");
  const first = clean.split(/[.!?]/)[0] ?? clean;
  const short = first.length > 90 ? first.slice(0, 88) + "…" : first;
  return short.charAt(0).toUpperCase() + short.slice(1) || `${domain} challenge`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
