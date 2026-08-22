import { z } from "zod";
import { LlmProvider } from "./llm.types";
import { GeminiProvider } from "./providers/gemini.provider";
import { runJsonCompletion } from "./runJsonCompletion";

const TIMEOUT_MS = 8000;

const responseSchema = z.object({
  summary: z.string().min(1),
  medicationSchedule: z.array(
    z.object({
      drug: z.string().min(1),
      dose: z.string().min(1),
      timing: z.string().min(1),
    }),
  ),
  followUpSteps: z.array(z.string()),
});

export interface PostVisitSummary {
  summary: string;
  medicationSchedule: Array<{ drug: string; dose: string; timing: string }>;
  followUpSteps: string[];
  generationFailed?: boolean;
}

function buildPrompt(notes: string): string {
  return `Convert these clinical notes into a patient-friendly summary. Return ONLY valid JSON with keys:
summary (string, plain language), medicationSchedule (array of {drug, dose, timing}),
followUpSteps (array of strings).
Notes: ${notes}`;
}

export async function generatePostVisitSummary(
  notes: string,
  provider: LlmProvider = new GeminiProvider(),
): Promise<PostVisitSummary> {
  return runJsonCompletion<PostVisitSummary>({
    provider,
    prompt: buildPrompt(notes),
    timeoutMs: TIMEOUT_MS,
    parse: (raw) => responseSchema.parse(JSON.parse(raw)),
    fallback: () => ({
      summary: "AI summary unavailable — raw notes below.",
      medicationSchedule: [],
      followUpSteps: [],
      generationFailed: true,
    }),
  });
}
