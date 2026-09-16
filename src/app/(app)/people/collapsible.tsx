"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Collapsed-by-default section body behind a "Show all (n)" toggle. */
export function Collapsible({
  count,
  label,
  children,
}: {
  count: number;
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2.5">
      <Button
        variant="outline"
        className="w-full"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <>
            Hide <ChevronUp />
          </>
        ) : (
          <>
            {label ?? "Show all"} ({count}) <ChevronDown />
          </>
        )}
      </Button>
      {open ? children : null}
    </div>
  );
}
