import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../src/lib/crypto";

describe("encrypt/decrypt", () => {
  it("round-trips a plaintext string", () => {
    const plaintext = "1//0gABCDEF-some-google-refresh-token";
    const ciphertext = encrypt(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const plaintext = "same-token";
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it("fails to decrypt if the ciphertext was tampered with", () => {
    const ciphertext = encrypt("sensitive-value");
    const [iv, authTag, data] = ciphertext.split(":");
    const tampered = [iv, authTag, data.slice(0, -2) + "00"].join(":");

    expect(() => decrypt(tampered)).toThrow();
  });
});
