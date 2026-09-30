import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  shortcut?: string;
  className?: string;
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Buscar registros...",
  shortcut,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 rounded-xl border border-hairline bg-card/80 px-9 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-xs"
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title="Limpar busca"
        >
          <X className="h-3 w-3" />
        </button>
      ) : shortcut ? (
        <span className="absolute right-2.5 hidden sm:inline-flex items-center rounded border border-hairline/80 bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {shortcut}
        </span>
      ) : null}
    </div>
  );
}
