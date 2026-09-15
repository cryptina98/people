"use client";

import { useRef, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/server/actions/helpers";

function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (
    fn: () => Promise<ActionResult<unknown>>,
    success?: string,
    onDone?: () => void,
  ) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        if (success) toast.success(success);
        onDone?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  return { pending, run };
}

/** Small inline form that resets itself after a successful action. */
export function InlineForm({
  action,
  success,
  submitLabel,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  success?: string;
  submitLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const { pending, run } = useRun();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      className={className ?? "flex flex-wrap items-end gap-2"}
      action={(formData) =>
        run(
          () => action(formData),
          success,
          () => formRef.current?.reset(),
        )
      }
    >
      {children}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Form that keeps its values after submitting (settings-style edits). */
export function PersistentForm({
  action,
  success,
  submitLabel,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  success?: string;
  submitLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const { pending, run } = useRun();
  return (
    <form
      className={className ?? "space-y-3"}
      action={(formData) => run(() => action(formData), success)}
    >
      {children}
      <Button type="submit" size="sm" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function ActionButton({
  action,
  success,
  children,
  variant = "ghost",
  confirm,
}: {
  action: () => Promise<ActionResult<unknown>>;
  success?: string;
  children: ReactNode;
  variant?: "ghost" | "outline" | "default";
  confirm?: string;
}) {
  const { pending, run } = useRun();
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        run(action, success);
      }}
    >
      {children}
    </Button>
  );
}
