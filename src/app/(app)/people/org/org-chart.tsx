"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

import { InitialsAvatar } from "@/components/chrome/page";
import { teamColor, type TeamPalette } from "@/lib/team-color";
import { cn } from "@/lib/utils";

export type ChartNode = {
  id: string;
  name: string;
  title: string | null;
  team: string | null;
  tenure: string;
  reports: ChartNode[];
};

function countAll(node: ChartNode): number {
  return node.reports.reduce((sum, r) => sum + 1 + countAll(r), 0);
}

/**
 * Org chart in two forms: on phones, a drill-down view showing one manager
 * and their direct reports at a time (breadcrumb to go back up); on wider
 * screens, the full top-down tree with connector lines, where branches below
 * `expandDepth` start collapsed behind a "+N" toggle.
 */
export function OrgChart({
  roots,
  palette,
  expandDepth = 1,
}: {
  roots: ChartNode[];
  palette: TeamPalette;
  expandDepth?: number;
}) {
  return (
    <>
      <div className="sm:hidden">
        <FocusChart roots={roots} palette={palette} />
      </div>
      <div className="hidden sm:block">
        <TreeChart roots={roots} palette={palette} expandDepth={expandDepth} />
      </div>
    </>
  );
}

function FocusChart({
  roots,
  palette,
}: {
  roots: ChartNode[];
  palette: TeamPalette;
}) {
  const [path, setPath] = useState<ChartNode[]>(
    roots.length === 1 ? [roots[0]] : [],
  );
  const focus = path[path.length - 1];
  const children = focus ? focus.reports : roots;
  const drill = (node: ChartNode) => setPath((p) => [...p, node]);

  return (
    <div className="space-y-3">
      {path.length > 0 ? (
        <nav aria-label="Reporting line" className="-mx-4 overflow-x-auto px-4">
          <ol className="flex w-max items-center gap-1 text-[13px]">
            {roots.length > 1 ? (
              <li className="flex items-center gap-1">
                <Crumb label="Everyone" onClick={() => setPath([])} />
                <ChevronRight className="size-3.5 text-meta" />
              </li>
            ) : null}
            {path.map((node, i) => (
              <li key={node.id} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="size-3.5 text-meta" /> : null}
                <Crumb
                  label={node.name.split(" ")[0]}
                  current={i === path.length - 1}
                  onClick={() => setPath(path.slice(0, i + 1))}
                />
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {focus ? (
        <NodeCard node={focus} palette={palette} className="w-full" />
      ) : null}

      {children.length > 0 ? (
        <ul className={cn("org-focus-children", focus && "mt-3 pl-5")}>
          {children.map((child) => (
            <li
              key={child.id}
              className="org-focus-child flex items-stretch gap-1.5"
            >
              <NodeCard
                node={child}
                palette={palette}
                className="min-w-0 flex-1"
              />
              {child.reports.length > 0 ? (
                <button
                  type="button"
                  onClick={() => drill(child)}
                  aria-label={`Show ${child.name}'s team`}
                  className="surface-low flex w-14 shrink-0 flex-col items-center justify-center rounded-[14px] text-[12px] font-semibold text-brand"
                >
                  <span className="tabular">{child.reports.length}</span>
                  <ChevronRight className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-meta">No direct reports.</p>
      )}
    </div>
  );
}

function Crumb({
  label,
  current,
  onClick,
}: {
  label: string;
  current?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-2 font-medium",
        current ? "text-ink" : "text-brand",
      )}
    >
      {label}
    </button>
  );
}

function NodeCard({
  node,
  palette,
  className,
}: {
  node: ChartNode;
  palette: TeamPalette;
  className?: string;
}) {
  const color = teamColor(node.team, palette);
  return (
    <Link
      href={`/people/${node.id}`}
      className={cn(
        "surface-interactive relative flex flex-col gap-1.5 overflow-hidden px-3 pt-3 pb-2.5",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color.dot }}
      />
      <div className="flex items-center gap-2">
        <InitialsAvatar name={node.name} size="sm" />
        <p className="min-w-0 truncate text-[14px] leading-tight font-semibold text-ink">
          {node.name}
        </p>
      </div>
      <p className="truncate text-[12px] leading-tight text-meta">
        {node.title ?? "No role set"}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span
          className="truncate rounded-[6px] px-1.5 py-px text-[11px] font-semibold"
          style={{ color: color.fg, backgroundColor: color.bg }}
        >
          {node.team ?? "No team"}
        </span>
        <span className="tabular shrink-0 text-[11px] text-meta">
          {node.tenure}
        </span>
      </div>
    </Link>
  );
}

function TreeChart({
  roots,
  palette,
  expandDepth,
}: {
  roots: ChartNode[];
  palette: TeamPalette;
  expandDepth: number;
}) {
  const pane = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pane.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);
  return (
    <div ref={pane} className="org-chart overflow-x-auto pb-4">
      <ul className="org-level">
        {roots.map((node) => (
          <Branch
            key={node.id}
            node={node}
            depth={0}
            palette={palette}
            expandDepth={expandDepth}
          />
        ))}
      </ul>
    </div>
  );
}

function Branch({
  node,
  depth,
  palette,
  expandDepth,
}: {
  node: ChartNode;
  depth: number;
  palette: TeamPalette;
  expandDepth: number;
}) {
  const [open, setOpen] = useState(depth < expandDepth);
  const hasReports = node.reports.length > 0;
  return (
    <li className="org-node">
      <div className="flex flex-col items-center">
        <NodeCard node={node} palette={palette} className="w-[176px]" />
        {hasReports ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${node.name}'s team`}
            className={cn(
              "relative z-10 -mt-2 inline-flex min-h-11 items-center gap-0.5 rounded-full px-3 text-[12px] font-semibold text-brand",
            )}
          >
            <span className="surface-low inline-flex h-6 items-center gap-0.5 rounded-full px-2">
              {open ? (
                <>
                  {node.reports.length} <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  +{countAll(node)} <ChevronDown className="size-3.5" />
                </>
              )}
            </span>
          </button>
        ) : null}
      </div>
      {hasReports && open ? (
        <ul className="org-level org-children">
          {node.reports.map((child) => (
            <Branch
              key={child.id}
              node={child}
              depth={depth + 1}
              palette={palette}
              expandDepth={expandDepth}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
