import { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { HTMLMotionProps, motion } from "framer-motion";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  className,
  variant = "primary",
  disabled,
  ...props
}: HTMLMotionProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
  const variants = {
    primary: "bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-500",
  };
  return (
    <motion.button
      className={cx(base, variants[variant], className)}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1.5 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100",
        props.className,
      )}
    />
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cx("mb-1.5 block text-sm font-medium text-slate-700", props.className)} />;
}

export function Card({
  className,
  hover = false,
  ...props
}: HTMLMotionProps<"div"> & { hover?: boolean }) {
  return (
    <motion.div
      className={cx(
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-16px_rgba(76,41,196,0.18)] sm:p-6",
        hover && "cursor-pointer transition-colors hover:border-brand-300",
        className,
      )}
      whileHover={hover ? { y: -4, boxShadow: "0 20px 40px -20px rgba(76,41,196,0.35)" } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
      {...props}
    />
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

const badgeColors: Record<string, string> = {
  HELD: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
  COMPLETED: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  NO_SHOW: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  Low: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  Medium: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  High: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  UNKNOWN: "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
};

const pulsingBadges = new Set(["HELD", "High"]);

export function Badge({ children }: { children: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeColors[children] ?? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
      )}
    >
      {pulsingBadges.has(children) && (
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {children}
    </span>
  );
}

export function BrandMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const box = { sm: "h-8 w-8 rounded-lg", md: "h-9 w-9 rounded-xl", lg: "h-12 w-12 rounded-2xl" };
  const icon = { sm: "h-4 w-4", md: "h-[18px] w-[18px]", lg: "h-6 w-6" };
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/30",
        box[size],
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className={icon[size]} xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 12h4l2-6 4 12 2-6h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
