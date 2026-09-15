import { classifyCivicProblemNLP, evaluateClassifierOnDataset, type LabeledCivicNLPExample } from "../src/lib/nlp-categorization";
import fs from "fs";
import path from "path";

const datasetPath = path.resolve(process.cwd(), "scratch/nlp-civic-evaluation.json");
const dataset: LabeledCivicNLPExample[] = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

console.log("=== RUNNING NLP CLASSIFICATION EVALUATION ===");
const metrics = evaluateClassifierOnDataset(dataset);
console.log("Evaluation Results:", metrics);

console.log("\nTesting Sample Classification 1 (Track A):");
const res1 = classifyCivicProblemNLP({
  title: "Drainage problem",
  description: "Every time it rains, water collects near the school and children cannot cross the road.",
});
console.log("Output 1:", res1);

console.log("\nTesting Sample Classification 2 (Low confidence / Needs Review):");
const res2 = classifyCivicProblemNLP({
  title: "Something strange",
  description: "Things are not moving here as expected in the town.",
});
console.log("Output 2:", res2);

if (metrics.accuracyCategory >= 90) {
  console.log("\n✓ NLP Categorization Engine PASSED benchmark requirements!");
} else {
  console.error("FAIL: Accuracy below target!");
  process.exit(1);
}
