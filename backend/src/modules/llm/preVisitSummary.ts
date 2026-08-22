export interface PreVisitSummary {
  urgency: "Low" | "Medium" | "High" | "UNKNOWN";
  chiefComplaint: string;
  questions: string[];
  generationFailed?: boolean;
}

/**
 * Placeholder until the Gemini-backed LLM provider lands: always returns the
 * same fallback shape the real provider falls back to on timeout/failure, so
 * callers and the frontend's "AI summary unavailable" state can be built now.
 */
export async function generatePreVisitSummary(symptoms: string): Promise<PreVisitSummary> {
  return {
    urgency: "UNKNOWN",
    chiefComplaint: symptoms.slice(0, 300),
    questions: [],
    generationFailed: true,
  };
}
