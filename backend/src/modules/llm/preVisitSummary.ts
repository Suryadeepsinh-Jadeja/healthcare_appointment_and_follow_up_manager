import { z } from "zod";
import { LlmProvider } from "./llm.types";
import { GeminiProvider } from "./providers/gemini.provider";
import { runJsonCompletion } from "./runJsonCompletion";

const TIMEOUT_MS = 8000;

const responseSchema = z.object({
  urgency: z.enum(["Low", "Medium", "High"]),
  chiefComplaint: z.string().min(1),
  questions: z.array(z.string()).length(3),
});

export interface PreVisitSummary {
  urgency: "Low" | "Medium" | "High" | "UNKNOWN";
  chiefComplaint: string;
  questions: string[];
  generationFailed?: boolean;
}

function buildPrompt(symptoms: string): string {
  return `Analyse these symptoms and return ONLY valid JSON with keys:
urgency ("Low" | "Medium" | "High"), chiefComplaint (string),
questions (array of exactly 3 strings — suggested questions for the doctor to ask).
Symptoms: ${symptoms}`;
}

export async function generatePreVisitSummary(
  symptoms: string,
  provider: LlmProvider = new GeminiProvider(),
): Promise<PreVisitSummary> {
  return runJsonCompletion<PreVisitSummary>({
    provider,
    prompt: buildPrompt(symptoms),
    timeoutMs: TIMEOUT_MS,
    parse: (raw) => responseSchema.parse(JSON.parse(raw)),
    fallback: () => ({
      urgency: "UNKNOWN",
      chiefComplaint: symptoms.slice(0, 300),
      questions: [],
      generationFailed: true,
    }),
  });
}
