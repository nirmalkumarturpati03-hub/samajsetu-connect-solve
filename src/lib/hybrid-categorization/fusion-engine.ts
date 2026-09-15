import { supabase } from "@/lib/supabase";
import {
  APPROVED_CIVIC_CATEGORIES,
  CivicCategory,
  DEPARTMENT_TAXONOMY,
  DepartmentTaxonomyEntry,
  normalizeCivicCategory,
} from "./taxonomy";
import { evaluateCivicRules, CivicRuleEvaluation } from "./civic-rules";
import {
  AIStructuredExtraction,
  executePretrainedModelCategorization,
  ModelRunnerInput,
} from "./model-runner";

export interface FusedCategorizationResult {
  primaryCategory: CivicCategory;
  departmentInfo: DepartmentTaxonomyEntry;
  targetDepartment: string;
  confidenceScore: number;
  confidenceTier: "High" | "Medium" | "Needs Review";
  needsReview: boolean;
  explanation: string;
  secondaryContext: string[];
  candidateRankings: { category: CivicCategory; score: number }[];
  problemType: string;
  visualEvidenceSummary: string | null;
  riskSignals: {
    healthRisk: number;
    safetyRisk: number;
    urgency: number;
    essentialServiceImpact: number;
  };
  modelMetadata: {
    modelName: string;
    inferenceSource: string;
    isFallback: boolean;
    timestamp: string;
  };
}

export interface HybridFusionInput {
  title: string;
  description: string;
  citizenSelectedCategory?: string | undefined;
  district?: string | undefined;
  block?: string | undefined;
  locality?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  affectedPopulation?: number | null | undefined;
  imageDataUrls?: string[] | undefined;
  supportingInfo?: string | undefined;
}

/**
 * Queries real database historical context for nearby or district reports
 * to provide supporting evidence without overriding current semantic intent.
 */
async function fetchHistoricalDistrictDistribution(
  district?: string,
): Promise<Record<CivicCategory, number>> {
  const distribution: Record<CivicCategory, number> = APPROVED_CIVIC_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = 0;
      return acc;
    },
    {} as Record<CivicCategory, number>,
  );

  if (!supabase || !district || district === "GPS-detected location") {
    return distribution;
  }

  try {
    const { data } = await supabase
      .from("challenges")
      .select("domain")
      .ilike("district", `%${district}%`)
      .limit(30);

    if (data && data.length > 0) {
      for (const row of data) {
        const norm = normalizeCivicCategory(row.domain);
        distribution[norm] = (distribution[norm] || 0) + 1;
      }
    }
  } catch {
    // Graceful continuation without historical signals
  }

  return distribution;
}

/**
 * Real Hybrid Civic Problem Categorisation Engine
 * Performs multi-signal evidence fusion across:
 * 1. Pretrained Model Semantic Extraction (text + vision)
 * 2. Deterministic Contextual Civic Rules
 * 3. Citizen Initial Structured Selection
 * 4. Geographic & Jurisdictional Context
 * 5. Historical District Complaint Evidence
 */
export async function runHybridCategorization(
  input: HybridFusionInput,
): Promise<FusedCategorizationResult> {
  const cleanTitle = (input.title || "").trim();
  const cleanDesc = (input.description || "").trim();

  // 1. Run Pretrained Model Inference
  const modelRunnerInput: ModelRunnerInput = {
    title: cleanTitle,
    description: cleanDesc,
    imageDataUrls: input.imageDataUrls,
    citizenSelectedDomain: input.citizenSelectedCategory,
    district: input.district,
    locality: input.locality,
    affectedPopulation: input.affectedPopulation,
  };

  const aiExtraction: AIStructuredExtraction = await executePretrainedModelCategorization(
    modelRunnerInput,
  );

  // 2. Evaluate Deterministic Contextual Civic Rules
  const ruleEval: CivicRuleEvaluation = evaluateCivicRules(
    cleanTitle,
    cleanDesc,
    input.supportingInfo,
  );

  // 3. Fetch Historical District Context from Database
  const historicalDistribution = await fetchHistoricalDistrictDistribution(input.district);
  const totalHistorical = Object.values(historicalDistribution).reduce((a, b) => a + b, 0);

  // 4. Evidence Fusion Layer
  // Weighting matrix:
  // - AI Semantic Model: 45%
  // - Civic Rule Engine: 30%
  // - Citizen Initial Selection: 15%
  // - Historical Area Pattern: 10%
  const fusedScores: Record<CivicCategory, number> = {} as Record<CivicCategory, number>;

  // Convert AI candidate categories to lookup map
  const aiScoreMap: Record<CivicCategory, number> = APPROVED_CIVIC_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = 0.05;
      return acc;
    },
    {} as Record<CivicCategory, number>,
  );

  for (const item of aiExtraction.candidate_categories) {
    const norm = normalizeCivicCategory(item.category);
    aiScoreMap[norm] = Math.max(aiScoreMap[norm] || 0, item.score);
  }

  // Check if citizen provided an initial category selection
  const citizenInitialCategory = input.citizenSelectedCategory
    ? normalizeCivicCategory(input.citizenSelectedCategory)
    : null;

  const hasCitizenSelection = Boolean(citizenInitialCategory);
  const aiWeight = hasCitizenSelection ? 0.45 : 0.55;
  const ruleWeight = hasCitizenSelection ? 0.30 : 0.35;
  const citizenWeight = hasCitizenSelection ? 0.15 : 0.0;
  const historyWeight = 0.10;

  for (const cat of APPROVED_CIVIC_CATEGORIES) {
    const aiPart = (aiScoreMap[cat] || 0.05) * aiWeight;
    const rulePart = (ruleEval.categoryScores[cat] || 0.05) * ruleWeight;
    const citizenPart = hasCitizenSelection
      ? (citizenInitialCategory === cat ? 0.85 : 0.10) * citizenWeight
      : 0;
    const historyPart =
      totalHistorical > 0 ? ((historicalDistribution[cat] || 0) / totalHistorical) * historyWeight : 0.05 * historyWeight;

    fusedScores[cat] = aiPart + rulePart + citizenPart + historyPart;
  }

  // Apply Acute Emergency Override if detected
  if (ruleEval.isEmergencyOverride && ruleEval.emergencyType === "ACUTE_MEDICAL_EMERGENCY") {
    // Health & Medical Services must never be overridden by contextual words
    fusedScores["Health & Medical Services"] = Math.max(fusedScores["Health & Medical Services"], 0.95);
    // Suppress water score if it was only contextual
    if (fusedScores["Water Supply"] > 0.50) {
      fusedScores["Water Supply"] = 0.25;
    }
  }

  // Sort and rank categories
  const rankedCategories = APPROVED_CIVIC_CATEGORIES.map((cat) => ({
    category: cat,
    score: Math.round(fusedScores[cat] * 100) / 100,
  })).sort((a, b) => b.score - a.score);

  const topCandidate = rankedCategories[0]!;
  const primaryCategory = topCandidate.category;
  const rawConfidence = topCandidate.score;

  // Secondary Context Candidates
  const secondaryContextSet = new Set<string>();

  // Add secondary context identified by AI
  for (const sec of aiExtraction.secondary_context) {
    const norm = normalizeCivicCategory(sec);
    if (norm !== primaryCategory) {
      secondaryContextSet.add(norm);
    }
  }

  // Add secondary context from rule engine
  for (const sec of ruleEval.secondaryContextCandidates) {
    if (sec !== primaryCategory) {
      secondaryContextSet.add(sec);
    }
  }

  // Add runner-up if score is moderately high (> 0.35)
  if (rankedCategories[1] && rankedCategories[1].score >= 0.35 && rankedCategories[1].category !== primaryCategory) {
    secondaryContextSet.add(rankedCategories[1].category);
  }

  const secondaryContext = Array.from(secondaryContextSet);

  // Determine Confidence Tier
  let confidenceTier: "High" | "Medium" | "Needs Review" = "Medium";
  let needsReview = false;

  // Confidence is calculated from the gap between #1 and #2 plus model agreement
  const runnerUpScore = rankedCategories[1]?.score || 0;
  const gap = rawConfidence - runnerUpScore;

  if (aiExtraction.is_fallback) {
    // If AI model was completely unreachable, mark as Needs Review per requirements
    confidenceTier = "Needs Review";
    needsReview = true;
  } else if (rawConfidence >= 0.70 && (gap >= 0.20 || ruleEval.isEmergencyOverride)) {
    confidenceTier = "High";
  } else if (rawConfidence >= 0.50) {
    confidenceTier = "Medium";
  } else {
    confidenceTier = "Needs Review";
    needsReview = true;
  }

  // Format percentage for UI
  const confidenceScore = Math.min(
    96,
    Math.max(45, Math.round(rawConfidence * 100)),
  );

  // Controlled Department Taxonomy Mapping
  const departmentInfo = DEPARTMENT_TAXONOMY[primaryCategory];
  const targetDepartment = departmentInfo.department;

  // Construct Grounded Explanation
  let explanation = aiExtraction.reason;
  if (ruleEval.isEmergencyOverride) {
    explanation = `The problem was classified as ${primaryCategory} because the report describes an acute emergency. Incidental mentions of ${secondaryContext.join(", ") || "other terms"} provide secondary context and do not represent root civic utility defects.`;
  } else if (secondaryContext.length > 0) {
    explanation = `${primaryCategory} was identified as the primary civic issue. Mention of ${secondaryContext.join(", ")} represents contextual or environmental information.`;
  } else if (!explanation || explanation.length < 20) {
    explanation = `Semantic analysis and civic rules indicate ${primaryCategory} as the primary domain under the jurisdiction of ${targetDepartment}.`;
  }

  // Visual Evidence Summary
  const visualEvidenceSummary =
    aiExtraction.visual_findings.length > 0
      ? aiExtraction.visual_findings.join("; ")
      : input.imageDataUrls && input.imageDataUrls.length > 0
      ? "Image evidence reviewed for surface and structural indicators."
      : null;

  return {
    primaryCategory,
    departmentInfo,
    targetDepartment,
    confidenceScore,
    confidenceTier,
    needsReview,
    explanation,
    secondaryContext,
    candidateRankings: rankedCategories,
    problemType: aiExtraction.problem_type,
    visualEvidenceSummary,
    riskSignals: {
      healthRisk: aiExtraction.health_risk,
      safetyRisk: aiExtraction.safety_risk,
      urgency: aiExtraction.urgency,
      essentialServiceImpact: aiExtraction.essential_service_impact,
    },
    modelMetadata: {
      modelName: aiExtraction.model_name,
      inferenceSource: aiExtraction.inference_source,
      isFallback: aiExtraction.is_fallback,
      timestamp: new Date().toISOString(),
    },
  };
}
