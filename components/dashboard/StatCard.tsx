import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  icon?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  description,
  variant = "default",
  icon,
}: StatCardProps) {
  const variantStyles = {
    default: "border-slate-800 bg-slate-900 text-slate-100",
    success: "border-emerald-800/50 bg-emerald-950/20 text-emerald-100",
    warning: "border-amber-800/50 bg-amber-950/20 text-amber-100",
    danger: "border-rose-800/50 bg-rose-950/20 text-rose-100",
    info: "border-blue-800/50 bg-blue-950/20 text-blue-100",
  };

  const badgeStyles = {
    default: "text-slate-400",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-rose-400",
    info: "text-blue-400",
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition-all ${variantStyles[variant]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </p>
        {icon && <div className={badgeStyles[variant]}>{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-2xl font-bold tracking-tight text-slate-50 font-mono">
          {value}
        </p>
      </div>

      {description && (
        <p className={`mt-1.5 text-xs ${badgeStyles[variant]}`}>
          {description}
        </p>
      )}
    </div>
  );
}