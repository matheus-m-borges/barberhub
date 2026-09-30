import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Scissors, Sun, Moon, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitialTheme, applyTheme, type ThemeMode } from "@/lib/theme";

export function SiteHeader() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-card/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 font-display text-xl sm:text-2xl leading-none tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-foreground">Barber<span className="text-primary font-bold">Hub</span></span>
            <span className="ml-1.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded">
              PRO ERP
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground border border-hairline bg-muted/40 px-3 py-1.5 rounded-md">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Matriz — Centro</span>
          </div>

          {/* Botão de Alternância de Tema: Claro / Escuro */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-8 gap-1.5 border-hairline text-xs font-medium cursor-pointer"
            title={theme === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Modo Escuro</span>
              </>
            )}
          </Button>

          <Badge variant="outline" className="border-hairline text-xs font-mono py-1 px-2.5 hidden sm:inline-flex">
            v1.0 Navor SaaS
          </Badge>
        </div>
      </div>
    </header>
  );
}
