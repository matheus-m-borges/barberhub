import React, { useState } from "react";
import {
  Boxes,
  Package,
  Plus,
  User,
  CheckCircle,
  Clock,
  Sparkles,
  Search,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import type { CustomerItem } from "@/routes/index";

export interface PrepaidPackage {
  id: string;
  name: string;
  price: number;
  totalCredits: number;
  serviceName: string;
  validDays: number;
  description: string;
}

export interface CustomerPackageUsage {
  id: string;
  customerName: string;
  customerPhone: string;
  packageName: string;
  totalCredits: number;
  remainingCredits: number;
  purchasedAt: string;
  status: "ACTIVE" | "EXHAUSTED";
}

interface PackagesViewProps {
  customers: CustomerItem[];
  onShowToast: (msg: string) => void;
}

export function PackagesView({ customers, onShowToast }: PackagesViewProps) {
  const [search, setSearch] = useState("");
  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState(false);

  // Catálogo de Pacotes Pré-pagos
  const [catalog, setCatalog] = useState<PrepaidPackage[]>([
    {
      id: "pkg-1",
      name: "Pacote 10 Cortes Fade Pro",
      price: 380.0,
      totalCredits: 10,
      serviceName: "Corte Degradê",
      validDays: 180,
      description: "Economia de R$ 70. Válido por 6 meses com qualquer barbeiro.",
    },
    {
      id: "pkg-2",
      name: "Combo 5 Barboterapias com Toalha Quente",
      price: 150.0,
      totalCredits: 5,
      serviceName: "Barboterapia",
      validDays: 90,
      description: "Tratamento facial e alinhamento completo com toalha a vapor.",
    },
    {
      id: "pkg-3",
      name: "Pacote Pai & Filho (6 Cortes)",
      price: 240.0,
      totalCredits: 6,
      serviceName: "Corte Tradicional",
      validDays: 120,
      description: "Pode ser compartilhado entre familiares no mesmo cadastro.",
    },
  ]);

  // Pacotes Ativos de Clientes
  const [customerPackages, setCustomerPackages] = useState<CustomerPackageUsage[]>([
    {
      id: "cp-1",
      customerName: "Carlos Eduardo Santos",
      customerPhone: "(11) 98888-1111",
      packageName: "Pacote 10 Cortes Fade Pro",
      totalCredits: 10,
      remainingCredits: 7,
      purchasedAt: "15/09/2026",
      status: "ACTIVE",
    },
    {
      id: "cp-2",
      customerName: "Rafael Bittencourt",
      customerPhone: "(11) 96666-3333",
      packageName: "Combo 5 Barboterapias com Toalha Quente",
      totalCredits: 5,
      remainingCredits: 3,
      purchasedAt: "20/09/2026",
      status: "ACTIVE",
    },
  ]);

  const handleUseCredit = (id: string) => {
    setCustomerPackages((prev) =>
      prev.map((cp) => {
        if (cp.id !== id) return cp;
        if (cp.remainingCredits <= 1) {
          onShowToast(`Último crédito utilizado de ${cp.customerName}! Pacote esgotado.`);
          return { ...cp, remainingCredits: 0, status: "EXHAUSTED" };
        }
        onShowToast(`1 crédito debitado de ${cp.customerName}. Saldo restante: ${cp.remainingCredits - 1}.`);
        return { ...cp, remainingCredits: cp.remainingCredits - 1 };
      })
    );
  };

  const filteredCustomerPkgs = customerPackages.filter(
    (cp) =>
      cp.customerName.toLowerCase().includes(search.toLowerCase()) ||
      cp.packageName.toLowerCase().includes(search.toLowerCase()) ||
      cp.customerPhone.includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-primary" />
            Pacotes Pré-pagos de Serviços
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Venda lotes de cortes ou barbas antecipadas sem mensalidade recorrente, com controle decrescente de saldo.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsNewPackageModalOpen(true)}
          className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 cursor-pointer px-4"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Pacote Promocional</span>
        </Button>
      </div>

      {/* Catálogo de Pacotes para Venda */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Modelos de Pacotes Disponíveis para Venda no PDV
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {catalog.map((pkg) => (
            <Card key={pkg.id} className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-bold">
                    {pkg.totalCredits} Créditos
                  </Badge>
                  <span className="font-mono text-base font-bold text-foreground">
                    R$ {pkg.price.toFixed(2)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground mt-2">{pkg.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
              </div>

              <div className="pt-3 border-t border-hairline flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Válido por {pkg.validDays} dias</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-hairline hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  onClick={() => onShowToast(`Pacote "${pkg.name}" adicionado à comanda do PDV.`)}
                >
                  Vender no PDV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Saldo de Pacotes em Andamento dos Clientes */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Pacotes Ativos de Clientes ({customerPackages.length})
          </h3>
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar cliente com pacote..."
            />
          </div>
        </div>

        <Card className="border-hairline bg-card rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 border-b border-hairline text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Pacote Contratado</th>
                  <th className="py-3 px-4 text-center">Saldo Restante</th>
                  <th className="py-3 px-4">Data Compra</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredCustomerPkgs.map((cp) => (
                  <tr key={cp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-foreground block">{cp.customerName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{cp.customerPhone}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{cp.packageName}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-bold text-primary text-sm">{cp.remainingCredits}</span>
                      <span className="text-muted-foreground text-[10px]"> / {cp.totalCredits}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">{cp.purchasedAt}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          cp.status === "ACTIVE"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-muted text-muted-foreground"
                        }`}
                      >
                        {cp.status === "ACTIVE" ? "ATIVO" : "ESGOTADO"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {cp.remainingCredits > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleUseCredit(cp.id)}
                          className="h-7 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-2.5 shadow-xs"
                        >
                          Debitar 1 Corte
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Sem créditos</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
