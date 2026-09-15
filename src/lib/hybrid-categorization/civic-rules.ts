import { APPROVED_CIVIC_CATEGORIES, CivicCategory } from "./taxonomy";

export interface CivicRuleEvaluation {
  categoryScores: Record<CivicCategory, number>;
  primaryCandidate: CivicCategory;
  primaryCandidateScore: number;
  secondaryContextCandidates: CivicCategory[];
  isEmergencyOverride: boolean;
  emergencyType: string | null;
  ruleEvidenceReasons: string[];
}

interface ContextRule {
  category: CivicCategory;
  // Patterns that define the core civic emergency or domain action
  coreTriggers: RegExp[];
  // Words that might appear incidentally as secondary context in this problem
  contextualTriggers?: RegExp[];
  // Priority boost if an acute emergency indicator is present
  emergencyPatterns?: RegExp[];
  rationale: string;
}

const CONTEXT_RULES: ContextRule[] = [
  {
    category: "Health & Medical Services",
    coreTriggers: [
      /\b(heart\s*attack|cardiac|stroke|fainted|unconscious|choking|cardiac\s*arrest)\b/i,
      /\b(ambulance|emergency\s*medical|paramedic|icu|oxygen\s*cylinder)\b/i,
      /\b(bleeding|severe\s*injury|head\s*injury|fracture|burns|snake\s*bite|poisoning)\b/i,
      /\b(hospital\s*bed|phc|chc|doctor|nurse|clinic|vaccination|medical\s*camp)\b/i,
      /\b(dengue|malaria|cholera|diarrhea\s*outbreak|food\s*poisoning|epidemic|infection\s*spread)\b/i,
    ],
    emergencyPatterns: [
      /\b(heart\s*attack|cardiac|unconscious|severe\s*injury|snake\s*bite|bleeding|poisoning|fainted)\b/i,
    ],
    contextualTriggers: [
      /\b(needs\s*medical|medical\s*help|medicine|sick|illness|fever)\b/i,
    ],
    rationale: "Acute medical condition or healthcare requirement identified as urgent civic need.",
  },
  {
    category: "Roads & Infrastructure",
    coreTriggers: [
      /\b(pothole|crater|road\s*damage|road\s*crack|broken\s*road|damaged\s*road)\b/i,
      /\b(bridge\s*damage|flyover|culvert|guardrail|road\s*divider|pavement|footpath|pedestrian\s*path)\b/i,
      /\b(asphalt|tar\s*road|concrete\s*road|speed\s*breaker|manhole\s*cover\s*broken)\b/i,
      /\b(road\s*cave-in|sinkhole\s*on\s*road|uneven\s*road\s*surface)\b/i,
    ],
    contextualTriggers: [
      /\b(on\s*the\s*road|near\s*the\s*street|roadside|highway)\b/i,
    ],
    rationale: "Road surface degradation or structural transport corridor hazard detected.",
  },
  {
    category: "Water Supply",
    coreTriggers: [
      /\b(drinking\s*water|tap\s*water|water\s*supply|piped\s*water|water\s*pipeline)\b/i,
      /\b(handpump|borewell|tube\s*well|water\s*tank|overhead\s*tank|water\s*tanker)\b/i,
      /\b(water\s*contamination|turbid\s*water|dirty\s*drinking\s*water|foul\s*water|no\s*water\s*supply|water\s*shortage)\b/i,
      /\b(pipeline\s*leak|pipeline\s*burst|water\s*meter|jal\s*jeevan)\b/i,
    ],
    contextualTriggers: [
      /\b(needs\s*water|and\s*water|drink\s*water|glass\s*of\s*water|with\s*water)\b/i,
    ],
    rationale: "Drinking water distribution failure or water contamination hazard identified.",
  },
  {
    category: "Sanitation & Waste Management",
    coreTriggers: [
      /\b(garbage\s*dump|trash|rubbish|waste\s*dumping|solid\s*waste|uncollected\s*garbage)\b/i,
      /\b(drainage\s*overflow|blocked\s*drain|clogged\s*gutter|sewer\s*overflow|open\s*sewer)\b/i,
      /\b(septic\s*tank|stagnant\s*drain\s*water|foul\s*smell\s*from\s*drain|gutter\s*water)\b/i,
      /\b(public\s*toilet|urinal|swachh|street\s*sweeping|dead\s*animal\s*carcass)\b/i,
    ],
    rationale: "Municipal solid waste accumulation or sewage drainage blockage detected.",
  },
  {
    category: "Electricity",
    coreTriggers: [
      /\b(live\s*wire|snapped\s*cable|dangling\s*wire|electric\s*shock|sparking\s*wire)\b/i,
      /\b(transformer\s*blast|transformer\s*damaged|electric\s*pole\s*bent|tilted\s*pole)\b/i,
      /\b(power\s*outage|blackout|load\s*shedding|no\s*electricity|low\s*voltage|voltage\s*fluctuation)\b/i,
      /\b(meter\s*burn|discom|substation|high\s*tension)\b/i,
    ],
    emergencyPatterns: [
      /\b(live\s*wire|electrocution|sparking\s*wire|transformer\s*blast|dangling\s*wire)\b/i,
    ],
    rationale: "Electrical distribution infrastructure fault or life-safety electrocution hazard.",
  },
  {
    category: "Education",
    coreTriggers: [
      /\b(school\s*building|classroom|blackboard|school\s*roof|school\s*wall|school\s*compound)\b/i,
      /\b(midday\s*meal|school\s*toilet|student\s*desk|school\s*drinking\s*water)\b/i,
      /\b(teacher\s*shortage|school\s*bus|anganwadi\s*education|college\s*facility|library)\b/i,
    ],
    contextualTriggers: [
      /\b(near\s*school|near\s*the\s*school|opposite\s*school|behind\s*school|school\s*children)\b/i,
    ],
    rationale: "Government educational facility infrastructure or student amenity requirement.",
  },
  {
    category: "Agriculture",
    coreTriggers: [
      /\b(irrigation\s*canal|canal\s*breach|farm\s*water|paddy\s*field|crop\s*drying)\b/i,
      /\b(pest\s*infestation|locust|crop\s*disease|standing\s*crop|fertilizer\s*shortage)\b/i,
      /\b(fake\s*seed|drip\s*irrigation|check\s*dam|harvest\s*loss|krishi)\b/i,
    ],
    rationale: "Agrarian infrastructure failure or crop protection challenge reported.",
  },
  {
    category: "Rural Development",
    coreTriggers: [
      /\b(panchayat\s*office|gram\s*sabha|mgnrega\s*work|village\s*road|rural\s*connectivity)\b/i,
      /\b(community\s*hall|rural\s*haat|village\s*pond|rural\s*culvert|panchayat\s*building)\b/i,
    ],
    rationale: "Gram Panchayat civic infrastructure or rural community asset concern.",
  },
  {
    category: "Women & Child Welfare",
    coreTriggers: [
      /\b(anganwadi|malnutrition|child\s*nutrition|pregnant\s*women|lactating\s*mother)\b/i,
      /\b(child\s*labor|child\s*marriage|child\s*safety|poshan|matru\s*vandana)\b/i,
    ],
    rationale: "Maternal-child care service or Anganwadi welfare infrastructure need.",
  },
  {
    category: "Public Safety & Security",
    coreTriggers: [
      /\b(open\s*borewell|uncapped\s*borewell|uncovered\s*pit|open\s*trench|falling\s*hazard)\b/i,
      /\b(theft|burglary|eve\s*teasing|harassment|dark\s*street|no\s*security|cctv\s*broken)\b/i,
      /\b(illegal\s*liquor|gambling|street\s*violence|police\s*patrol|unattended\s*bag)\b/i,
    ],
    emergencyPatterns: [
      /\b(open\s*borewell|uncapped\s*borewell|open\s*pit\s*trap|falling\s*hazard)\b/i,
    ],
    rationale: "Public safety risk, open hazardous cavity, or law enforcement vigilance concern.",
  },
  {
    category: "Housing & Public Facilities",
    coreTriggers: [
      /\b(pmay|public\s*housing|awad\s*yojana|community\s*park|public\s*garden)\b/i,
      /\b(crematorium|burial\s*ground|graveyard|market\s*shed|bus\s*shelter\s*shed)\b/i,
    ],
    rationale: "Public amenity shelter, housing scheme, or civic recreation ground issue.",
  },
  {
    category: "Transport",
    coreTriggers: [
      /\b(bus\s*service|bus\s*stop|bus\s*timing|cancelled\s*bus|public\s*transit)\b/i,
      /\b(traffic\s*signal\s*not\s*working|traffic\s*jam|traffic\s*sign\s*missing|shared\s*auto)\b/i,
    ],
    rationale: "Public transit schedule disruption or traffic regulation hardware fault.",
  },
  {
    category: "Environment",
    coreTriggers: [
      /\b(industrial\s*effluent|chemical\s*waste|factory\s*smoke|air\s*pollution)\b/i,
      /\b(plastic\s*burning|garbage\s*burning|toxic\s*fumes|river\s*pollution|lake\s*foam)\b/i,
      /\b(illegal\s*tree\s*cutting|deforestation|wetland\s*encroachment)\b/i,
    ],
    rationale: "Ecological degradation, air/water toxic discharge, or environmental violation.",
  },
  {
    category: "Disaster Management",
    coreTriggers: [
      /\b(flash\s*flood|river\s*flooding|inundation|waterlogging\s*homes|submerged\s*houses)\b/i,
      /\b(landslide|mudslide|hill\s*collapse|cyclone\s*damage|storm\s*surge|earthquake)\b/i,
      /\b(relief\s*camp|disaster\s*evacuation|marooned\s*village)\b/i,
    ],
    emergencyPatterns: [
      /\b(flash\s*flood|landslide|submerged\s*houses|cyclone\s*damage|marooned)\b/i,
    ],
    rationale: "Natural hazard, flash flood inundation, or disaster relief emergency.",
  },
  {
    category: "Revenue & Land",
    coreTriggers: [
      /\b(land\s*encroachment|public\s*land\s*occupied|illegal\s*construction\s*on\s*govt\s*land)\b/i,
      /\b(patta|land\s*records|khatian|mutation|survey\s*dispute|tehsildar\s*hearing)\b/i,
    ],
    rationale: "Public revenue land dispute, unauthorized encroachment, or title grievance.",
  },
  {
    category: "Social Welfare",
    coreTriggers: [
      /\b(disability\s*ramp|wheelchair\s*access|divyang\s*barrier|assistive\s*device)\b/i,
      /\b(old\s*age\s*pension|widow\s*pension|disability\s*pension|pension\s*delay)\b/i,
      /\b(ration\s*card\s*not\s*issued|pds\s*denial|tribal\s*welfare\s*scheme)\b/i,
    ],
    rationale: "Social security entitlement, pension disbursement, or accessibility barrier.",
  },
];

/**
 * Evaluates text against deterministic contextual civic rules.
 * Intelligently separates core problems from contextual mentions.
 */
export function evaluateCivicRules(
  title: string,
  description: string,
  supportingInfo?: string,
): CivicRuleEvaluation {
  const combined = `${title || ""} ${description || ""} ${supportingInfo || ""}`.trim();
  const lowerText = combined.toLowerCase();

  const categoryScores: Record<CivicCategory, number> = APPROVED_CIVIC_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = 0.05; // baseline small prior
      return acc;
    },
    {} as Record<CivicCategory, number>,
  );

  let isEmergencyOverride = false;
  let emergencyType: string | null = null;
  const ruleEvidenceReasons: string[] = [];
  const secondaryContextCandidates: CivicCategory[] = [];

  // Step 1: Check for critical acute health emergencies FIRST
  // "Heart attack", "cardiac arrest", "severe bleeding", etc. ALWAYS override contextual words like "water" or "road"
  const healthRule = CONTEXT_RULES.find((r) => r.category === "Health & Medical Services")!;
  const hasAcuteHealthEmergency = healthRule.emergencyPatterns?.some((p) => p.test(combined));

  if (hasAcuteHealthEmergency) {
    isEmergencyOverride = true;
    emergencyType = "ACUTE_MEDICAL_EMERGENCY";
    categoryScores["Health & Medical Services"] = 0.98;
    ruleEvidenceReasons.push(
      "Acute medical emergency detected in title/description (cardiac, injury, or severe health crisis). Health & Medical Services prioritized over secondary contextual words.",
    );

    // Any mention of water, road, school here is contextual!
    if (/\bwater\b/i.test(combined)) {
      secondaryContextCandidates.push("Water Supply");
      ruleEvidenceReasons.push("Mention of water is contextual assistance/hydration, not a civic water supply infrastructure defect.");
    }
    if (/\b(road|street)\b/i.test(combined)) {
      secondaryContextCandidates.push("Roads & Infrastructure");
    }
    if (/\bschool\b/i.test(combined)) {
      secondaryContextCandidates.push("Education");
    }
  }

  // Step 2: Check for other acute hazards if not already emergency
  if (!isEmergencyOverride) {
    for (const rule of CONTEXT_RULES) {
      if (rule.emergencyPatterns) {
        const hasEmergency = rule.emergencyPatterns.some((p) => p.test(combined));
        if (hasEmergency) {
          isEmergencyOverride = true;
          emergencyType = `${rule.category.toUpperCase().replace(/\s+/g, "_")}_EMERGENCY`;
          categoryScores[rule.category] = Math.max(categoryScores[rule.category], 0.92);
          ruleEvidenceReasons.push(`High-urgency hazard identified: ${rule.rationale}`);
          break;
        }
      }
    }
  }

  // Step 3: Score all rules with contextual weightings
  for (const rule of CONTEXT_RULES) {
    if (isEmergencyOverride && rule.category === "Health & Medical Services") {
      continue;
    }

    let coreMatchCount = 0;
    for (const pattern of rule.coreTriggers) {
      if (pattern.test(combined)) {
        coreMatchCount++;
      }
    }

    let contextMatchCount = 0;
    if (rule.contextualTriggers) {
      for (const pattern of rule.contextualTriggers) {
        if (pattern.test(combined)) {
          contextMatchCount++;
        }
      }
    }

    if (coreMatchCount > 0) {
      // Calculate scaled score: base 0.45 + additional matches
      const score = Math.min(0.90, 0.45 + (coreMatchCount * 0.15));
      if (isEmergencyOverride) {
        // If an acute emergency has already overridden, other core matches become secondary context
        categoryScores[rule.category] = Math.min(score, 0.40);
        if (!secondaryContextCandidates.includes(rule.category)) {
          secondaryContextCandidates.push(rule.category);
        }
      } else {
        categoryScores[rule.category] = Math.max(categoryScores[rule.category], score);
        ruleEvidenceReasons.push(`${rule.category}: ${rule.rationale} (${coreMatchCount} core pattern matches).`);
      }
    } else if (contextMatchCount > 0) {
      // It's only a contextual mention, does NOT become primary!
      categoryScores[rule.category] = Math.max(categoryScores[rule.category], 0.20);
      if (!secondaryContextCandidates.includes(rule.category)) {
        secondaryContextCandidates.push(rule.category);
      }
    }
  }

  // Find top candidate from rules
  let topCat: CivicCategory = "Roads & Infrastructure";
  let topScore = -1;

  for (const cat of APPROVED_CIVIC_CATEGORIES) {
    const s = categoryScores[cat];
    if (s > topScore) {
      topScore = s;
      topCat = cat;
    }
  }

  return {
    categoryScores,
    primaryCandidate: topCat,
    primaryCandidateScore: Math.round(topScore * 100) / 100,
    secondaryContextCandidates: secondaryContextCandidates.filter((c) => c !== topCat),
    isEmergencyOverride,
    emergencyType,
    ruleEvidenceReasons,
  };
}
