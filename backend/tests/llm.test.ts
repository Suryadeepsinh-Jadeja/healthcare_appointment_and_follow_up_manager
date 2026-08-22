import { describe, expect, it, vi } from "vitest";
import { LlmProvider } from "../src/modules/llm/llm.types";
import { generatePreVisitSummary } from "../src/modules/llm/preVisitSummary";
import { generatePostVisitSummary } from "../src/modules/llm/postVisitSummary";

function fakeProvider(complete: LlmProvider["complete"]): LlmProvider {
  return { complete };
}

describe("generatePreVisitSummary", () => {
  it("returns the parsed summary on a valid JSON response", async () => {
    const provider = fakeProvider(async () =>
      JSON.stringify({
        urgency: "High",
        chiefComplaint: "Chest pain",
        questions: ["How long?", "Any radiation?", "Shortness of breath?"],
      }),
    );

    const result = await generatePreVisitSummary("chest pain for 2 days", provider);

    expect(result).toEqual({
      urgency: "High",
      chiefComplaint: "Chest pain",
      questions: ["How long?", "Any radiation?", "Shortness of breath?"],
    });
  });

  it("falls back without throwing when the provider times out", async () => {
    vi.useFakeTimers();
    const provider = fakeProvider(() => new Promise(() => {})); // never resolves

    const promise = generatePreVisitSummary("fever", provider);
    await vi.advanceTimersByTimeAsync(8000);
    const result = await promise;

    expect(result.generationFailed).toBe(true);
    expect(result.urgency).toBe("UNKNOWN");
    expect(result.chiefComplaint).toBe("fever");
    vi.useRealTimers();
  });

  it("falls back without throwing on malformed JSON", async () => {
    const provider = fakeProvider(async () => "not json at all");

    const result = await generatePreVisitSummary("headache", provider);

    expect(result.generationFailed).toBe(true);
    expect(result.questions).toEqual([]);
  });

  it("falls back when the JSON is valid but fails schema validation", async () => {
    const provider = fakeProvider(async () =>
      JSON.stringify({ urgency: "Extreme", chiefComplaint: "x", questions: ["only one"] }),
    );

    const result = await generatePreVisitSummary("dizziness", provider);

    expect(result.generationFailed).toBe(true);
  });

  it("truncates a very long symptom string in the fallback", async () => {
    const provider = fakeProvider(async () => {
      throw new Error("provider unavailable");
    });
    const longSymptoms = "a".repeat(500);

    const result = await generatePreVisitSummary(longSymptoms, provider);

    expect(result.chiefComplaint.length).toBe(300);
  });
});

describe("generatePostVisitSummary", () => {
  it("returns the parsed summary on a valid JSON response", async () => {
    const provider = fakeProvider(async () =>
      JSON.stringify({
        summary: "Take it easy and stay hydrated.",
        medicationSchedule: [{ drug: "Paracetamol", dose: "500mg", timing: "twice daily" }],
        followUpSteps: ["Rest for 3 days", "Return if fever persists"],
      }),
    );

    const result = await generatePostVisitSummary("patient has mild flu", provider);

    expect(result.medicationSchedule).toHaveLength(1);
    expect(result.followUpSteps).toHaveLength(2);
    expect(result.generationFailed).toBeUndefined();
  });

  it("falls back without throwing on a provider error", async () => {
    const provider = fakeProvider(async () => {
      throw new Error("network error");
    });

    const result = await generatePostVisitSummary("notes", provider);

    expect(result.generationFailed).toBe(true);
    expect(result.medicationSchedule).toEqual([]);
  });
});
