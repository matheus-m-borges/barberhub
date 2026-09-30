import React from "react";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionNode?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionNode,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-hairline/70 bg-card/60 backdrop-blur-xs shadow-xs",
        className
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm shadow-primary/10">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {actionNode ? (
        <div className="mt-5">{actionNode}</div>
      ) : actionLabel && onAction ? (
        <Button
          onClick={onAction}
          size="sm"
          className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 cursor-pointer shadow-md shadow-primary/20"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
