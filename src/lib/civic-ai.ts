import { supabase } from "./supabase";
import { runHybridCategorization, FusedCategorizationResult } from "./hybrid-categorization/fusion-engine";
import { normalizeCivicCategory } from "./hybrid-categorization/taxonomy";

export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface MatchedDepartment {
  name: string;
  department: string;
  organizationType: "Urban Local Body (ULB)" | "Panchayati Raj Institution (PRI)" | "Government Department" | string;
  lineDepartment?: string | null | undefined;
  authority?: string | null | undefined;
  contactName?: string | null | undefined;
  contactEmail?: string | null | undefined;
  userId?: string | null | undefined;
  orgId?: string | null | undefined;
  jurisdiction: string;
  routedTo: string;
  isLiveDbMatch: boolean;
  stakeholderRecommendations: {
    university: string;
    industry: string;
    community: string;
  };
}

export interface ActiveGovernmentDepartment {
  id: string;
  ownerId?: string | null;
  name: string;
  organizationType: string;
  district?: string | null;
  locality?: string | null;
  expertise: string[];
  capabilities: string[];
  accountStatus: string;
  lineDepartment?: string | null;
  authority?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
}

export interface AIAnalysisResult {
  challengeId: string;
  originalDomain: string;
  classifiedDomain: string;
  specificIssue: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  priorityLevel: PriorityLevel;
  priorityScore: number;
  confidence: number;
  recommendedDepartment: string;
  recommendedOrganization: string;
  lineDepartment?: string | null | undefined;
  authority?: string | null | undefined;
  organizationType: string;
  routedTo: string;
  jurisdiction: string;
  assignedUserId?: string | null | undefined;
  assignedOrgId?: string | null | undefined;
  routingStatus: string;
  lifecycleStage: string;
  stakeholderRecommendations: {
    university: string;
    industry: string;
    community: string;
  };
  keyDetails: string[];
  routingRecommendation: string;
  validationNotice: string;
  status: "AI Analysis Complete" | "Analyzing..." | "Pending Analysis";
  factors: Record<string, any>;
  timestamp: string;
  secondaryContext?: string[] | undefined;
  confidenceTier?: "High" | "Medium" | "Needs Review" | undefined;
  needsReview?: boolean | undefined;
  explanation?: string | undefined;
  hybridResult?: FusedCategorizationResult | undefined;
}

export interface DomainTaxonomy {
  canonicalDomain: string;
  classifiedDomain: string;
  aliases: string[];
  defaultDepartment: string;
  subcategories: {
    name: string;
    keywords: string[];
    defaultPriority: "Critical" | "High" | "Medium" | "Low";
    priorityScore: number;
    departmentKeywords: string[];
    departmentFallback: string;
    stakeholderRecs: {
      university: string;
      industry: string;
      community: string;
    };
    detailsTemplate: (desc: string, loc: string) => string[];
  }[];
}

export const DOMAIN_TAXONOMIES: DomainTaxonomy[] = [
  {
    canonicalDomain: "Water Resources",
    classifiedDomain: "Water Resources & Quality",
    aliases: ["Water", "Water Resources", "Water Supply", "Drinking Water", "Water & Sanitation"],
    defaultDepartment: "Public Health Engineering Department (PHED)",
    subcategories: [
      {
        name: "Water Contamination",
        keywords: [
          "contaminat", "dirty", "tank", "poison", "toxic", "muddy", "smell", "bad taste",
          "foul", "yellow", "black water", "bacteria", "unfit", "unsafe drinking", "pollution",
          "chemical", "sewage mix", "worm", "algae", "colored water"
        ],
        defaultPriority: "High",
        priorityScore: 88,
        departmentKeywords: ["water", "drinking water", "public health engineering", "phed", "water quality", "sanitation", "water supply"],
        departmentFallback: "Public Health Engineering Department (PHED)",
        stakeholderRecs: {
          university: "Water quality testing & bacteriological assay by environmental chemistry faculty",
          industry: "Water filtration equipment & rapid disinfectant chemical supply",
          community: "Community potability alert and alternative tanker distribution monitoring"
        },
        detailsTemplate: (_desc, loc) => [
          "Identified water quality hazard potentially affecting drinking and household usage",
          `Location assessed for public water source jurisdiction: ${loc}`,
          "Requires immediate water quality laboratory testing and disinfection protocol",
          "Recommended human verification and swift dispatch of engineering inspection team"
        ],
      },
      {
        name: "Pipeline Burst & Supply Disruption",
        keywords: [
          "burst", "leak", "pipe", "pipeline", "broken pipe", "gushing", "pressure", "no water",
          "water supply cut", "line break", "valve", "supply disrupted", "tap dry"
        ],
        defaultPriority: "High",
        priorityScore: 78,
        departmentKeywords: ["water supply", "phed", "municipal", "water works", "engineering", "water"],
        departmentFallback: "Public Health Engineering Department (PHED) / Water Works Division",
        stakeholderRecs: {
          university: "Pipeline pressure modeling and hydraulic flow diagnostics",
          industry: "High-density polyethylene (HDPE) replacement pipes & acoustic leak detectors",
          community: "Local water conservation and valve closure assistance"
        },
        detailsTemplate: (_desc, loc) => [
          "Physical water infrastructure rupture resulting in precious resource loss",
          `Distribution network zone: ${loc}`,
          "Direct risk of low water pressure and secondary cross-contamination",
          "Emergency maintenance pipeline squad dispatch recommended"
        ],
      },
      {
        name: "Groundwater & Handpump Malfunction",
        keywords: [
          "handpump", "hand pump", "borewell", "tube well", "tubewell", "groundwater", "pump broken",
          "dry well", "water table", "handle broken"
        ],
        defaultPriority: "Medium",
        priorityScore: 62,
        departmentKeywords: ["rural water", "phed", "panchayati", "groundwater", "drinking water", "water"],
        departmentFallback: "Groundwater Directorate / PHED Rural Water Division",
        stakeholderRecs: {
          university: "Hydrogeological water table mapping and borehole yield testing",
          industry: "Solar-powered submersible pump sets and corrosion-resistant riser pipes",
          community: "Panchayat water user committee maintenance verification"
        },
        detailsTemplate: (_desc, loc) => [
          "Rural or community handpump / groundwater extraction asset failure",
          `Locality access point: ${loc}`,
          "Impacts non-piped community drinking water access",
          "Mechanical overhaul and spare parts replacement needed"
        ],
      },
      {
        name: "Drinking Water Scarcity & Tanker Request",
        keywords: [
          "scarcity", "shortage", "tanker", "no water for days", "drought", "dried up",
          "severe crisis", "rationing", "depleted"
        ],
        defaultPriority: "High",
        priorityScore: 82,
        departmentKeywords: ["water supply", "municipal corporation", "district administration", "phed", "water"],
        departmentFallback: "District Water Supply Cell & Municipal Corporation",
        stakeholderRecs: {
          university: "Demand-supply gap analysis and rainwater harvesting blueprint",
          industry: "Mobile water tanker fleet logistics and IoT water dispensing kiosks",
          community: "Equitable community queue management and distribution tracking"
        },
        detailsTemplate: (_desc, loc) => [
          "Acute potable water deficit impacting household sustainability",
          `Affected sector: ${loc}`,
          "Emergency water tanker routing and contingency supply required",
          "Long-term distribution capacity review recommended"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Sanitation",
    classifiedDomain: "Sanitation & Solid Waste Management",
    aliases: ["Sanitation", "Waste Management", "Sanitation & Waste", "Solid Waste"],
    defaultDepartment: "Municipal Solid Waste & Sanitation Department",
    subcategories: [
      {
        name: "Sewage & Drainage Overflow",
        keywords: [
          "sewer", "drain", "drainage", "overflow", "manhole", "gutter", "clogged drain",
          "black water", "choked", "stagnant", "flooding drain"
        ],
        defaultPriority: "High",
        priorityScore: 84,
        departmentKeywords: ["sanitation", "drainage", "sewerage", "municipal corporation", "ulb", "solid waste"],
        departmentFallback: "Urban Local Body (ULB) Drainage & Sewerage Division",
        stakeholderRecs: {
          university: "Urban drainage gradient modeling and wastewater pathogen analysis",
          industry: "Mechanized super-sucker de-silting machines and trenchless pipe liners",
          community: "Solid waste blockage prevention and drain cover surveillance"
        },
        detailsTemplate: (_desc, loc) => [
          "Open sewage overflow posing direct environmental and disease vector hazard",
          `Drainage corridor: ${loc}`,
          "High risk of vector-borne illnesses (dengue, malaria, typhoid)",
          "Super-sucker desilting unit and sanitary barrier deployment recommended"
        ],
      },
      {
        name: "Solid Waste & Garbage Accumulation",
        keywords: [
          "garbage", "trash", "waste", "dump", "dumping", "rubbish", "litter", "foul smell",
          "heap", "cleaning", "bin full", "uncollected"
        ],
        defaultPriority: "Medium",
        priorityScore: 60,
        departmentKeywords: ["solid waste", "sanitation", "municipal corporation", "waste management"],
        departmentFallback: "Municipal Solid Waste Management Directorate",
        stakeholderRecs: {
          university: "Waste characterization study and decentralized composting design",
          industry: "Compactor trucks, RFID smart dustbins, and recycling converters",
          community: "Source segregation awareness and neighborhood clean-up drives"
        },
        detailsTemplate: (_desc, loc) => [
          "Uncollected solid waste mass accumulating in public vicinity",
          `Zone / Ward: ${loc}`,
          "Public nuisance and localized hygiene deterioration",
          "Scheduled sanitary tipper and mechanized lifting dispatch recommended"
        ],
      },
      {
        name: "Public Sanitation Facility Defect",
        keywords: [
          "toilet", "public toilet", "urinal", "community toilet", "no water in toilet",
          "broken door", "dirty toilet", "washroom"
        ],
        defaultPriority: "Medium",
        priorityScore: 55,
        departmentKeywords: ["sanitation", "swachh bharat", "municipal", "ulb"],
        departmentFallback: "Urban Local Body (ULB) Public Amenities Cell",
        stakeholderRecs: {
          university: "Public amenity usage optimization and sanitary greywater recycling",
          industry: "Pre-fabricated modular toilets and touchless sanitary fixtures",
          community: "Community caretaker oversight and cleanliness feedback audits"
        },
        detailsTemplate: (_desc, loc) => [
          "Public convenience infrastructure maintenance deficit",
          `Facility location: ${loc}`,
          "Impacts daily commuter and community hygiene access",
          "Deep sanitation washdown and plumbing maintenance required"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Roads & Infrastructure",
    classifiedDomain: "Roads & Transportation Infrastructure",
    aliases: ["Roads & Infrastructure", "Roads", "Urban Infrastructure", "Infrastructure", "Road Infrastructure"],
    defaultDepartment: "Roads & Infrastructure",
    subcategories: [
      {
        name: "Potholes & Road Surface Degradation",
        keywords: [
          "pothole", "broken road", "damaged road", "crater", "asphalt", "tar", "bumpy",
          "accident prone", "skidding", "uneven road", "patchwork", "large pothole", "main road"
        ],
        defaultPriority: "High",
        priorityScore: 82,
        departmentKeywords: ["roads & infrastructure", "roads", "pwd", "public works", "infrastructure", "municipal engineering", "engineering"],
        departmentFallback: "Roads & Infrastructure",
        stakeholderRecs: {
          university: "Civil engineering faculty pavement stress analysis & cold-mix bitumen formulation",
          industry: "Mechanized jet-patcher equipment & rapid-setting polymer asphalt compounds",
          community: "Immediate hazard demarcation, caution signage and repair verification"
        },
        detailsTemplate: (_desc, loc) => [
          "Carriageway surface disintegration creating direct vehicular & two-wheeler hazard",
          `Road stretch & jurisdiction: ${loc}`,
          "Elevated risk of accidents, traffic congestion, and vehicle suspension damage",
          "Bitumen patch repair and roller compaction work order recommended"
        ],
      },
      {
        name: "Bridge & Structural Failure",
        keywords: [
          "bridge", "culvert", "crack", "collapse", "cave-in", "caving", "sinkhole",
          "structural damage", "pillar", "flyover crack"
        ],
        defaultPriority: "Critical",
        priorityScore: 95,
        departmentKeywords: ["pwd", "bridges", "highways", "infrastructure", "engineering", "roads & infrastructure"],
        departmentFallback: "Public Works Department (Bridges & Structural Safety Wing)",
        stakeholderRecs: {
          university: "Non-destructive ultrasonic structural testing and seismic load verification",
          industry: "Carbon fiber wrapping, micro-concrete grouting and heavy shoring systems",
          community: "Traffic diversion compliance and pedestrian safety corridor adherence"
        },
        detailsTemplate: (_desc, loc) => [
          "CRITICAL STRUCTURAL HAZARD: Compromised bridge or arterial thoroughfare integrity",
          `Structural location: ${loc}`,
          "Catastrophic failure and severe public safety risk",
          "Immediate traffic cordon and structural engineering audit required"
        ],
      },
      {
        name: "Roadway Waterlogging & Underpass Flooding",
        keywords: [
          "waterlog", "water log", "flooded road", "underpass flood", "submerged",
          "rain water stuck", "no runoff"
        ],
        defaultPriority: "High",
        priorityScore: 76,
        departmentKeywords: ["storm water", "pwd", "municipal", "drainage", "roads & infrastructure"],
        departmentFallback: "Municipal Stormwater Drainage & PWD Urban Division",
        stakeholderRecs: {
          university: "Surface runoff hydrological calculations and storm drainage retrofitting",
          industry: "High-discharge submersible dewatering pump sets and non-clog impellers",
          community: "Real-time flood depth warning dissemination for local commuters"
        },
        detailsTemplate: (_desc, loc) => [
          "Severe surface runoff obstruction causing roadway inundation",
          `Flood zone: ${loc}`,
          "Impedes vehicular movement and emergency vehicle access",
          "High-capacity diesel pump deployment and drain clearance recommended"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Electricity & Energy",
    classifiedDomain: "Electricity & Power Distribution",
    aliases: ["Electricity & Energy", "Electricity", "Power", "Public Services"],
    defaultDepartment: "State Electricity Distribution Corporation (DISCOM)",
    subcategories: [
      {
        name: "Exposed Live Electrical Infrastructure",
        keywords: [
          "live wire", "hanging wire", "spark", "sparking", "transformer burst", "shock",
          "electric shock", "naked wire", "short circuit", "cable on ground", "fire hazard"
        ],
        defaultPriority: "Critical",
        priorityScore: 96,
        departmentKeywords: ["electricity", "power", "discom", "energy", "electrical inspectorate"],
        departmentFallback: "State Electricity Distribution Corporation (DISCOM Emergency Wing)",
        stakeholderRecs: {
          university: "Arc flash risk assessment and thermal imaging insulation diagnostics",
          industry: "Insulated aerial bundled cables (ABC) and auto-reclosing circuit breakers",
          community: "Immediate safety perimeter cordon and public awareness announcements"
        },
        detailsTemplate: (_desc, loc) => [
          "CRITICAL LIFE SAFETY EMERGENCY: Uninsulated high-voltage or low-voltage electrical exposure",
          `Grid zone: ${loc}`,
          "Direct risk of fatal electrocution and electrical fire ignition",
          "Immediate feeder tripping and emergency line-maintenance crew dispatch required"
        ],
      },
      {
        name: "Streetlight Outage & Public Safety",
        keywords: [
          "streetlight", "street light", "dark street", "light broken", "bulb fused",
          "no light", "pole light", "dark area", "lamp"
        ],
        defaultPriority: "Medium",
        priorityScore: 50,
        departmentKeywords: ["street lighting", "electrical", "municipal corporation", "ulb"],
        departmentFallback: "Municipal Corporation Electrical & Public Lighting Wing",
        stakeholderRecs: {
          university: "Solar LED lighting deployment mapping and lux level calculations",
          industry: "Smart IoT street lighting controllers and energy-efficient LED luminaires",
          community: "Night-time safety patrol verification and streetlight fault reporting"
        },
        detailsTemplate: (_desc, loc) => [
          "Public thoroughfare illumination failure creating safety vulnerability",
          `Corridor: ${loc}`,
          "Impairs night-time pedestrian safety and surveillance visibility",
          "LED luminaire replacement and timer-switch audit recommended"
        ],
      },
      {
        name: "Power Supply Disruption & Grid Outage",
        keywords: [
          "power cut", "load shedding", "blackout", "no current", "tripping", "low voltage",
          "phase failure", "voltage fluctuation"
        ],
        defaultPriority: "High",
        priorityScore: 72,
        departmentKeywords: ["electricity", "discom", "substation", "power supply"],
        departmentFallback: "DISCOM Sub-Divisional Officer (SDO) Operations",
        stakeholderRecs: {
          university: "Distribution transformer health monitoring and microgrid integration",
          industry: "Automatic voltage regulators (AVR) and smart meter telemetry modules",
          community: "Community power conservation and sensitive equipment protection"
        },
        detailsTemplate: (_desc, loc) => [
          "Widespread electrical distribution feeder disruption",
          `Substation sector: ${loc}`,
          "Affects residential, commercial and essential civic appliances",
          "Feeder load balance and transformer health inspection needed"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Healthcare",
    classifiedDomain: "Public Health & Medical Services",
    aliases: ["Healthcare", "Health", "Medical", "Public Health"],
    defaultDepartment: "Public Health & Sanitation",
    subcategories: [
      {
        name: "Epidemic / Disease Outbreak Signal",
        keywords: [
          "outbreak", "fever", "dengue", "malaria", "cholera", "diarrhea", "vomiting",
          "infection", "hospitalized", "epidemic", "poisoning", "many sick"
        ],
        defaultPriority: "Critical",
        priorityScore: 94,
        departmentKeywords: ["health", "public health", "family welfare", "epidemiology", "cmo", "sanitation"],
        departmentFallback: "District Chief Medical Officer (CMO) & Public Health Directorate",
        stakeholderRecs: {
          university: "Epidemiological contact tracing, sero-surveys and disease clustering models",
          industry: "Rapid diagnostic test kits, oral rehydration solutions & vector fogging machines",
          community: "Symptom reporting watch, boiling water advisory and community health camps"
        },
        detailsTemplate: (_desc, loc) => [
          "CRITICAL PUBLIC HEALTH SIGNAL: Cluster of acute symptomatic illnesses",
          `Epidemiological surveillance zone: ${loc}`,
          "Potential localized water-borne or vector-borne disease transmission",
          "Immediate medical team mobilization, epidemiology survey and drug distribution"
        ],
      },
      {
        name: "PHC Staffing & Essential Medicine Shortage",
        keywords: [
          "hospital closed", "clinic", "phc", "no doctor", "doctor absent", "no medicine",
          "anti venom", "bandage", "nurse", "chc", "sub center"
        ],
        defaultPriority: "High",
        priorityScore: 79,
        departmentKeywords: ["health", "phc", "medical services", "family welfare", "public health"],
        departmentFallback: "District Health Society / Block Medical Officer of Health (BMOH)",
        stakeholderRecs: {
          university: "Tele-medicine consultations and medical intern rotation support",
          industry: "Cold-chain vaccine refrigerators and essential generic drug supplies",
          community: "Rogi Kalyan Samiti oversight and healthcare grievance tracking"
        },
        detailsTemplate: (_desc, loc) => [
          "Primary health care delivery deficit at grassroots facility",
          `Health facility: ${loc}`,
          "Deprives vulnerable rural / urban population of emergency medical care",
          "Emergency stock replenishment and medical officer deputation required"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Education",
    classifiedDomain: "Education & School Infrastructure",
    aliases: ["Education", "Schools", "School Education"],
    defaultDepartment: "Education",
    subcategories: [
      {
        name: "School Structural & Safety Hazard",
        keywords: [
          "school roof", "ceiling falling", "broken classroom", "school wall", "unsafe school",
          "building crack", "boundary wall broken", "dilapidated"
        ],
        defaultPriority: "High",
        priorityScore: 86,
        departmentKeywords: ["school education", "samagra shiksha", "education", "infrastructure"],
        departmentFallback: "District Education Office (DEO) & Samagra Shiksha Engineering Wing",
        stakeholderRecs: {
          university: "Building safety structural audit and child-friendly acoustic architecture",
          industry: "Modular prefabricated classrooms and weather-resistant roofing sheets",
          community: "School Management Committee (SMC) safety vigilance and parent meetings"
        },
        detailsTemplate: (_desc, loc) => [
          "High child-safety risk in educational facility infrastructure",
          `School campus: ${loc}`,
          "Threatens student physical safety during instructional hours",
          "Immediate structural safety cordon and urgent classroom renovation recommended"
        ],
      },
      {
        name: "School Basic Amenities Deficit",
        keywords: [
          "school toilet", "school drinking water", "mid day meal", "meal quality", "no desk",
          "blackboard", "electricity in school"
        ],
        defaultPriority: "Medium",
        priorityScore: 68,
        departmentKeywords: ["education", "school literacy", "samagra shiksha"],
        departmentFallback: "District School Education Directorate",
        stakeholderRecs: {
          university: "WASH-in-Schools curriculum design and nutritional calorie evaluation",
          industry: "Water purifiers, gender-segregated bio-toilets and dual desks",
          community: "Mid-day meal quality checks and student attendance tracking"
        },
        detailsTemplate: (_desc, loc) => [
          "Essential WASH or nutritional amenity deficiency in academic institution",
          `Institution: ${loc}`,
          "Directly impedes student retention, hygiene and learning environment",
          "Sanitation restoration and mid-day meal inspection audit recommended"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Environment",
    classifiedDomain: "Environmental Protection & Pollution Control",
    aliases: ["Environment", "Pollution", "Forest & Environment"],
    defaultDepartment: "Environment",
    subcategories: [
      {
        name: "Industrial Effluent & Chemical Discharge",
        keywords: [
          "factory waste", "chemical", "effluent", "river pollution", "lake pollution",
          "toxic smoke", "industrial smoke", "poisoning fish", "polluted stream"
        ],
        defaultPriority: "High",
        priorityScore: 89,
        departmentKeywords: ["pollution control", "spcb", "environment", "forest", "industrial"],
        departmentFallback: "State Pollution Control Board (Regional Vigilance Office)",
        stakeholderRecs: {
          university: "Heavy metal toxicity testing, gas chromatography & environmental forensics",
          industry: "Effluent treatment plant (ETP) upgrades and continuous emission sensors",
          community: "Citizen water sampling networks and pollution complaint filing"
        },
        detailsTemplate: (_desc, loc) => [
          "Untreated toxic industrial or commercial discharge into natural ecosystem",
          `Catchment area: ${loc}`,
          "Bio-accumulation risk and environmental degradation",
          "Immediate pollution monitoring squad inspection and effluent sampling order"
        ],
      },
      {
        name: "Open Garbage Burning & Air Quality Hazard",
        keywords: [
          "burning garbage", "plastic burning", "smoke", "smog", "air pollution",
          "suffocating", "open fire", "leaf burning"
        ],
        defaultPriority: "Medium",
        priorityScore: 66,
        departmentKeywords: ["pollution", "municipal", "environment", "fire"],
        departmentFallback: "Municipal Environmental Vigilance Cell & SPCB",
        stakeholderRecs: {
          university: "Particulate matter (PM2.5 / PM10) dispersion modeling and air sensor calibration",
          industry: "Bio-mass shredders and clean briquetting alternative technology",
          community: "Zero-burning neighborhood pledge and volunteer fire patrols"
        },
        detailsTemplate: (_desc, loc) => [
          "Open combustion of synthetic or municipal waste releasing toxic emissions",
          `Vicinity: ${loc}`,
          "Severe localized respiratory hazard and particulate matter spike",
          "Municipal enforcement squad dousing and penalty notice protocol"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Agriculture",
    classifiedDomain: "Agriculture, Irrigation & Rural Development",
    aliases: ["Agriculture", "Rural Livelihoods", "Irrigation", "Farming"],
    defaultDepartment: "Department of Agriculture & Farmers' Welfare",
    subcategories: [
      {
        name: "Irrigation Canal Breach & Water Supply Deficit",
        keywords: [
          "canal", "irrigation", "field water", "crop drying", "canal broken", "dam gate",
          "check dam", "canal breach", "no water for farming"
        ],
        defaultPriority: "High",
        priorityScore: 80,
        departmentKeywords: ["irrigation", "agriculture", "water resources", "rural development"],
        departmentFallback: "Minor Irrigation Directorate / Water Resources Department",
        stakeholderRecs: {
          university: "Geotextile lining design and canal flow velocity optimization",
          industry: "Drip irrigation kits, geomembrane sheets and automated sluice gates",
          community: "Water users association canal patrolling and rotational supply rosters"
        },
        detailsTemplate: (_desc, loc) => [
          "Critical irrigation infrastructure failure during key crop cycle",
          `Command area: ${loc}`,
          "Threatens agricultural output and smallholder farmer livelihood",
          "Urgent canal breach masonry reinforcement and water scheduling"
        ],
      },
      {
        name: "Pest Infestation & Crop Hazard",
        keywords: [
          "pest", "locust", "crop disease", "insects", "fungus", "crop damage",
          "fertilizer shortage", "fake seeds"
        ],
        defaultPriority: "High",
        priorityScore: 75,
        departmentKeywords: ["agriculture", "krishi", "farmers welfare", "kvk"],
        departmentFallback: "District Agriculture Office & Krishi Vigyan Kendra (KVK)",
        stakeholderRecs: {
          university: "Agronomic pest identification and biological biocontrol agent preparation",
          industry: "Drone-based targeted bio-pesticide spraying and certified seed supply",
          community: "Farmer field schools and integrated pest management (IPM) alerts"
        },
        detailsTemplate: (_desc, loc) => [
          "Biological or agricultural input hazard impacting standing harvest",
          `Agrarian sector: ${loc}`,
          "Risk of widespread crop failure across neighboring farm holdings",
          "KVK scientist field inspection and subsidized bio-pesticide distribution"
        ],
      },
    ],
  },
  {
    canonicalDomain: "Public Safety",
    classifiedDomain: "Public Safety & Civil Protection",
    aliases: ["Public Safety", "Accessibility", "Public Services", "Disaster Management"],
    defaultDepartment: "Disaster Management",
    subcategories: [
      {
        name: "Hazardous Open Pit / Borewell",
        keywords: [
          "open borewell", "open pit", "uncovered hole", "excavation", "trench open",
          "trap", "falling risk"
        ],
        defaultPriority: "Critical",
        priorityScore: 97,
        departmentKeywords: ["disaster management", "police", "district administration", "ulb", "public works"],
        departmentFallback: "District Disaster Management Cell & Municipal Enforcement",
        stakeholderRecs: {
          university: "Robotic rescue mechanism development and geotechnical soil stabilization",
          industry: "High-grade steel borewell safety caps and tamper-proof safety seals",
          community: "Immediate safety perimeter cordon and village warning vigil"
        },
        detailsTemplate: (_desc, loc) => [
          "CRITICAL CHILD & PEDESTRIAN LIFE HAZARD: Uncapped deep cavity in public territory",
          `Hazard zone: ${loc}`,
          "Immediate fatal falling risk under Supreme Court borewell safety directives",
          "Immediate physical barricading, steel capping and police verification required"
        ],
      },
      {
        name: "Public Accessibility & Barrier Issue",
        keywords: [
          "wheelchair", "ramp", "disabled", "accessibility", "divyang", "blind",
          "tactile", "footpath blocked"
        ],
        defaultPriority: "Medium",
        priorityScore: 58,
        departmentKeywords: ["social welfare", "pwd", "accessibility", "ulb", "roads & infrastructure"],
        departmentFallback: "Department of Social Welfare & Empowerment / PWD Accessibility Wing",
        stakeholderRecs: {
          university: "Universal design barrier-free compliance audit and assistive tactile modeling",
          industry: "Modular aluminum accessibility ramps and tactile paving tiles",
          community: "Accessibility advocacy and disabled community spot checks"
        },
        detailsTemplate: (_desc, loc) => [
          "Universal public access barrier violating accessible infrastructure standards",
          `Public facility: ${loc}`,
          "Restricts mobility-impaired citizens from accessing essential services",
          "Ramp gradient correction and barrier removal order recommended"
        ],
      },
    ],
  },
];

export interface CivicProblemInput {
  domain?: string | undefined;
  title: string;
  description: string;
  district?: string | undefined;
  block?: string | undefined;
  locality?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  affectedPopulation?: number | null | undefined;
  supportingInfo?: string | undefined;
  challengePublicId?: string | undefined;
  imageDataUrls?: string[] | undefined;
}

/**
 * Extracts specific ward, zone, sector or locality references from natural text.
 */
export function extractWardOrJurisdiction(text: string): string | null {
  if (!text) return null;
  // Match patterns like "Ward 20", "Ward No. 15", "Ward 15-25", "Zone 3", "Sector 4", etc.
  const wardMatch = text.match(/\b(ward(?:\s*no\.?|\s+)?\s*\d+(?:\s*[-–]\s*\d+)?)\b/i);
  if (wardMatch && wardMatch[1]) return wardMatch[1].replace(/\s+/g, " ").trim();

  const zoneMatch = text.match(/\b(zone\s*\d+|sector\s*\d+|block\s*[a-zA-Z0-9]+)\b/i);
  if (zoneMatch && zoneMatch[1]) return zoneMatch[1].replace(/\s+/g, " ").trim();

  return null;
}

/**
 * Checks if a specific ward (e.g. "Ward 20") falls within a jurisdiction range (e.g. "Ward 15–25" or "Ward 20").
 */
function isJurisdictionEncompassing(officialJurisdiction: string, targetJurisdiction: string): boolean {
  if (!officialJurisdiction || !targetJurisdiction) return false;
  const offClean = officialJurisdiction.toLowerCase().trim();
  const tarClean = targetJurisdiction.toLowerCase().trim();

  if (offClean.includes(tarClean) || tarClean.includes(offClean)) return true;

  // Extract numbers
  const tarNumMatch = tarClean.match(/\b(\d+)\b/);
  const offRangeMatch = offClean.match(/(\d+)\s*[-–]\s*(\d+)/);

  if (tarNumMatch?.[1] && offRangeMatch?.[1] && offRangeMatch?.[2]) {
    const tarNum = parseInt(tarNumMatch[1], 10);
    const startNum = parseInt(offRangeMatch[1], 10);
    const endNum = parseInt(offRangeMatch[2], 10);
    if (!isNaN(tarNum) && !isNaN(startNum) && !isNaN(endNum)) {
      return tarNum >= Math.min(startNum, endNum) && tarNum <= Math.max(startNum, endNum);
    }
  }

  return false;
}

/**
 * Parses line department and authority designations from organization capabilities and profile.
 */
export function parseLineDepartmentAndAuthority(
  capabilities: string[] = [],
  orgName: string = "",
  expertise: string[] = []
): { lineDepartment: string | null; authority: string | null } {
  let lineDepartment: string | null = null;
  let authority: string | null = null;

  for (const cap of capabilities) {
    if (typeof cap === "string") {
      const lineMatch = cap.match(/line\s*department\s*:\s*(.+)/i);
      if (lineMatch && lineMatch[1]) {
        lineDepartment = lineMatch[1].trim();
      }
      const authMatch = cap.match(/authority\s*:\s*(.+)/i);
      if (authMatch && authMatch[1]) {
        authority = authMatch[1].trim();
      }
    }
  }

  // If not explicitly formatted with prefix, look for line department / division designation
  if (!lineDepartment) {
    const divCap = capabilities.find(
      (c) => typeof c === "string" && /division|wing|directorate|mission|engineer|health|works/i.test(c) && !/jurisdiction|id:/i.test(c)
    );
    if (divCap) {
      lineDepartment = divCap.trim();
    } else {
      const primaryExp = expertise.find((e) => typeof e === "string" && !/ulb|pri|government/i.test(e));
      lineDepartment = primaryExp ? `${orgName} (${primaryExp})` : orgName;
    }
  }

  // If authority not explicitly present, deduce from organizational form
  if (!authority) {
    const nameLower = orgName.toLowerCase();
    if (nameLower.includes("corporation") || nameLower.includes("ulb") || nameLower.includes("municip") || nameLower.includes("mcd")) {
      authority = "Urban Local Body (ULB)";
    } else if (nameLower.includes("panchayat") || nameLower.includes("zilla") || nameLower.includes("pri") || nameLower.includes("rural")) {
      authority = "Panchayati Raj Institution (PRI)";
    } else if (nameLower.includes("pollution control") || nameLower.includes("spcb")) {
      authority = "State Pollution Control Board";
    } else if (nameLower.includes("disaster") || nameLower.includes("ddma")) {
      authority = "State Disaster Management Authority (SDMA)";
    } else if (nameLower.includes("power") || nameLower.includes("electricity") || nameLower.includes("discom")) {
      authority = "DISCOM / State Electricity Board";
    } else {
      authority = "District Administration / Competent State Authority";
    }
  }

  return { lineDepartment, authority };
}

/**
 * Fetches all currently active registered government organizations directly from the database.
 * Deactivated departments (account_status = 'Inactive' or 'Suspended') are strictly excluded.
 * Newly registered departments become immediately available.
 */
export async function fetchActiveGovernmentDepartments(): Promise<ActiveGovernmentDepartment[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("organization_accounts")
      .select("id, owner_id, name, organization_type, district, locality, contact_name, contact_email, expertise, capabilities, account_status")
      .eq("organization_type", "Government")
      .limit(100);

    if (error || !data) {
      console.warn("Could not fetch active government departments from DB:", error);
      return [];
    }

    // Strictly filter out inactive or suspended accounts
    const activeList = data.filter(
      (org) => org.account_status !== "Inactive" && org.account_status !== "Suspended"
    );

    return activeList.map((org) => {
      const capabilities = Array.isArray(org.capabilities) ? org.capabilities : [];
      const expertise = Array.isArray(org.expertise) ? org.expertise : [];
      const { lineDepartment, authority } = parseLineDepartmentAndAuthority(capabilities, org.name, expertise);

      return {
        id: org.id,
        ownerId: org.owner_id,
        name: org.name,
        organizationType: org.organization_type || "Government",
        district: org.district,
        locality: org.locality,
        expertise,
        capabilities,
        accountStatus: org.account_status || "Active",
        lineDepartment,
        authority,
        contactName: org.contact_name,
        contactEmail: org.contact_email,
      };
    });
  } catch (err) {
    console.warn("fetchActiveGovernmentDepartments failed:", err);
    return [];
  }
}

/**
 * Dynamically queries the existing database for registered government organizations
 * and departments covering the problem's jurisdiction and department responsibility.
 */
export async function matchRegisteredGovernmentDepartment(
  classifiedDomain: string,
  specificIssue: string,
  locationText: string,
  district?: string,
  departmentFallback = "Roads & Infrastructure",
  subcatStakeholderRecs?: { university: string; industry: string; community: string },
): Promise<MatchedDepartment> {
  const defaultRecs = subcatStakeholderRecs || {
    university: "Technical solution design and laboratory safety analysis",
    industry: "Rapid equipment deployment and technology provider support",
    community: "Local community oversight, progress verification and feedback monitoring",
  };

  const isRural = (locationText + (district || "")).toLowerCase().includes("panchayat") ||
    (locationText + (district || "")).toLowerCase().includes("village") ||
    (locationText + (district || "")).toLowerCase().includes("gram");

  const fallbackOrgType = isRural ? "Panchayati Raj Institution (PRI)" : "Urban Local Body (ULB)";
  const fallbackOrgName = district && district.toLowerCase() !== "gps-detected location"
    ? `${district} ${isRural ? "Zilla Parishad" : "Municipal Corporation"}`
    : "Greater Visakhapatnam Municipal Corporation (GVMC)";

  try {
    const activeOrgs = await fetchActiveGovernmentDepartments();

    if (activeOrgs.length === 0) {
      const { lineDepartment, authority } = parseLineDepartmentAndAuthority([], fallbackOrgName, [departmentFallback]);
      return {
        name: fallbackOrgName,
        department: departmentFallback,
        lineDepartment: lineDepartment || departmentFallback,
        authority: authority || fallbackOrgType,
        organizationType: fallbackOrgType,
        routedTo: `${fallbackOrgName} — ${departmentFallback} (${locationText})`,
        jurisdiction: locationText,
        isLiveDbMatch: false,
        stakeholderRecommendations: defaultRecs,
      };
    }

    // Score registered organizations based on:
    // 1. Exact Department / Sector match in expertise or name
    // 2. Domain-specific keywords & subcategory alignment
    // 3. Jurisdiction match (ward range, locality, district)
    // 4. Urban vs Rural alignment
    let bestOrg: ActiveGovernmentDepartment | null = null;
    let bestScore = -1;

    for (const org of activeOrgs) {
      let score = 0;
      const orgName = (org.name || "").toLowerCase();
      const orgDistrict = (org.district || "").toLowerCase();
      const orgLocality = (org.locality || "").toLowerCase();
      const orgExpertise = (org.expertise || []).map((e: string) => String(e).toLowerCase());
      const orgCapabilities = (org.capabilities || []).map((c: string) => String(c).toLowerCase());
      const combinedOrgText = `${orgName} ${orgDistrict} ${orgLocality} ${orgExpertise.join(" ")} ${orgCapabilities.join(" ")} ${org.lineDepartment || ""} ${org.authority || ""}`.toLowerCase();

      // 1. Department / Sector Match in expertise
      if (orgExpertise.some((e: string) => e.includes(departmentFallback.toLowerCase()) || departmentFallback.toLowerCase().includes(e))) {
        score += 50;
      }
      if (orgName.includes(departmentFallback.toLowerCase())) {
        score += 35;
      }

      // Specific domain keywords
      const domainLower = classifiedDomain.toLowerCase();
      if (domainLower.includes("water")) {
        if (combinedOrgText.includes("water") || combinedOrgText.includes("phed") || combinedOrgText.includes("drinking water") || combinedOrgText.includes("jal jeevan")) score += 45;
        if (combinedOrgText.includes("handpump") || combinedOrgText.includes("borewell") || combinedOrgText.includes("rural water")) {
          if (specificIssue.toLowerCase().includes("handpump") || specificIssue.toLowerCase().includes("borewell") || isRural) score += 30;
        }
      } else if (domainLower.includes("sanitation") || domainLower.includes("waste")) {
        if (combinedOrgText.includes("sanitation") || combinedOrgText.includes("solid waste") || combinedOrgText.includes("drainage") || combinedOrgText.includes("cleaning")) score += 45;
      } else if (domainLower.includes("road") || domainLower.includes("infrastructure") || domainLower.includes("transport")) {
        if (combinedOrgText.includes("road") || combinedOrgText.includes("infrastructure") || combinedOrgText.includes("pwd") || combinedOrgText.includes("highways")) score += 45;
      } else if (domainLower.includes("electric") || domainLower.includes("energy") || domainLower.includes("power")) {
        if (combinedOrgText.includes("electric") || combinedOrgText.includes("power") || combinedOrgText.includes("discom") || combinedOrgText.includes("energy")) score += 45;
      } else if (domainLower.includes("health") || domainLower.includes("medical")) {
        if (combinedOrgText.includes("health") || combinedOrgText.includes("medical") || combinedOrgText.includes("family welfare") || combinedOrgText.includes("hospital")) score += 45;
      } else if (domainLower.includes("education") || domainLower.includes("school")) {
        if (combinedOrgText.includes("education") || combinedOrgText.includes("school") || combinedOrgText.includes("shiksha")) score += 45;
      } else if (domainLower.includes("environment") || domainLower.includes("pollution")) {
        if (combinedOrgText.includes("environment") || combinedOrgText.includes("pollution") || combinedOrgText.includes("spcb") || combinedOrgText.includes("forest")) score += 45;
      } else if (domainLower.includes("disaster") || domainLower.includes("safety")) {
        if (combinedOrgText.includes("disaster") || combinedOrgText.includes("ddma") || combinedOrgText.includes("relief") || combinedOrgText.includes("revenue")) score += 45;
      }

      // 2. Jurisdiction / Ward match
      if (isJurisdictionEncompassing(orgLocality, locationText) || isJurisdictionEncompassing(combinedOrgText, locationText)) {
        score += 45;
      }
      if (district && orgDistrict.includes(district.toLowerCase())) {
        score += 30;
      }

      // 3. Rural vs Urban governance alignment
      if (isRural && (combinedOrgText.includes("rural") || combinedOrgText.includes("panchayat") || combinedOrgText.includes("pri"))) {
        score += 25;
      } else if (!isRural && (combinedOrgText.includes("ulb") || combinedOrgText.includes("municipal") || combinedOrgText.includes("urban"))) {
        score += 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestOrg = org;
      }
    }

    if (bestOrg && bestScore >= 30) {
      const orgCategory = (bestOrg.expertise || []).find((e: string) => e.includes("ULB") || e.includes("PRI") || e.includes("Government")) ||
        (bestOrg.name.includes("Corporation") ? "Urban Local Body (ULB)" : bestOrg.name.includes("Parishad") || bestOrg.name.includes("Panchayat") ? "Panchayati Raj Institution (PRI)" : "Government Department");

      const deptName = (bestOrg.expertise || []).find((e: string) => !e.includes("ULB") && !e.includes("PRI") && !e.includes("Government")) || bestOrg.lineDepartment || departmentFallback;

      return {
        name: bestOrg.name,
        department: deptName || departmentFallback,
        lineDepartment: bestOrg.lineDepartment || deptName || departmentFallback,
        authority: bestOrg.authority || orgCategory,
        organizationType: orgCategory || fallbackOrgType,
        contactName: bestOrg.contactName,
        contactEmail: bestOrg.contactEmail,
        userId: bestOrg.ownerId,
        orgId: bestOrg.id,
        jurisdiction: bestOrg.locality || locationText,
        routedTo: `${bestOrg.name} — ${bestOrg.lineDepartment ? bestOrg.lineDepartment + ' / ' : ''}${deptName || departmentFallback} (${locationText})`,
        isLiveDbMatch: true,
        stakeholderRecommendations: defaultRecs,
      };
    }

    const { lineDepartment: fbLine, authority: fbAuth } = parseLineDepartmentAndAuthority([], fallbackOrgName, [departmentFallback]);
    return {
      name: fallbackOrgName,
      department: departmentFallback,
      lineDepartment: fbLine || departmentFallback,
      authority: fbAuth || fallbackOrgType,
      organizationType: fallbackOrgType,
      routedTo: `${fallbackOrgName} — ${departmentFallback} (${locationText})`,
      jurisdiction: locationText,
      isLiveDbMatch: false,
      stakeholderRecommendations: defaultRecs,
    };
  } catch {
    const { lineDepartment: fbLine, authority: fbAuth } = parseLineDepartmentAndAuthority([], fallbackOrgName, [departmentFallback]);
    return {
      name: fallbackOrgName,
      department: departmentFallback,
      lineDepartment: fbLine || departmentFallback,
      authority: fbAuth || fallbackOrgType,
      organizationType: fallbackOrgType,
      routedTo: `${fallbackOrgName} — ${departmentFallback} (${locationText})`,
      jurisdiction: locationText,
      isLiveDbMatch: false,
      stakeholderRecommendations: defaultRecs,
    };
  }
}

/**
 * Main AI Analysis Engine.
 * Analyzes the citizen's natural language problem description,
 * determines primary category, assesses priority/severity, matches the responsible department
 * dynamically against registered active organizations in the DB, and formats the complete analysis.
 */
export async function runAIProblemAnalysis(input: CivicProblemInput): Promise<AIAnalysisResult> {
  const selectedDomainRaw = (input.domain || "").trim();

  // Extract Ward or Jurisdiction from text if present
  const extractedWard = extractWardOrJurisdiction(input.description || "") ||
    extractWardOrJurisdiction(input.title || "") ||
    extractWardOrJurisdiction(input.locality || "");

  // Format location & jurisdiction
  let jurisdiction = "Ward 20, Visakhapatnam";
  if (extractedWard) {
    jurisdiction = input.district && input.district.toLowerCase() !== "gps-detected location"
      ? `${extractedWard}, ${input.district}`
      : `${extractedWard}`;
  } else if (input.district && input.district.toLowerCase() !== "gps-detected location") {
    jurisdiction = [input.locality, input.block, input.district, "Andhra Pradesh"].filter(Boolean).join(", ");
  } else if (input.latitude != null && input.longitude != null) {
    jurisdiction = `GPS Coordinates (${input.latitude.toFixed(4)}° N, ${input.longitude.toFixed(4)}° E)`;
  } else if (input.locality) {
    jurisdiction = input.locality;
  }

  // 1. Run Real Hybrid Civic Problem Categorisation Engine
  const hybrid = await runHybridCategorization({
    title: input.title,
    description: input.description,
    citizenSelectedCategory: selectedDomainRaw || undefined,
    district: input.district,
    block: input.block,
    locality: input.locality,
    latitude: input.latitude,
    longitude: input.longitude,
    affectedPopulation: input.affectedPopulation,
    imageDataUrls: input.imageDataUrls,
    supportingInfo: input.supportingInfo,
  });

  const classifiedDomain = hybrid.primaryCategory;
  const specificIssue = hybrid.problemType;

  // 2. Separate Priority Engine Calculation (0-100)
  // Evaluates risk factors independently from categorization
  const urgencyFactor = hybrid.riskSignals.urgency;
  const healthSafetyFactor = Math.max(hybrid.riskSignals.healthRisk, hybrid.riskSignals.safetyRisk);
  const serviceFactor = hybrid.riskSignals.essentialServiceImpact;
  const populationFactor = input.affectedPopulation ? Math.min(100, Math.round(input.affectedPopulation / 5)) : 50;

  // Combined weighted priority score
  const priorityScore = Math.min(
    98,
    Math.max(
      20,
      Math.round(
        urgencyFactor * 0.35 +
        healthSafetyFactor * 0.30 +
        serviceFactor * 0.20 +
        populationFactor * 0.15
      )
    )
  );

  let priority: "Critical" | "High" | "Medium" | "Low" = "Medium";
  if (priorityScore >= 85 || healthSafetyFactor >= 90) priority = "Critical";
  else if (priorityScore >= 70) priority = "High";
  else if (priorityScore >= 45) priority = "Medium";
  else priority = "Low";

  const priorityLevel: PriorityLevel =
    priority === "Critical" ? "CRITICAL" : priority === "High" ? "HIGH" : priority === "Medium" ? "MEDIUM" : "LOW";

  // 3. Dynamic Smart Routing to Registered Government Department
  const deptMatch = await matchRegisteredGovernmentDepartment(
    classifiedDomain,
    specificIssue,
    jurisdiction,
    input.district,
    hybrid.targetDepartment,
  );

  const recommendedDepartment = deptMatch.department || hybrid.targetDepartment;
  const recommendedOrganization = deptMatch.name;
  const organizationType = deptMatch.organizationType;
  const lineDepartment = deptMatch.lineDepartment || recommendedDepartment;
  const authority = deptMatch.authority || organizationType;
  const routedTo = deptMatch.routedTo || `${recommendedOrganization} — ${lineDepartment} (${jurisdiction})`;

  // Key problem factors for explainability
  const keyDetails: string[] = [
    `Primary Category: ${classifiedDomain} (${hybrid.confidenceTier} Confidence)`,
    `Assigned Line Department: ${lineDepartment}`,
    `Competent Authority: ${authority}`,
    hybrid.explanation,
  ];

  if (hybrid.secondaryContext.length > 0) {
    keyDetails.push(`Secondary Context Detected: ${hybrid.secondaryContext.join(", ")}`);
  }
  if (hybrid.visualEvidenceSummary) {
    keyDetails.push(`Visual Evidence: ${hybrid.visualEvidenceSummary}`);
  }

  const routingRecommendation = `Direct routing recommended to ${recommendedOrganization} (Line Department: ${lineDepartment}, Authority: ${authority}) under jurisdiction ${jurisdiction}. Primary Domain: ${classifiedDomain}. Assessment: ${priority.toUpperCase()} priority (${priorityScore}/100). Model: ${hybrid.modelMetadata.modelName}.`;

  const challengeId = input.challengePublicId || `SS-${Math.floor(1000 + Math.random() * 9000)}`;

  const factors: Record<string, any> = {
    severity: healthSafetyFactor,
    urgency: urgencyFactor,
    health_safety_risk: healthSafetyFactor,
    essential_service_impact: serviceFactor,
    population_impact: populationFactor,
    confidence: hybrid.confidenceScore,
    confidence_tier: hybrid.confidenceTier,
    needs_review: hybrid.needsReview,
    ai_category: classifiedDomain,
    ai_subcategory: specificIssue,
    secondary_context: hybrid.secondaryContext,
    explanation: hybrid.explanation,
    responsible_department: recommendedDepartment,
    responsible_line_department: lineDepartment,
    responsible_authority: authority,
    responsible_organization: recommendedOrganization,
    responsible_jurisdiction: jurisdiction,
    department_type: organizationType,
    routing_status: "Recommended / Awaiting Validation",
    lifecycle_stage: "Awaiting Government Validation",
    stakeholder_recommendations: deptMatch.stakeholderRecommendations,
    routing_recommendation: routingRecommendation,
    model_name: hybrid.modelMetadata.modelName,
    inference_source: hybrid.modelMetadata.inferenceSource,
    is_fallback: hybrid.modelMetadata.isFallback,
  };

  return {
    challengeId,
    originalDomain: selectedDomainRaw || classifiedDomain,
    classifiedDomain,
    specificIssue,
    priority,
    priorityLevel,
    priorityScore,
    confidence: hybrid.confidenceScore,
    recommendedDepartment,
    recommendedOrganization,
    lineDepartment,
    authority,
    organizationType,
    routedTo,
    jurisdiction,
    assignedUserId: deptMatch.userId,
    assignedOrgId: deptMatch.orgId,
    routingStatus: "Recommended / Awaiting Validation",
    lifecycleStage: "Awaiting Government Validation",
    stakeholderRecommendations: deptMatch.stakeholderRecommendations,
    keyDetails,
    routingRecommendation,
    validationNotice: hybrid.needsReview
      ? "Low Model Confidence — Administrative Review Flagged"
      : "Hybrid Civic AI Recommendation — Requires Official Verification",
    status: "AI Analysis Complete",
    factors,
    timestamp: new Date().toISOString(),
    secondaryContext: hybrid.secondaryContext,
    confidenceTier: hybrid.confidenceTier,
    needsReview: hybrid.needsReview,
    explanation: hybrid.explanation,
    hybridResult: hybrid,
  };
}
