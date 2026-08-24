"use client";

import { useEffect, useState } from "react";
import { Badge, Card, ErrorText } from "../../../components/ui";
import { Reveal, Stagger, StaggerItem } from "../../../components/motion";
import { CardSkeleton } from "../../../components/Skeleton";
import { apiGet, ApiError } from "../../../lib/api";
import { NotificationLogEntry } from "../../../lib/types";

export default function FailedNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ notifications: NotificationLogEntry[] }>("/admin/notifications/failed")
      .then((data) => setNotifications(data.notifications))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load notifications."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold text-slate-900">Failed notifications</h1>
      </Reveal>
      <ErrorText>{error}</ErrorText>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-slate-500">No failed notifications — everything's sending fine.</p>
      ) : (
        <Stagger className="space-y-3">
          {notifications.map((n) => (
            <StaggerItem key={n.id}>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {n.type} <span className="text-slate-400">/</span> {n.channel}
                    </p>
                    <p className="text-xs text-slate-500">Appointment: {n.appointmentId ?? "—"}</p>
                  </div>
                  <Badge>FAILED</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">Attempts: {n.attempts}</p>
                {n.lastError && <p className="mt-1 text-sm text-red-600">{n.lastError}</p>}
                <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
