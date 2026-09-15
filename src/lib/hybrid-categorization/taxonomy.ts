import { z } from "zod";

/**
 * THE 16 APPROVED CIVIC CATEGORIES
 * The system MUST ONLY use these primary categories.
 * No "Other", "Unknown", "Unclassified", or "N/A" allowed as final classification.
 */
export const APPROVED_CIVIC_CATEGORIES = [
  "Roads & Infrastructure",
  "Water Supply",
  "Sanitation & Waste Management",
  "Electricity",
  "Health & Medical Services",
  "Education",
  "Agriculture",
  "Rural Development",
  "Women & Child Welfare",
  "Public Safety & Security",
  "Housing & Public Facilities",
  "Transport",
  "Environment",
  "Disaster Management",
  "Revenue & Land",
  "Social Welfare",
] as const;

export type CivicCategory = (typeof APPROVED_CIVIC_CATEGORIES)[number];

export const CivicCategorySchema = z.enum(APPROVED_CIVIC_CATEGORIES);

export interface DepartmentTaxonomyEntry {
  category: CivicCategory;
  department: string;
  departmentScope: string;
  jurisdictionScope: string;
  slaTargetHours: number;
  criticalSlaHours: number;
  associatedKeywords: string[];
}

/**
 * Official Controlled Department Mapping for all 16 Approved Categories
 */
export const DEPARTMENT_TAXONOMY: Record<CivicCategory, DepartmentTaxonomyEntry> = {
  "Roads & Infrastructure": {
    category: "Roads & Infrastructure",
    department: "Public Works Department (PWD) / Rural Road Development Agency",
    departmentScope:
      "Responsible for state highways, major district thoroughfares, bridges, flyovers, culverts, pothole restoration, and integrated road stormwater runoff networks.",
    jurisdictionScope: "State PWD / Rural Engineering Services / Municipal Works Division",
    slaTargetHours: 72,
    criticalSlaHours: 24,
    associatedKeywords: ["pothole", "road", "bridge", "culvert", "flyover", "asphalt", "crater", "pavement", "footpath", "divider", "street repair"],
  },
  "Water Supply": {
    category: "Water Supply",
    department: "Rural Water Supply & Sanitation / Public Health Engineering Department (PHED)",
    departmentScope:
      "Governs municipal piped water supply, drinking water potability, public handpump maintenance, Jal Jeevan Mission rural networks, and overhead water storage tanks.",
    jurisdictionScope: "District PHED Division / Municipal Water Works Board",
    slaTargetHours: 48,
    criticalSlaHours: 12,
    associatedKeywords: ["drinking water", "water pipeline", "handpump", "borewell", "water tank", "water shortage", "water contamination", "pipeline leak", "turbid water"],
  },
  "Sanitation & Waste Management": {
    category: "Sanitation & Waste Management",
    department: "Panchayati Raj / Rural Development / Municipal Local Body Authority",
    departmentScope:
      "Oversees solid waste collection, municipal dump clearance, public toilet hygiene, street sweeping, and underground sewage/drainage unblocking.",
    jurisdictionScope: "Municipal Health & Sanitation Wing / Zilla Swachhata Cell",
    slaTargetHours: 48,
    criticalSlaHours: 12,
    associatedKeywords: ["garbage", "trash", "waste", "drainage", "sewage", "gutter", "drain overflow", "public toilet", "sanitation", "litter", "septic tank"],
  },
  "Electricity": {
    category: "Electricity",
    department: "State Electricity Distribution Company (DISCOM) / Energy Department",
    departmentScope:
      "Manages high and low-tension electrical distribution, pole and transformer maintenance, power outages, fallen live wires, and public streetlighting power supply.",
    jurisdictionScope: "DISCOM Sub-Divisional Office (SDO) / Municipal Electrical Wing",
    slaTargetHours: 24,
    criticalSlaHours: 4,
    associatedKeywords: ["electricity", "power outage", "live wire", "transformer", "electric pole", "sparking", "blackout", "low voltage", "streetlight power"],
  },
  "Health & Medical Services": {
    category: "Health & Medical Services",
    department: "Health & Family Welfare Department",
    departmentScope:
      "Administers primary health centres (PHCs), community medical outreach, emergency medical response, disease outbreak surveillance, essential drugs, and medical camp facilities.",
    jurisdictionScope: "District Chief Medical Officer (CMO) / Directorate of Health Services",
    slaTargetHours: 24,
    criticalSlaHours: 2,
    associatedKeywords: ["heart attack", "medical emergency", "ambulance", "hospital", "phc", "doctor", "medicine", "fainted", "cardiac", "patient", "illness", "fever outbreak", "epidemic", "poisoning"],
  },
  "Education": {
    category: "Education",
    department: "School Education & Literacy Department",
    departmentScope:
      "Oversees government school infrastructure, classroom safety, drinking water and toilet facilities for students, teacher availability, and midday meal program hygiene.",
    jurisdictionScope: "District Education Office (DEO) / Block Education Resource Centres",
    slaTargetHours: 96,
    criticalSlaHours: 24,
    associatedKeywords: ["school", "classroom", "teacher", "students", "midday meal", "blackboard", "college", "education", "school building", "student toilet"],
  },
  "Agriculture": {
    category: "Agriculture",
    department: "Department of Agriculture & Farmers' Welfare",
    departmentScope:
      "Manages public agricultural canal irrigation, soil testing services, pest outbreak mitigation, certified seed and fertilizer availability, and smallholder farmer support.",
    jurisdictionScope: "District Agriculture Office / Krishi Vigyan Kendra (KVK)",
    slaTargetHours: 96,
    criticalSlaHours: 48,
    associatedKeywords: ["crop", "agriculture", "farmer", "fertilizer", "pest attack", "irrigation canal", "seed", "standing crop", "harvest", "crop disease"],
  },
  "Rural Development": {
    category: "Rural Development",
    department: "Rural Development Department / Zilla Parishad",
    departmentScope:
      "Implements rural community asset creation, MGNREGA works, village connectivity, community hall construction, and rural livelihoods infrastructure.",
    jurisdictionScope: "Block Development Office (BDO) / District Rural Development Agency (DRDA)",
    slaTargetHours: 120,
    criticalSlaHours: 48,
    associatedKeywords: ["village", "panchayat", "mgnrega", "rural path", "community hall", "gram sabha", "rural asset", "block development"],
  },
  "Women & Child Welfare": {
    category: "Women & Child Welfare",
    department: "Women & Child Development (WCD) Department",
    departmentScope:
      "Oversees Anganwadi centres, supplementary nutrition, child protection, maternal healthcare nutrition tracking, and women safety helpdesks.",
    jurisdictionScope: "District Child Protection Unit / Anganwadi Project Office (CDPO)",
    slaTargetHours: 48,
    criticalSlaHours: 12,
    associatedKeywords: ["anganwadi", "child nutrition", "malnutrition", "pregnant woman", "lactating mother", "welfare scheme", "child safety", "daycare"],
  },
  "Public Safety & Security": {
    category: "Public Safety & Security",
    department: "Police Department / Home Department",
    departmentScope:
      "Maintains public order, pedestrian security, open pit/borewell hazard cordoning, dark zone surveillance, traffic regulation, and local law enforcement vigilance.",
    jurisdictionScope: "Local Police Station / District Superintendent of Police (SP)",
    slaTargetHours: 24,
    criticalSlaHours: 2,
    associatedKeywords: ["police", "crime", "theft", "uncovered borewell", "open pit", "safety hazard", "harassment", "dark alley", "security", "traffic light broken", "barricade"],
  },
  "Housing & Public Facilities": {
    category: "Housing & Public Facilities",
    department: "Housing Department / Rural Development / Panchayati Raj",
    departmentScope:
      "Governs public housing schemes (PMAY), public parks, community recreation centres, cremation/burial grounds, and municipal market infrastructure.",
    jurisdictionScope: "District Housing Cell / Municipal Town Planning Division",
    slaTargetHours: 120,
    criticalSlaHours: 72,
    associatedKeywords: ["pmay", "public housing", "community park", "market shed", "burial ground", "crematorium", "bus shelter", "public bench", "civic building"],
  },
  "Transport": {
    category: "Transport",
    department: "Transport Department / State Road Transport Corporation",
    departmentScope:
      "Oversees public bus transit schedules, bus stop infrastructure, road traffic signage, rural transport feeder connectivity, and vehicle safety compliance.",
    jurisdictionScope: "Regional Transport Office (RTO) / State Transport Depot",
    slaTargetHours: 72,
    criticalSlaHours: 24,
    associatedKeywords: ["bus service", "bus stand", "public transport", "rto", "bus route", "transit", "shared auto stand", "traffic sign", "transport connectivity"],
  },
  "Environment": {
    category: "Environment",
    department: "Environment & Forest Department / State Pollution Control Board",
    departmentScope:
      "Monitors industrial effluent discharge, air quality degradation, unauthorized tree felling, lake/wetland encroachments, and municipal plastic burning.",
    jurisdictionScope: "Regional Office, State Pollution Control Board (SPCB) / Forest Division",
    slaTargetHours: 72,
    criticalSlaHours: 24,
    associatedKeywords: ["pollution", "chemical discharge", "smoke", "air quality", "river pollution", "plastic burning", "tree felling", "lake encroachment", "toxic effluent"],
  },
  "Disaster Management": {
    category: "Disaster Management",
    department: "State / District Disaster Management Authority (SDMA / DDMA)",
    departmentScope:
      "Coordinates flash flood relief, cyclonic storm damage mitigation, landslide road clearance, earthquake structural rescue, and emergency shelter provisioning.",
    jurisdictionScope: "District Disaster Management Cell / Revenue Divisional Officer (RDO)",
    slaTargetHours: 12,
    criticalSlaHours: 1,
    associatedKeywords: ["flood", "landslide", "cyclone", "storm damage", "inundation", "relief camp", "building collapse", "lightning strike", "disaster rescue"],
  },
  "Revenue & Land": {
    category: "Revenue & Land",
    department: "Revenue Department",
    departmentScope:
      "Handles land record discrepancies, public land encroachment, patta verification, mutation grievances, and boundary disputes affecting civic access.",
    jurisdictionScope: "Tehsildar Office / Sub-Divisional Magistrate (SDM)",
    slaTargetHours: 144,
    criticalSlaHours: 72,
    associatedKeywords: ["land record", "encroachment", "patta", "tehsildar", "revenue land", "land dispute", "mutation", "survey number", "public land grab"],
  },
  "Social Welfare": {
    category: "Social Welfare",
    department: "Social Welfare Department",
    departmentScope:
      "Administers disability accessibility (Divyangjan aids), old age and widow pensions, scholarships, and social security entitlements for vulnerable communities.",
    jurisdictionScope: "District Social Welfare Office (DSWO) / Block Welfare Office",
    slaTargetHours: 96,
    criticalSlaHours: 48,
    associatedKeywords: ["pension", "disability", "wheelchair ramp", "divyang", "widow pension", "senior citizen", "social security", "ration card grievance", "tribal welfare"],
  },
};

/**
 * Normalizes any legacy, free-form, or historical category strings
 * strictly into one of the 16 APPROVED CIVIC CATEGORIES.
 */
export function normalizeCivicCategory(input: string | null | undefined): CivicCategory {
  if (!input) return "Roads & Infrastructure";
  const clean = input.trim().toLowerCase();

  // 1. Direct match
  const directMatch = APPROVED_CIVIC_CATEGORIES.find((c) => c.toLowerCase() === clean);
  if (directMatch) return directMatch;

  // 2. Exact alias mapping for historical data
  if (clean.includes("heart") || clean.includes("medic") || clean.includes("health") || clean.includes("hospital") || clean.includes("phc") || clean.includes("doctor")) {
    return "Health & Medical Services";
  }
  if (clean.includes("water supply") || clean.includes("drinking water") || clean === "water" || clean.includes("handpump") || clean.includes("pipeline")) {
    return "Water Supply";
  }
  if (clean.includes("sanitation") || clean.includes("garbage") || clean.includes("waste") || clean.includes("sewage") || clean.includes("drainage")) {
    return "Sanitation & Waste Management";
  }
  if (clean.includes("road") || clean.includes("pothole") || clean.includes("infrastructure") || clean.includes("bridge") || clean.includes("footpath")) {
    return "Roads & Infrastructure";
  }
  if (clean.includes("electric") || clean.includes("power") || clean.includes("voltage") || clean.includes("wire") || clean.includes("transformer")) {
    return "Electricity";
  }
  if (clean.includes("school") || clean.includes("education") || clean.includes("student") || clean.includes("teacher")) {
    return "Education";
  }
  if (clean.includes("agri") || clean.includes("crop") || clean.includes("farmer") || clean.includes("canal") || clean.includes("pest")) {
    return "Agriculture";
  }
  if (clean.includes("rural") || clean.includes("panchayat") || clean.includes("village") || clean.includes("mgnrega")) {
    return "Rural Development";
  }
  if (clean.includes("women") || clean.includes("child") || clean.includes("anganwadi") || clean.includes("maternal")) {
    return "Women & Child Welfare";
  }
  if (clean.includes("safety") || clean.includes("police") || clean.includes("security") || clean.includes("crime") || clean.includes("pit") || clean.includes("borewell")) {
    return "Public Safety & Security";
  }
  if (clean.includes("housing") || clean.includes("pmay") || clean.includes("park") || clean.includes("public facility")) {
    return "Housing & Public Facilities";
  }
  if (clean.includes("transport") || clean.includes("bus") || clean.includes("traffic")) {
    return "Transport";
  }
  if (clean.includes("environ") || clean.includes("pollution") || clean.includes("smoke") || clean.includes("forest")) {
    return "Environment";
  }
  if (clean.includes("disaster") || clean.includes("flood") || clean.includes("landslide") || clean.includes("cyclone")) {
    return "Disaster Management";
  }
  if (clean.includes("land") || clean.includes("revenue") || clean.includes("patta") || clean.includes("tehsildar")) {
    return "Revenue & Land";
  }
  if (clean.includes("welfare") || clean.includes("pension") || clean.includes("disability") || clean.includes("divyang")) {
    return "Social Welfare";
  }

  // 3. Fallback: Default to Roads & Infrastructure (most common civic domain), never "Other"
  return "Roads & Infrastructure";
}
