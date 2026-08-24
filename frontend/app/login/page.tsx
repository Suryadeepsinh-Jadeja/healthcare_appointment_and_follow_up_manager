"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandMark, Button, Card, ErrorText, Input, Label } from "../../components/ui";
import { Shake } from "../../components/motion";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN: "/admin",
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(ROLE_HOME[user.role] ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setShakeKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="hero-gradient relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-6">
      <div aria-hidden className="blob blob-a -left-24 -top-24 h-96 w-96 bg-brand-300" />
      <div aria-hidden className="blob blob-b -right-20 bottom-0 h-80 w-80 bg-accent-300" />

      <Link href="/" className="relative flex items-center gap-2.5">
        <BrandMark />
        <span className="font-display text-xl font-semibold text-slate-900">Healthcare Manager</span>
      </Link>
      <Shake triggerKey={shakeKey}>
        <Card className="relative w-full max-w-sm">
          <h1 className="mb-6 font-display text-xl font-semibold text-slate-900">Sign in</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            New patient?{" "}
            <Link href="/register" className="font-medium text-brand-700 underline">
              Register
            </Link>
          </p>
        </Card>
      </Shake>
    </main>
  );
}
