"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Sits on the highest
 * elevation layer over a scrim; closes on scrim tap or Escape.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        className="animate-in fade-in-0 absolute inset-0 bg-[rgba(28,25,23,0.3)] duration-150"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "surface-sheet animate-in slide-in-from-bottom-4 sm:zoom-in-95 relative flex max-h-[92dvh] w-full flex-col rounded-b-none pb-[env(safe-area-inset-bottom)] duration-200 sm:max-w-md sm:rounded-b-[24px] sm:pb-0",
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-neutral-200 sm:hidden" />
        <div className="flex items-start gap-3 px-5 pt-3 pb-1 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[17px] font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-[13px] text-meta">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-meta hover:bg-neutral-100 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-2 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
