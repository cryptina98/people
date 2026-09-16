"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
 * Top-down org chart: boxes joined by connector lines, one column per branch.
 * Branches below `expandDepth` start collapsed with a "+N" toggle so a phone
 * shows the leadership layer first and drills down on tap. The chart pans
 * inside its own container when wider than the screen.
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
  const pane = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pane.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);
  return (
    <div
      ref={pane}
      className="org-chart -mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0"
    >
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
  const color = teamColor(node.team, palette);
  return (
    <li className="org-node">
      <div className="flex flex-col items-center">
        <Link
          href={`/people/${node.id}`}
          className="surface-interactive relative flex w-[176px] flex-col gap-1.5 overflow-hidden px-3 pt-3 pb-2.5"
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
