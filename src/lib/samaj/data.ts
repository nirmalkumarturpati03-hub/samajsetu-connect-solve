/**
 * SamajSetu demo dataset.
 * ALL records in this file are SYNTHETIC "Demo Data" created for the SIH26043
 * prototype. They are not government records and institutional capabilities
 * described here are simulated.
 */

export type Domain =
  | "Water"
  | "Education"
  | "Healthcare"
  | "Agriculture"
  | "Sanitation"
  | "Environment"
  | "Rural Livelihoods"
  | "Accessibility"
  | "Urban Infrastructure"
  | "Public Services";

export const DOMAINS: Domain[] = [
  "Education",
  "Healthcare",
  "Agriculture",
  "Water",
  "Sanitation",
  "Environment",
  "Rural Livelihoods",
  "Accessibility",
  "Urban Infrastructure",
  "Public Services",
];

export const DOMAIN_CODE: Record<Domain, string> = {
  Water: "WTR",
  Education: "EDU",
  Healthcare: "HLT",
  Agriculture: "AGR",
  Sanitation: "SAN",
  Environment: "ENV",
  "Rural Livelihoods": "RLV",
  Accessibility: "ACC",
  "Urban Infrastructure": "URB",
  "Public Services": "PUB",
};

export type District = {
  name: string;
  x: number; // 0-100 schematic map coordinates
  y: number;
};

export const DISTRICTS: District[] = [
  { name: "Ranchi", x: 45, y: 55 },
  { name: "Dhanbad", x: 76, y: 38 },
  { name: "East Singhbhum", x: 72, y: 82 },
  { name: "Bokaro", x: 66, y: 44 },
  { name: "Hazaribagh", x: 55, y: 33 },
  { name: "Deoghar", x: 82, y: 24 },
  { name: "Dumka", x: 88, y: 33 },
  { name: "Giridih", x: 70, y: 27 },
  { name: "Palamu", x: 20, y: 33 },
  { name: "Latehar", x: 26, y: 46 },
  { name: "Gumla", x: 26, y: 66 },
  { name: "Simdega", x: 30, y: 82 },
  { name: "West Singhbhum", x: 52, y: 82 },
];

export type Severity = "Low" | "Moderate" | "High" | "Critical";
export type VerificationStatus =
  | "Unverified"
  | "Under Review"
  | "Community Verified"
  | "Officially Verified";
export type Stage =
  | "Reported"
  | "Validated"
  | "Matched"
  | "Project"
  | "Prototype"
  | "Pilot"
  | "Impact";

export type ProblemDNA = {
  domain: Domain;
  subdomain: string;
  location: string;
  severity: Severity;
  urgency: Severity;
  duration: string;
  affected: number;
  vulnerableGroups: string[];
  problemType: string;
  evidenceQuality: "Weak" | "Moderate" | "Strong";
  possibleCauses: string[];
  requiredExpertise: string[];
  interventionAreas: string[];
  infrastructure: string[];
  sdgs: string[];
  confidence: number; // 0-1
};

export type ScoreFactor = { label: string; points: number; note: string };

export type CitizenReport = {
  id: string;
  text: string;
  district: string;
  block: string;
  village: string;
  submittedAt: string;
  media: ("photo" | "voice" | "video" | "document")[];
  reporter: string;
};

export type VerificationEvent = {
  at: string;
  by: string;
  action: string;
  method: string;
};

export type Challenge = {
  id: string;
  title: string;
  summary: string;
  district: string;
  block: string;
  village: string;
  domain: Domain;
  stage: Stage;
  verification: VerificationStatus;
  score: number;
  factors: ScoreFactor[];
  dna: ProblemDNA;
  reports: CitizenReport[];
  verificationLog: VerificationEvent[];
  projectId?: string;
  featured?: boolean;
};

export type University = {
  id: string;
  name: string;
  district: string;
  departments: string[];
  labs: string[];
  researchAreas: string[];
  students: number;
  faculty: number;
  capacity: "Low" | "Medium" | "High";
};

export type Faculty = {
  id: string;
  name: string;
  universityId: string;
  department: string;
  expertise: string[];
  researchAreas: string[];
  publications: number;
  mentored: number;
  availability: "Open" | "Limited" | "Full";
  district: string;
};

export type Student = {
  id: string;
  name: string;
  universityId: string;
  department: string;
  year: number;
  skills: string[];
  interests: string[];
  availability: "Open" | "Limited" | "Full";
  projects: number;
};

export type IndustryOrg = {
  id: string;
  name: string;
  type: "Industry" | "Startup" | "MSME";
  sector: string;
  capabilities: string[];
  districts: string[];
  csrThemes: string[];
  supports: string[];
};

export type CSROrg = {
  id: string;
  name: string;
  themes: string[];
  districts: string[];
  fundingRange: string;
  sdgFocus: string[];
};

export type Milestone = {
  name: string;
  owner: string;
  due: string;
  status: "Not Started" | "In Progress" | "Completed" | "Delayed" | "Blocked";
  evidence?: string;
};

export type ImpactMetric = {
  metric: string;
  unit: string;
  baseline: number;
  target: number;
  observed: number;
  source: string;
  label: "Measured" | "Estimated" | "Self-reported" | "Verified";
};

export type Project = {
  id: string;
  challengeId: string;
  title: string;
  objective: string;
  outcome: string;
  universityId: string;
  facultyId: string;
  studentIds: string[];
  industryId?: string;
  csrId?: string;
  district: string;
  stage: Stage;
  health: number;
  timeline: string;
  milestones: Milestone[];
  prototype: {
    version: string;
    notes: string;
    repo: string;
    artefacts: string[];
    history: { version: string; date: string; change: string }[];
  };
  pilot: {
    status: "Planned" | "Approved" | "Running" | "Completed" | "Verified";
    location: string;
    start: string;
    end: string;
    population: number;
    baseline: string;
    target: string;
    observed: string;
  };
  funding: {
    required: number;
    received: number;
    sources: { name: string; amount: number; status: string }[];
  };
  ip: { type: string; owner: string; status: string; date: string }[];
  feedback: {
    citizen: string;
    verdict: "Solved" | "Partially Solved" | "Not Solved";
    comment: string;
    date: string;
  }[];
  metrics: ImpactMetric[];
};

export type ResearchItem = {
  title: string;
  authors: string;
  institution: string;
  area: string;
  relevance: string;
  source: string;
  verified: boolean;
};

/* ----------------------------- deterministic RNG ---------------------------- */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)]!;
const pickN = <T,>(r: () => number, arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]!);
  return out;
};

/* --------------------------------- catalogs -------------------------------- */
export const EXPERTISE = [
  "Civil Engineering",
  "Mechanical Engineering",
  "Water Resources",
  "IoT",
  "Data Science",
  "Community Development",
  "Public Health",
  "Agronomy",
  "Environmental Science",
  "Electrical Engineering",
  "Computer Science",
  "Social Science",
  "Design",
  "Materials Science",
  "Education Technology",
];

const SUBDOMAINS: Record<Domain, string[]> = {
  Water: ["Rural drinking water", "Groundwater depletion", "Water quality", "Irrigation supply"],
  Education: ["Learning outcomes", "School infrastructure", "Digital access", "Teacher capacity"],
  Healthcare: ["Primary care access", "Maternal health", "Emergency transport", "Diagnostics"],
  Agriculture: ["Crop yield", "Post-harvest loss", "Soil health", "Market linkage"],
  Sanitation: ["Toilet functionality", "Waste collection", "Drainage", "Menstrual hygiene"],
  Environment: ["Air quality", "Mine reclamation", "Deforestation", "River pollution"],
  "Rural Livelihoods": ["Self-help groups", "Skill gaps", "Forest produce", "Migration"],
  Accessibility: ["Mobility access", "Assistive tech", "Inclusive schooling", "Signage"],
  "Urban Infrastructure": ["Street lighting", "Roads", "Public transport", "Stormwater"],
  "Public Services": ["Scheme delivery", "Document access", "Grievance turnaround", "Connectivity"],
};

const TITLES: Record<Domain, string[]> = {
  Water: [
    "Non-functional drinking-water handpump near rural school",
    "Iron contamination in village borewell water",
    "Seasonal drying of community wells",
  ],
  Education: [
    "Primary school without functional science lab",
    "High dropout after class 8 in tribal blocks",
    "No digital learning access in upper primary schools",
  ],
  Healthcare: [
    "Sub-centre without diagnostic support",
    "Delayed emergency transport in hilly panchayats",
    "Anaemia among adolescent girls in block schools",
  ],
  Agriculture: [
    "Low paddy yield due to irrigation variability",
    "Post-harvest vegetable loss without cold storage",
    "Soil acidity reducing productivity",
  ],
  Sanitation: [
    "Blocked drainage causing waterlogging in ward",
    "Non-functional school toilets",
    "Unmanaged solid waste near market area",
  ],
  Environment: [
    "Dust pollution near coal transport corridor",
    "Abandoned mine pit water contamination",
    "Loss of village pond ecosystem",
  ],
  "Rural Livelihoods": [
    "SHG lac products lack market linkage",
    "Seasonal migration due to lack of local work",
    "Low value realisation for tasar silk weavers",
  ],
  Accessibility: [
    "Panchayat building inaccessible for wheelchair users",
    "No assistive learning support for hearing-impaired students",
    "Unsafe pedestrian access near block hospital",
  ],
  "Urban Infrastructure": [
    "Unlit stretch on ward approach road",
    "Frequent water pipeline leakage in colony",
    "Bus stop without shelter at block headquarters",
  ],
  "Public Services": [
    "Long turnaround for caste certificate issuance",
    "Poor mobile connectivity blocking scheme applications",
    "Ration distribution timings mismatch for workers",
  ],
};

const FIRST = [
  "Aarav",
  "Priya",
  "Rahul",
  "Sunita",
  "Manoj",
  "Kavita",
  "Arun",
  "Neha",
  "Sanjay",
  "Anjali",
  "Deepak",
  "Rekha",
  "Vikas",
  "Pooja",
  "Ravi",
  "Sarita",
  "Amit",
  "Nisha",
  "Birsa",
  "Mangal",
];
const LAST = [
  "Mahato",
  "Oraon",
  "Kumar",
  "Munda",
  "Singh",
  "Tirkey",
  "Sinha",
  "Besra",
  "Verma",
  "Soren",
  "Gupta",
  "Hansda",
];

/* ------------------------------- universities ------------------------------- */
const UNIV_NAMES: [string, string][] = [
  ["Ranchi Institute of Technology", "Ranchi"],
  ["Jharkhand University of Engineering", "Ranchi"],
  ["Dhanbad School of Applied Sciences", "Dhanbad"],
  ["Kolhan Institute of Engineering", "East Singhbhum"],
  ["Bokaro Steel City Technical University", "Bokaro"],
  ["Hazaribagh College of Science & Technology", "Hazaribagh"],
  ["Santhal Pargana Institute of Rural Technology", "Dumka"],
  ["Palamu Agricultural Sciences Institute", "Palamu"],
  ["Gumla Tribal Innovation College", "Gumla"],
  ["Deoghar Institute of Health Sciences", "Deoghar"],
];

const DEPARTMENTS = [
  "Civil Engineering",
  "Mechanical Engineering",
  "Computer Science",
  "Electronics & Communication",
  "Environmental Science",
  "Agricultural Engineering",
  "Public Health",
  "Social Work",
  "Design",
];

export const universities: University[] = UNIV_NAMES.map(([name, district], i) => {
  const r = rng(100 + i);
  return {
    id: `UNI-${String(i + 1).padStart(2, "0")}`,
    name,
    district,
    departments: pickN(r, DEPARTMENTS, 5),
    labs: pickN(
      r,
      [
        "Water Quality Lab",
        "IoT & Embedded Systems Lab",
        "Geo-Spatial Lab",
        "Materials Testing Lab",
        "Soil Science Lab",
        "Rural Innovation Centre",
        "Fabrication Workshop",
      ],
      3,
    ),
    researchAreas: pickN(r, EXPERTISE, 4),
    students: 1200 + Math.floor(r() * 5200),
    faculty: 60 + Math.floor(r() * 180),
    capacity: pick(r, ["Low", "Medium", "High", "High"] as const),
  };
});

export const faculty: Faculty[] = Array.from({ length: 80 }, (_, i) => {
  const r = rng(500 + i);
  const uni = universities[i % universities.length]!;
  return {
    id: `FAC-${String(i + 1).padStart(3, "0")}`,
    name: `Dr. ${pick(r, FIRST)} ${pick(r, LAST)}`,
    universityId: uni.id,
    department: pick(r, uni.departments),
    expertise: pickN(r, EXPERTISE, 3),
    researchAreas: pickN(r, EXPERTISE, 2),
    publications: 4 + Math.floor(r() * 60),
    mentored: Math.floor(r() * 22),
    availability: pick(r, ["Open", "Open", "Limited", "Full"] as const),
    district: uni.district,
  };
});

export const students: Student[] = Array.from({ length: 300 }, (_, i) => {
  const r = rng(9000 + i);
  const uni = universities[i % universities.length]!;
  return {
    id: `STU-${String(i + 1).padStart(3, "0")}`,
    name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
    universityId: uni.id,
    department: pick(r, uni.departments),
    year: 2 + Math.floor(r() * 3),
    skills: pickN(r, EXPERTISE, 3),
    interests: pickN(r, DOMAINS, 2),
    availability: pick(r, ["Open", "Open", "Limited", "Full"] as const),
    projects: Math.floor(r() * 4),
  };
});

const ORG_BASE = [
  "AquaSense Technologies",
  "Jharkhand Rural Systems",
  "Kolhan AgriTech",
  "GreenGrid Energy",
  "Chhotanagpur Fabrication Works",
  "HydroPulse Startups",
  "SteelCity Robotics",
  "TriboIoT Labs",
  "SarnaSoft Solutions",
  "Damodar Water Works",
];

export const industryOrgs: IndustryOrg[] = Array.from({ length: 30 }, (_, i) => {
  const r = rng(2200 + i);
  return {
    id: `IND-${String(i + 1).padStart(2, "0")}`,
    name: `${ORG_BASE[i % ORG_BASE.length]}${i >= ORG_BASE.length ? ` ${Math.floor(i / ORG_BASE.length) + 1}` : ""}`,
    type: pick(r, ["Industry", "Startup", "MSME"] as const),
    sector: pick(r, [
      "Water technology",
      "Agri-tech",
      "Clean energy",
      "Manufacturing",
      "Digital services",
      "Health tech",
    ]),
    capabilities: pickN(
      r,
      [
        "IoT",
        "Water monitoring",
        "Field deployment",
        "Sensor manufacturing",
        "Data platforms",
        "Solar systems",
        "Cold chain",
        "Mobile applications",
        "Training & capacity building",
      ],
      4,
    ),
    districts: pickN(
      r,
      DISTRICTS.map((d) => d.name),
      3,
    ),
    csrThemes: pickN(r, ["Rural water", "Education", "Health", "Livelihoods", "Environment"], 2),
    supports: pickN(r, ["Technology", "Mentorship", "Pilot hosting", "Funding", "Deployment"], 3),
  };
});

export const csrOrgs: CSROrg[] = Array.from({ length: 10 }, (_, i) => {
  const r = rng(3300 + i);
  return {
    id: `CSR-${String(i + 1).padStart(2, "0")}`,
    name: `${pick(r, ["Damodar", "Sarna", "Chhotanagpur", "Subarnarekha", "Netarhat", "Koel", "Parasnath", "Tilaiya", "Maithon", "Palash"])} Foundation`,
    themes: pickN(
      r,
      ["Rural water", "Education", "Public health", "Livelihoods", "Environment", "Accessibility"],
      3,
    ),
    districts: pickN(
      r,
      DISTRICTS.map((d) => d.name),
      4,
    ),
    fundingRange: pick(r, ["₹5–15 lakh", "₹10–40 lakh", "₹25–75 lakh", "₹1–2 crore"]),
    sdgFocus: pickN(r, ["SDG 3", "SDG 4", "SDG 6", "SDG 8", "SDG 11", "SDG 13"], 2),
  };
});

/* --------------------------------- challenges -------------------------------- */
function makeDNA(r: () => number, domain: Domain, district: string, village: string): ProblemDNA {
  const sev = pick(r, ["Moderate", "High", "High", "Critical"] as const);
  return {
    domain,
    subdomain: pick(r, SUBDOMAINS[domain]),
    location: `${village}, ${district}`,
    severity: sev,
    urgency: pick(r, ["Moderate", "High", "High", "Critical"] as const),
    duration: pick(r, ["3 weeks", "2 months", "6 months", "Over 1 year", "Recurring seasonally"]),
    affected: 60 + Math.floor(r() * 3000),
    vulnerableGroups: pickN(
      r,
      ["Schoolchildren", "Women", "Elderly", "Daily wage workers", "Tribal households", "Farmers"],
      2,
    ),
    problemType: pick(r, [
      "Infrastructure failure",
      "Service delivery gap",
      "Resource degradation",
      "Capacity gap",
      "Access barrier",
    ]),
    evidenceQuality: pick(r, ["Moderate", "Strong", "Strong", "Weak"] as const),
    possibleCauses: pickN(
      r,
      [
        "Deferred maintenance",
        "Groundwater table decline",
        "Component wear and failure",
        "No local repair capacity",
        "Budget/ownership ambiguity",
        "Seasonal variability",
        "Design not suited to local conditions",
      ],
      4,
    ),
    requiredExpertise: pickN(r, EXPERTISE, 4),
    interventionAreas: pickN(
      r,
      [
        "Low-cost retrofit",
        "Remote monitoring",
        "Community maintenance model",
        "Alternative source development",
        "Process redesign",
        "Capacity building",
      ],
      3,
    ),
    infrastructure: pickN(
      r,
      ["Handpump", "School building", "Pipeline", "Anganwadi centre", "Panchayat bhawan", "Road"],
      2,
    ),
    sdgs: pickN(r, ["SDG 3", "SDG 4", "SDG 6", "SDG 8", "SDG 11", "SDG 13", "SDG 15"], 2),
    confidence: 0.74 + r() * 0.2,
  };
}

function makeFactors(r: () => number, dna: ProblemDNA, reports: number): ScoreFactor[] {
  const f: ScoreFactor[] = [
    {
      label: "Population affected",
      points: Math.min(20, 6 + Math.round(dna.affected / 200)),
      note: `${dna.affected.toLocaleString("en-IN")} residents in the reported catchment`,
    },
    {
      label: "Severity of impact",
      points: { Low: 6, Moderate: 11, High: 16, Critical: 20 }[dna.severity],
      note: `${dna.severity} severity as classified by AI Problem Doctor`,
    },
    {
      label: "Urgency",
      points: { Low: 4, Moderate: 8, High: 13, Critical: 16 }[dna.urgency],
      note: `${dna.urgency} urgency — ${dna.duration} unresolved`,
    },
    {
      label: "Vulnerable groups",
      points: 6 + dna.vulnerableGroups.length * 3,
      note: dna.vulnerableGroups.join(", ") + " directly affected",
    },
    {
      label: "Evidence quality",
      points: { Weak: 4, Moderate: 8, Strong: 12 }[dna.evidenceQuality],
      note: `${dna.evidenceQuality} evidence attached to supporting reports`,
    },
    {
      label: "Corroborating reports",
      points: Math.min(12, 2 + reports),
      note: `${reports} independent citizen reports merged`,
    },
    {
      label: "Service criticality",
      points: ["Water", "Healthcare", "Education"].includes(dna.domain) ? 10 : 6,
      note: `${dna.domain} is treated as an essential service band`,
    },
  ];
  return f;
}

function totalScore(f: ScoreFactor[]) {
  return Math.max(28, Math.min(98, Math.round(f.reduce((s, x) => s + x.points, 0) * 0.86)));
}

const REPORT_TEXTS = [
  "This has been a problem for a long time and nobody has come to fix it.",
  "Many families in our tola are affected every single day.",
  "We informed the panchayat but there is no update so far.",
  "Children are the worst affected because of this issue.",
  "During summer months the situation becomes much worse.",
  "We are ready to help if someone comes to work on a solution.",
];

function makeReports(r: () => number, n: number, district: string, block: string, village: string) {
  return Array.from({ length: n }, (_, i) => ({
    id: `RPT-${Math.floor(r() * 90000 + 10000)}`,
    text: pick(r, REPORT_TEXTS),
    district,
    block,
    village,
    submittedAt: `2026-0${1 + Math.floor(r() * 8)}-${String(2 + Math.floor(r() * 26)).padStart(2, "0")}`,
    media: pickN(r, ["photo", "voice", "video", "document"] as const, 1 + Math.floor(r() * 2)),
    reporter: `${pick(r, FIRST)} ${pick(r, LAST)}`,
  })) satisfies CitizenReport[];
}

const BLOCKS = ["Angara", "Namkum", "Chandankiyari", "Barhi", "Bundu", "Silli", "Nagri", "Sonahatu"];
const VILLAGES = [
  "Baridih",
  "Rampur",
  "Tundi",
  "Kuchai",
  "Karra",
  "Sisai",
  "Patratu",
  "Bishunpur",
  "Manoharpur",
];

function buildChallenges(): Challenge[] {
  const list: Challenge[] = [];

  // Flagship demo challenge (fixed content)
  const fr = rng(7);
  const flagshipReports = makeReports(fr, 37, "Ranchi", "Angara", "Baridih");
  flagshipReports[0] = {
    id: "RPT-10001",
    text: "The handpump near our school has not worked for two months. Children walk almost 1.5 km to fetch water during the school day.",
    district: "Ranchi",
    block: "Angara",
    village: "Baridih",
    submittedAt: "2026-08-12",
    media: ["photo", "voice"],
    reporter: "Sunita Mahato",
  };
  flagshipReports[1] = {
    ...flagshipReports[1]!,
    id: "RPT-10002",
    text: "No water available near primary school, the pump handle is broken and the platform is cracked.",
  };
  flagshipReports[2] = {
    ...flagshipReports[2]!,
    id: "RPT-10003",
    text: "Children walking far to collect water, some are missing afternoon classes.",
  };
  const flagshipDNA: ProblemDNA = {
    domain: "Water",
    subdomain: "Rural drinking water",
    location: "Baridih, Angara Block, Ranchi",
    severity: "High",
    urgency: "High",
    duration: "2 months",
    affected: 412,
    vulnerableGroups: ["Schoolchildren", "Women", "Elderly"],
    problemType: "Infrastructure failure",
    evidenceQuality: "Strong",
    possibleCauses: [
      "Worn cylinder / plunger assembly",
      "Falling groundwater table in summer months",
      "No trained local mechanic within the panchayat",
      "Unclear maintenance ownership between school and panchayat",
    ],
    requiredExpertise: [
      "Civil Engineering",
      "Mechanical Engineering",
      "Water Resources",
      "IoT",
      "Community Development",
    ],
    interventionAreas: [
      "Low-cost retrofit of pump assembly",
      "IoT-based functionality monitoring",
      "Community maintenance and spares model",
    ],
    infrastructure: ["Handpump", "School building"],
    sdgs: ["SDG 6", "SDG 4"],
    confidence: 0.91,
  };
  const flagshipFactors = makeFactors(rng(11), flagshipDNA, 37);
  list.push({
    id: "JH-WTR-00421",
    title: "Non-functional drinking-water handpump near rural school",
    summary:
      "The handpump serving the primary school and surrounding tola in Baridih has been non-functional for two months. 37 citizen reports were merged into this master challenge.",
    district: "Ranchi",
    block: "Angara",
    village: "Baridih",
    domain: "Water",
    stage: "Impact",
    verification: "Officially Verified",
    score: 87,
    factors: flagshipFactors,
    dna: flagshipDNA,
    reports: flagshipReports,
    verificationLog: [
      { at: "2026-08-12", by: "Platform", action: "Report received", method: "Citizen evidence" },
      {
        at: "2026-08-14",
        by: "Duplicate engine",
        action: "36 related reports merged into master challenge",
        method: "Semantic + geographic clustering",
      },
      {
        at: "2026-08-18",
        by: "Community volunteers, Angara",
        action: "Community Verified",
        method: "Community confirmation + photo evidence",
      },
      {
        at: "2026-08-27",
        by: "Block Development Office, Angara",
        action: "Officially Verified",
        method: "Government field verification",
      },
    ],
    projectId: "PRJ-001",
    featured: true,
  });

  // Remaining 19 master challenges
  for (let i = 0; i < 19; i++) {
    const r = rng(4000 + i * 37);
    const domain = DOMAINS[(i + 1) % DOMAINS.length]!;
    const district = DISTRICTS[(i * 3 + 1) % DISTRICTS.length]!.name;
    const block = pick(r, BLOCKS);
    const village = pick(r, VILLAGES);
    const dna = makeDNA(r, domain, district, village);
    const reportCount = 2 + Math.floor(r() * 24);
    const factors = makeFactors(r, dna, reportCount);
    const stage = pick(r, [
      "Reported",
      "Validated",
      "Validated",
      "Matched",
      "Project",
      "Prototype",
      "Pilot",
    ] as const);
    list.push({
      id: `JH-${DOMAIN_CODE[domain]}-${String(100 + i * 17).padStart(5, "0")}`,
      title: pick(r, TITLES[domain]),
      summary: `${reportCount} citizen reports from ${village} and nearby habitations describe a recurring ${domain.toLowerCase()} issue affecting daily life.`,
      district,
      block,
      village,
      domain,
      stage,
      verification: pick(r, [
        "Unverified",
        "Under Review",
        "Community Verified",
        "Community Verified",
        "Officially Verified",
      ] as const),
      score: totalScore(factors),
      factors,
      dna,
      reports: makeReports(r, reportCount, district, block, village),
      verificationLog: [
        { at: "2026-06-04", by: "Platform", action: "Report received", method: "Citizen evidence" },
        {
          at: "2026-06-09",
          by: "Community volunteers",
          action: "Location consistency confirmed",
          method: "Multiple reports",
        },
      ],
      projectId: i < 19 && stage !== "Reported" ? `PRJ-${String(i + 2).padStart(3, "0")}` : undefined,
    });
  }
  return list;
}

export const challenges: Challenge[] = buildChallenges();

export const totalCitizenReports = challenges.reduce((s, c) => s + c.reports.length, 0);

/* ---------------------------------- projects --------------------------------- */
const MILESTONE_NAMES = [
  "Field Validation",
  "Research",
  "Design",
  "Prototype",
  "Testing",
  "Pilot",
  "Deployment",
  "Impact Verification",
];

function buildProjects(): Project[] {
  const eligible = challenges.filter((c) => c.projectId);
  return eligible.map((c, i) => {
    const r = rng(6100 + i);
    const uni = universities[i % universities.length]!;
    const fac = faculty.find((f) => f.universityId === uni.id)!;
    const team = students.filter((s) => s.universityId === uni.id).slice(0, 5);
    const done = i === 0 ? 8 : 2 + Math.floor(r() * 5);
    const milestones: Milestone[] = MILESTONE_NAMES.map((name, mi) => ({
      name,
      owner: mi % 2 === 0 ? fac.name : team[mi % team.length]?.name || fac.name,
      due: `2026-${String(3 + mi).padStart(2, "0")}-15`,
      status:
        mi < done
          ? "Completed"
          : mi === done
            ? pick(r, ["In Progress", "In Progress", "Delayed"] as const)
            : "Not Started",
      evidence: mi < done ? "Field report + photographs uploaded" : undefined,
    }));
    const health = Math.round((done / 8) * 60 + 25 + r() * 12);
    return {
      id: c.projectId!,
      challengeId: c.id,
      title:
        i === 0
          ? "Smart Handpump Revival & Monitoring — Baridih, Angara"
          : `${c.dna.subdomain} intervention — ${c.village}, ${c.district}`,
      objective:
        i === 0
          ? "Restore reliable drinking water at the Baridih school handpump and prevent repeat failure through low-cost monitoring and a community maintenance model."
          : `Design, prototype and pilot a locally maintainable response to ${c.title.toLowerCase()}.`,
      outcome:
        i === 0
          ? "Functional handpump with >95% uptime, monitored remotely, maintained by a trained village committee."
          : "Validated prototype piloted with community confirmation and measured baseline-to-observed improvement.",
      universityId: uni.id,
      facultyId: fac.id,
      studentIds: team.map((s) => s.id),
      industryId: industryOrgs[i % industryOrgs.length]!.id,
      csrId: csrOrgs[i % csrOrgs.length]!.id,
      district: c.district,
      stage: c.stage,
      health: i === 0 ? 91 : Math.min(96, health),
      timeline: "Mar 2026 – Dec 2026",
      milestones,
      prototype: {
        version: `v${1 + Math.floor(r() * 3)}.${Math.floor(r() * 5)}`,
        notes:
          i === 0
            ? "Retrofit kit with replaced plunger assembly plus a solar-powered stroke-count sensor reporting daily usage over NB-IoT."
            : "Working bench prototype validated against field conditions collected during validation visits.",
        repo: "github.com/samajsetu-demo/" + c.id.toLowerCase(),
        artefacts: ["Design drawings (PDF)", "Bench test results", "Field photographs", "Demo video"],
        history: [
          { version: "v0.1", date: "2026-04-08", change: "Concept sketches and requirement freeze" },
          { version: "v0.5", date: "2026-05-20", change: "First bench prototype, sensor calibration" },
          { version: "v1.0", date: "2026-06-30", change: "Field-hardened enclosure, solar power" },
        ],
      },
      pilot: {
        status: i === 0 ? "Verified" : pick(r, ["Planned", "Approved", "Running", "Completed"] as const),
        location: `${c.village}, ${c.block} Block, ${c.district}`,
        start: "2026-07-01",
        end: "2026-09-30",
        population: c.dna.affected,
        baseline: i === 0 ? "0 functional water points at school; 1.5 km average walk" : "Baseline survey completed",
        target: i === 0 ? "Functional water point on premises, >95% uptime" : "30% improvement over baseline",
        observed: i === 0 ? "98% uptime over 12 weeks; walk distance reduced to 0 km" : "Measurement in progress",
      },
      funding: {
        required: 350000 + Math.floor(r() * 900000),
        received: 200000 + Math.floor(r() * 600000),
        sources: [
          { name: csrOrgs[i % csrOrgs.length]!.name, amount: 250000, status: "Funding Approved" },
          { name: industryOrgs[i % industryOrgs.length]!.name, amount: 150000, status: "Funding Commitment" },
          { name: "District Innovation Fund (demo)", amount: 100000, status: "Funding Interest" },
        ],
      },
      ip: [
        { type: "Open Source", owner: uni.name, status: "Published", date: "2026-06-30" },
        { type: "Design", owner: `${uni.name} + ${industryOrgs[i % industryOrgs.length]!.name}`, status: "Filed (demo)", date: "2026-07-14" },
      ],
      feedback:
        i === 0
          ? [
              {
                citizen: "Sunita Mahato",
                verdict: "Solved",
                comment: "Water is available at the school again. The committee repaired a fault within two days.",
                date: "2026-09-22",
              },
              {
                citizen: "Mangal Munda",
                verdict: "Partially Solved",
                comment: "Working well, but pressure is low in the afternoon during peak summer.",
                date: "2026-09-25",
              },
            ]
          : [
              {
                citizen: `${pick(r, FIRST)} ${pick(r, LAST)}`,
                verdict: pick(r, ["Solved", "Partially Solved", "Not Solved"] as const),
                comment: "Community observation recorded during pilot review meeting.",
                date: "2026-09-10",
              },
            ],
      metrics:
        i === 0
          ? [
              { metric: "People with restored water access", unit: "people", baseline: 0, target: 400, observed: 412, source: "Pilot survey + school register", label: "Verified" },
              { metric: "Daily time saved per household", unit: "minutes", baseline: 0, target: 40, observed: 52, source: "Household time-use survey", label: "Measured" },
              { metric: "Handpump uptime", unit: "%", baseline: 0, target: 95, observed: 98, source: "IoT stroke sensor", label: "Measured" },
              { metric: "Repair turnaround", unit: "days", baseline: 60, target: 7, observed: 2, source: "Committee log", label: "Self-reported" },
              { metric: "Students involved", unit: "students", baseline: 0, target: 5, observed: 5, source: "Project record", label: "Verified" },
            ]
          : [
              { metric: "People impacted", unit: "people", baseline: 0, target: c.dna.affected, observed: Math.floor(c.dna.affected * (0.3 + r() * 0.6)), source: "Pilot survey", label: pick(r, ["Measured", "Estimated", "Self-reported"] as const) },
              { metric: "Service availability", unit: "%", baseline: 40, target: 90, observed: 55 + Math.floor(r() * 40), source: "Field observation", label: "Estimated" },
            ],
    } satisfies Project;
  });
}

export const projects: Project[] = buildProjects();

export const researchItems: ResearchItem[] = [
  {
    title: "Sustainability of rural handpump water supply systems",
    authors: "Public repository metadata (demo placeholder)",
    institution: "Institutional repository",
    area: "Rural water supply",
    relevance: "Failure modes and maintenance economics of India Mark-II handpumps",
    source: "shodhganga.inflibnet.ac.in (search link)",
    verified: false,
  },
  {
    title: "Groundwater year book — Jharkhand",
    authors: "Central Ground Water Board",
    institution: "Government of India",
    area: "Groundwater levels",
    relevance: "District-wise groundwater trend data for pilot site selection",
    source: "cgwb.gov.in",
    verified: true,
  },
  {
    title: "Sensor-based rural water point monitoring literature",
    authors: "Public publication metadata (demo placeholder)",
    institution: "Various",
    area: "IoT for WASH",
    relevance: "Prior art for stroke-count based functionality monitoring",
    source: "Search across public publication metadata",
    verified: false,
  },
];

/* ---------------------------------- helpers ---------------------------------- */
export const getChallenge = (id: string) => challenges.find((c) => c.id === id);
export const getProject = (id: string) => projects.find((p) => p.id === id);
export const getProjectForChallenge = (cid: string) => projects.find((p) => p.challengeId === cid);
export const getUniversity = (id: string) => universities.find((u) => u.id === id);
export const getFaculty = (id: string) => faculty.find((f) => f.id === id);
export const getStudent = (id: string) => students.find((s) => s.id === id);
export const getIndustry = (id: string) => industryOrgs.find((o) => o.id === id);
export const getCSR = (id: string) => csrOrgs.find((o) => o.id === id);

export const districtStats = DISTRICTS.map((d) => {
  const cs = challenges.filter((c) => c.district === d.name);
  const ps = projects.filter((p) => p.district === d.name);
  return {
    ...d,
    challenges: cs.length,
    reports: cs.reduce((s, c) => s + c.reports.length, 0),
    highPriority: cs.filter((c) => c.score >= 75).length,
    projects: ps.length,
    people: cs.reduce((s, c) => s + c.dna.affected, 0),
    topDomain: cs[0]?.domain ?? "—",
  };
});

export const platformStats = {
  reports: totalCitizenReports,
  challenges: challenges.length,
  validated: challenges.filter((c) => c.verification !== "Unverified").length,
  highPriority: challenges.filter((c) => c.score >= 75).length,
  projects: projects.length,
  prototypes: projects.filter((p) =>
    ["Prototype", "Pilot", "Impact"].includes(p.stage),
  ).length,
  pilots: projects.filter((p) => ["Pilot", "Impact"].includes(p.stage)).length,
  deployments: projects.filter((p) => p.pilot.status === "Verified").length,
  universities: universities.length,
  faculty: faculty.length,
  students: students.length,
  industry: industryOrgs.length,
  csr: csrOrgs.length,
  peopleImpacted: projects.reduce(
    (s, p) => s + (p.metrics.find((m) => m.metric.includes("People"))?.observed ?? 0),
    0,
  ),
};
