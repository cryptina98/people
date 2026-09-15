import Link from "next/link";
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
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200/80 pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-neutral-500">{subtitle}</p>
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
    <section id={id} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {title}
          </h2>
          {typeof count === "number" ? (
            <span className="text-xs text-neutral-400">{count}</span>
          ) : null}
        </div>
        {actions}
      </div>
      {description ? (
        <p className="text-sm text-neutral-500">{description}</p>
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
    <div className="glass-field rounded-xl border border-dashed border-neutral-400/80 px-6 py-10 text-center">
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
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
  return (
    <div className={cn("glass rounded-xl border border-white/70", className)}>
      {children}
    </div>
  );
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
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-14 w-14 text-lg",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/80 to-sky-100/80 font-medium text-neutral-600 ring-1 ring-white/70",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function CandidateLink({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/candidates/${id}`}
      className={cn(
        "font-medium text-neutral-900 underline-offset-4 hover:underline",
        className,
      )}
    >
      {name}
    </Link>
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
    <div className="space-y-1">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="text-sm text-neutral-800">{children}</dd>
    </div>
  );
}
