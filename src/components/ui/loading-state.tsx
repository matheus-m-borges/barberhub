import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export function LoadingState({
  message = "Carregando dados...",
  subMessage = "Processando informações operacionais em tempo real.",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-hairline/60 bg-card/40 backdrop-blur-xs",
        className
      )}
    >
      <div className="relative flex items-center justify-center mb-4">
        <div className="h-12 w-12 rounded-full border-2 border-primary/20 animate-ping absolute" />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-primary">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
      <h4 className="text-sm font-bold text-foreground tracking-tight">{message}</h4>
      {subMessage && (
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">{subMessage}</p>
      )}
    </div>
  );
}
