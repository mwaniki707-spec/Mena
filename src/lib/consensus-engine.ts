/**
 * Utilities and prompt generators for Mena's Debate & Consensus Synthesis Engine.
 */

export function buildSynthesisPrompt(
  originalUserPrompt: string,
  modelOutputs: { modelName: string; text: string }[],
): string {
  const responsesText = modelOutputs
    .map(
      (m, idx) =>
        `### Candidate Response ${idx + 1} (${m.modelName}):\n${m.text.trim()}`,
    )
    .join("\n\n---\n\n");

  return `You are acting as an expert consensus synthesizer. Two or more AI models have responded to the user's inquiry below.
Your objective is to examine each candidate response, extract the highest-quality ideas, correct any gaps or inaccuracies, and synthesize a single, definitive, and superior response.

---
### Original User Request:
"${originalUserPrompt}"

---
${responsesText}

---
### Synthesis Guidelines:
1. **Clear Synthesis**: Do not simply repeat both answers. Synthesize them into the single best comprehensive answer.
2. **Highlight Best Contributions**: Briefly note which unique strengths or nuances each model provided if relevant.
3. **No Fluff**: Be direct, actionable, and authoritative. Present code or solutions in full polished form.

Provide your synthesized master response now:`;
}

export function buildDebatePrompt(
  originalUserPrompt: string,
  modelOutputs: { modelName: string; text: string }[],
): string {
  const responsesText = modelOutputs
    .map(
      (m, idx) =>
        `### Model ${idx + 1} (${m.modelName}):\n${m.text.trim()}`,
    )
    .join("\n\n---\n\n");

  return `You are an impartial Chief Technical Architect & Evaluator running a structured debate between candidate AI model responses.

### User Request:
"${originalUserPrompt}"

---
${responsesText}

---
### Please provide a structured Evaluation and Debate Verdict with the following sections:

## 1. 🤝 Consensus & Common Ground
Where do both models agree? Summarize the verified facts or shared approaches.

## 2. ⚔️ Key Divergences & Critique
- What did Model 1 do better or catch that Model 2 missed?
- What potential flaws, edge-case oversights, or inaccuracies exist in each?

## 3. 🏆 Final Verdict & Recommended Answer
Which model provided the superior answer, and what is the optimal combined resolution for the user?`;
}
