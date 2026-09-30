import React, { useState, useMemo } from "react";
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Barcode,
  ScanBarcode,
  Sparkles,
  TrendingUp,
  Tag,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ProductItem } from "@/routes/index";

interface StockViewProps {
  products: ProductItem[];
  onOpenNewProductModal: () => void;
  onToggleQuickPos: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
}

export function StockView({
  products,
  onOpenNewProductModal,
  onToggleQuickPos,
  onAdjustStock,
}: StockViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Package className="h-6 w-6 text-primary" />
            Controle de Estoque & Produtos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preço de custo, código de barras, margem bruta, saldo e seleção de destaque rápido no PDV.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer font-semibold h-9 px-4"
          onClick={onOpenNewProductModal}
        >
          <Plus className="h-4 w-4" />
          <span>Novo Produto</span>
        </Button>
      </div>

      {/* Barra de Busca de Produtos */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por nome, SKU, código de barras ou categoria..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 text-xs bg-card border-hairline"
        />
      </div>

      <Card className="border-hairline bg-card rounded-2xl shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-hairline">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-xs">
                Nenhum produto cadastrado ou encontrado com este filtro.
              </div>
            ) : (
              filtered.map((prod) => {
                const marginAmount = prod.sale - prod.cost;
                const marginPercent = prod.sale > 0 ? ((marginAmount / prod.sale) * 100).toFixed(1) : "0.0";
                const isLowStock = prod.stock <= prod.min;

                return (
                  <div
                    key={prod.id}
                    className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{prod.name}</span>
                        <Badge variant="outline" className="text-[10px] border-hairline text-muted-foreground">
                          {prod.category}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">SKU: {prod.sku}</span>
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                          <Barcode className="h-3 w-3 text-primary" /> {prod.barcode}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono mt-1.5 text-muted-foreground">
                        <span>Custo: <strong className="text-foreground">R$ {prod.cost.toFixed(2)}</strong></span>
                        <span>•</span>
                        <span>Venda: <strong className="text-primary font-bold">R$ {prod.sale.toFixed(2)}</strong></span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">
                          Margem: {marginPercent}% (+ R$ {marginAmount.toFixed(2)})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs self-end lg:self-auto">
                      {/* Destaque no PDV Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleQuickPos(prod.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          prod.isQuickPos
                            ? "bg-primary/20 text-primary border-primary shadow-xs"
                            : "bg-muted/30 text-muted-foreground border-hairline hover:text-foreground"
                        }`}
                        title="Alternar se o item aparece na grade de 1 clique da Frente de Caixa"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{prod.isQuickPos ? "Destaque PDV: Sim" : "Destaque PDV: Não"}</span>
                      </button>

                      {/* Controle de Saldo de Estoque */}
                      <div className="flex items-center gap-2 bg-muted/30 border border-hairline px-3 py-1 rounded-xl">
                        <button
                          onClick={() => onAdjustStock(prod.id, -1)}
                          className="h-6 w-6 rounded bg-card hover:bg-muted text-foreground flex items-center justify-center font-bold text-xs cursor-pointer border border-hairline"
                          title="Diminuir 1 un"
                        >
                          -
                        </button>

                        <div className="text-center font-mono px-2">
                          <span
                            className={`font-bold text-sm block ${
                              isLowStock ? "text-red-400 animate-pulse" : "text-foreground"
                            }`}
                          >
                            {prod.stock} {prod.unit}
                          </span>
                          <span className="text-[9px] text-muted-foreground block">Mín: {prod.min}</span>
                        </div>

                        <button
                          onClick={() => onAdjustStock(prod.id, 1)}
                          className="h-6 w-6 rounded bg-card hover:bg-muted text-foreground flex items-center justify-center font-bold text-xs cursor-pointer border border-hairline"
                          title="Adicionar 1 un"
                        >
                          +
                        </button>
                      </div>

                      {isLowStock && (
                        <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] py-1 px-2.5">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Repor
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
