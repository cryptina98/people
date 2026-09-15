import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-bold text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-meta">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function Section({
  title,
  description,
  count,
  actions,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-16 space-y-2.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-[15px] font-semibold text-ink">
          {title}
          {typeof count === "number" ? (
            <span className="tabular ml-1.5 font-medium text-meta">
              {count}
            </span>
          ) : null}
        </h2>
        {actions}
      </div>
      {description ? (
        <p className="px-0.5 text-[13px] text-meta">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-0.5 py-1 text-[13px] text-meta">
      <p>
        {title}
        {description ? ` — ${description}` : ""}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("surface", className)}>{children}</div>;
}

export function InitialsAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-[13px]",
    lg: "h-14 w-14 text-lg",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-100 font-semibold text-neutral-600",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-medium text-meta">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}
