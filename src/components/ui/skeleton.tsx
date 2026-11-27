import { cn } from "@/lib/utils";

/** Placeholder block shown while content loads. Size and radius come from the caller so it matches the real thing. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-surface-2", className)} {...props} />;
}