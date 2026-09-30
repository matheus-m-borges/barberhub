import React, { useState } from "react";
import {
  Truck,
  ShoppingCart,
  Plus,
  CheckCircle,
  Package,
  Phone,
  FileText,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  cnpj: string;
  pixKey: string;
  category: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplierName: string;
  itemsCount: number;
  totalAmount: number;
  status: "PENDING" | "RECEIVED" | "CANCELED";
  orderDate: string;
  receivedDate?: string | null;
}

interface SuppliersPurchasesViewProps {
  initialTab?: "SUPPLIERS" | "PURCHASES";
  onShowToast: (msg: string) => void;
}

export function SuppliersPurchasesView({
  initialTab = "SUPPLIERS",
  onShowToast,
}: SuppliersPurchasesViewProps) {
  const [activeTab, setActiveTab] = useState<"SUPPLIERS" | "PURCHASES">(initialTab);
  const [search, setSearch] = useState("");

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: "sup-1",
      name: "Distribuidora Barber Cosméticos Brasil",
      contactName: "Rogério Antunes",
      phone: "(11) 98765-1122",
      cnpj: "23.456.789/0001-12",
      pixKey: "financeiro@barbercosmeticos.com.br",
      category: "Pomadas & Shampoos",
      status: "ACTIVE",
    },
    {
      id: "sup-2",
      name: "Feather Lâminas & Descartáveis",
      contactName: "Tatiane Mello",
      phone: "(11) 97654-2233",
      cnpj: "34.567.890/0001-23",
      pixKey: "pix@featherbrasil.com",
      category: "Insumos & Descartáveis",
      status: "ACTIVE",
    },
    {
      id: "sup-3",
      name: "Cervejaria Artesanal Hop Lounge",
      contactName: "Marcos Cervejeiro",
      phone: "(11) 96543-3344",
      cnpj: "45.678.901/0001-34",
      pixKey: "marcos@hoplounge.com",
      category: "Bebidas Lounge",
      status: "ACTIVE",
    },
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: "po-1",
      code: "PC-9841",
      supplierName: "Distribuidora Barber Cosméticos Brasil",
      itemsCount: 30, // 30 pomadas
      totalAmount: 540.0,
      status: "RECEIVED",
      orderDate: "20/09/2026",
      receivedDate: "23/09/2026",
    },
    {
      id: "po-2",
      code: "PC-9842",
      supplierName: "Feather Lâminas & Descartáveis",
      itemsCount: 500, // lâminas e toalhas
      totalAmount: 320.0,
      status: "PENDING",
      orderDate: "28/09/2026",
      receivedDate: null,
    },
  ]);

  const handleReceiveOrder = (id: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === id
          ? { ...po, status: "RECEIVED", receivedDate: "Hoje às " + new Date().toLocaleTimeString().slice(0, 5) }
          : po
      )
    );
    onShowToast("Mercadoria recebida! Estoque aumentado e fatura lançada em Contas a Pagar.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-primary" />
            Fornecedores & Pedidos de Compra
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fluxo de suprimentos: Ordem de Compra → Recebimento Físico no Estoque → Lançamento em Contas a Pagar.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center rounded-xl bg-card border border-hairline p-1 text-xs">
          <button
            onClick={() => setActiveTab("SUPPLIERS")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "SUPPLIERS" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Fornecedores ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab("PURCHASES")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === "PURCHASES" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Ordens de Compra ({purchaseOrders.length})
          </button>
        </div>
      </div>

      {activeTab === "SUPPLIERS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-hairline shadow-xs">
            <div className="w-full sm:w-72">
              <SearchInput value={search} onValueChange={setSearch} placeholder="Buscar fornecedor..." />
            </div>
            <Button
              size="sm"
              onClick={() => onShowToast("Cadastrar novo fornecedor...")}
              className="h-9 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Fornecedor</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <Card key={sup.id} className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] font-bold">
                      {sup.category}
                    </Badge>
                    <Badge
                      className={`text-[9px] font-bold ${
                        sup.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      ATIVO
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-foreground mt-2">{sup.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Contato: {sup.contactName}</p>
                </div>

                <div className="space-y-1 pt-2 border-t border-hairline text-[11px] text-muted-foreground font-mono">
                  <div>CNPJ: {sup.cnpj}</div>
                  <div>WhatsApp: {sup.phone}</div>
                  <div>Pix: {sup.pixKey}</div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs border-hairline hover:bg-muted cursor-pointer"
                    onClick={() => {
                      const cleanPhone = sup.phone.replace(/\D/g, "");
                      window.open(`https://wa.me/55${cleanPhone}?text=Olá,%20gostaria%20de%20fazer%20uma%20cotação.`, "_blank");
                    }}
                  >
                    <Phone className="h-3 w-3 mr-1 text-emerald-400" />
                    Chamar no Whats
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "PURCHASES" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card p-3 rounded-2xl border border-hairline shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground">
              Ordens de Compra Emitidas para Reposição
            </span>
            <Button
              size="sm"
              onClick={() => onShowToast("Emitir nova ordem de compra...")}
              className="h-8.5 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Compra</span>
            </Button>
          </div>

          <Card className="border-hairline bg-card rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-hairline text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4 text-center">Itens</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4">Data Emissão</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{po.code}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{po.supplierName}</td>
                      <td className="py-3 px-4 text-center font-mono">{po.itemsCount} un</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                        R$ {po.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{po.orderDate}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            po.status === "RECEIVED"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {po.status === "RECEIVED" ? "RECEBIDO" : "PENDENTE"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status === "PENDING" ? (
                          <Button
                            size="sm"
                            onClick={() => handleReceiveOrder(po.id)}
                            className="h-7 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-2.5"
                          >
                            Dar Entrada
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Recebido {po.receivedDate}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
