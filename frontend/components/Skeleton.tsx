"use client";

import { motion } from "framer-motion";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cx("rounded-lg bg-slate-200/70", className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6", className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-3 w-1/2" />
      <Skeleton className="mt-4 h-3 w-2/3" />
    </div>
  );
}
