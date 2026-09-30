import React from "react";
import { Scissors, Briefcase, Building, Scale, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavorEnvironmentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavorEnvironmentSelectorModal({ isOpen, onClose }: NavorEnvironmentSelectorModalProps) {
  if (!isOpen) return null;

  const environments = [
    {
      id: "barberhub",
      name: "BarberHub",
      category: "Gestão para barbearias",
      description: "Gestão completa para sua barbearia: agenda, PDV rápido, comissões e fidelidade.",
      url: "https://barberhub.navorbr.com",
      icon: Scissors,
      isCurrent: true,
      color: "border-primary/50 bg-primary/5 text-primary",
    },
    {
      id: "rephub",
      name: "RepHub",
      category: "Representação comercial",
      description: "Sistema de CRM e gestão especializado para representantes comerciais.",
      url: "https://rephub.navorbr.com",
      icon: Briefcase,
      isCurrent: false,
      color: "border-blue-500/30 bg-blue-500/5 text-blue-500",
    },
    {
      id: "lawhub",
      name: "LawHub",
      category: "Gestão jurídica",
      description: "Sistema de gestão jurídica de alta performance para escritórios de advocacia.",
      url: "https://lawhub.navorbr.com",
      icon: Scale,
      isCurrent: false,
      color: "border-cyan-500/30 bg-cyan-500/5 text-cyan-500",
    },
    {
      id: "enghub",
      name: "EngHub",
      category: "Engenharia e obras",
      description: "Sistema completo de gestão empresarial e de obras para construção civil.",
      url: "https://enghub.navorbr.com",
      icon: Building,
      isCurrent: false,
      color: "border-amber-500/30 bg-amber-500/5 text-amber-500",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-card border border-hairline rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#0088cc] uppercase">
              PORTAL CORPORATIVO NAVOR
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
              Escolha seu ambiente de trabalho
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione o sistema NAVOR que deseja acessar:
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {environments.map((env) => {
            const Icon = env.icon;
            return (
              <div
                key={env.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  env.isCurrent
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-hairline bg-muted/20 hover:border-hairline hover:bg-muted/40"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${env.color}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{env.name}</h3>
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          {env.category}
                        </span>
                      </div>
                    </div>
                    {env.isCurrent && (
                      <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-mono font-bold">
                        ATUAL
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {env.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-hairline flex justify-end">
                  {env.isCurrent ? (
                    <Button
                      size="sm"
                      onClick={onClose}
                      className="h-8 text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
                    >
                      Permanecer aqui
                    </Button>
                  ) : (
                    <a
                      href={env.url}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0088cc] hover:underline"
                    >
                      Acessar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
