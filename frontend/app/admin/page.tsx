"use client";

import { AlertTriangle, Stethoscope, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card } from "../../components/ui";
import { Reveal, Stagger, StaggerItem } from "../../components/motion";
import { StatCard } from "../../components/StatCard";
import { apiGet } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Doctor, NotificationLogEntry } from "../../lib/types";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [failed, setFailed] = useState<NotificationLogEntry[] | null>(null);

  useEffect(() => {
    apiGet<{ doctors: Doctor[] }>("/doctors")
      .then((data) => setDoctors(data.doctors))
      .catch(() => setDoctors([]));
    apiGet<{ notifications: NotificationLogEntry[] }>("/admin/notifications/failed")
      .then((data) => setFailed(data.notifications))
      .catch(() => setFailed([]));
  }, []);

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
          {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-slate-600">Clinic overview.</p>
      </Reveal>

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <StatCard label="Active doctors" value={doctors?.length ?? 0} icon={Stethoscope} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Failed notifications"
            value={failed?.length ?? 0}
            icon={AlertTriangle}
            accent={failed && failed.length > 0 ? "red" : "brand"}
          />
        </StaggerItem>
        <StaggerItem>
          <Link href="/admin/doctors">
            <Card hover className="flex h-full flex-col items-start justify-center">
              <UserPlus className="h-5 w-5 text-brand-600" />
              <p className="mt-3 font-medium text-slate-900">Add a doctor</p>
              <p className="mt-1 text-sm text-slate-500">Onboard a new provider.</p>
            </Card>
          </Link>
        </StaggerItem>
      </Stagger>

      {failed && failed.length > 0 && (
        <Reveal delay={0.1}>
          <Card>
            <h2 className="font-medium text-slate-900">Recent failures</h2>
            <div className="mt-3 space-y-2">
              {failed.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between rounded-lg bg-red-50/60 px-3 py-2 text-sm"
                >
                  <span className="text-slate-700">
                    {n.type} · {n.channel}
                  </span>
                  <Badge>FAILED</Badge>
                </div>
              ))}
            </div>
            <Link href="/admin/notifications" className="mt-3 inline-block text-sm font-medium text-brand-700 underline">
              View all →
            </Link>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
