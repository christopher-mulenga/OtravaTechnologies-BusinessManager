import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-muted",
        brand: "border-transparent bg-brand-light text-brand-dark",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        danger: "border-transparent bg-error/15 text-error",
        info: "border-transparent bg-info/15 text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function statusTone(status: string): VariantProps<typeof badgeVariants>["tone"] {
  switch (status) {
    case "paid":
    case "accepted":
    case "converted":
      return "success";
    case "overdue":
    case "rejected":
    case "cancelled":
      return "danger";
    case "partially_paid":
    case "sent":
    case "expired":
      return "warning";
    case "issued":
      return "info";
    case "draft":
    default:
      return "neutral";
  }
}
