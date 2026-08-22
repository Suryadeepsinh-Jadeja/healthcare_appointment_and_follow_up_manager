"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, Card } from "../../components/ui";
import { apiGet, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiGet<{ connected: boolean }>("/google/status").then((data) => setConnected(data.connected));
  }, [user]);

  const calendarStatus = searchParams.get("googleCalendar");

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const data = await apiGet<{ url: string }>("/google/auth-url");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start Google connection.");
      setConnecting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="mt-6">
        <h2 className="font-medium">Google Calendar</h2>
        <p className="mt-1 text-sm text-slate-600">
          Connect your Google Calendar so booking confirmations automatically create calendar events.
        </p>

        {calendarStatus === "connected" && (
          <p className="mt-3 text-sm text-emerald-700">Google Calendar connected successfully.</p>
        )}
        {calendarStatus === "error" && (
          <p className="mt-3 text-sm text-red-600">Something went wrong connecting Google Calendar. Please try again.</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4">
          {connected === null ? (
            <p className="text-sm text-slate-500">Checking connection status...</p>
          ) : connected ? (
            <p className="text-sm text-emerald-700">✓ Connected</p>
          ) : (
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Redirecting..." : "Connect Google Calendar"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
