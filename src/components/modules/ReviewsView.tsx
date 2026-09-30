import React, { useState } from "react";
import {
  Star,
  Users,
  MessageSquare,
  ThumbsUp,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ReviewsView() {
  const [reviews, setReviews] = useState([
    {
      id: "rev-1",
      customerName: "Matthew Wilson",
      barberName: "Gabriel Silva",
      serviceName: "Corte Degradê",
      rating: 5,
      date: "Hoje às 10:15",
      comment: "Melhor degradê da cidade. Atendimento impecável e toalha quente no ponto!",
    },
    {
      id: "rev-2",
      customerName: "Carlos Eduardo Santos",
      barberName: "Gabriel Silva",
      serviceName: "Combo Cabelo + Barba VIP",
      rating: 5,
      date: "Ontem às 18:30",
      comment: "Ambiente muito confortável e a cerveja artesanal da recepção é top.",
    },
    {
      id: "rev-3",
      customerName: "Olivia Brown",
      barberName: "Lucas Ferreira",
      serviceName: "Barboterapia",
      rating: 4,
      date: "28/09/2026",
      comment: "Muito bom, só demorou 5 minutos para chamar mas o resultado foi nota 10.",
    },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Star className="h-6 w-6 text-primary fill-primary" />
            Avaliações de Clientes & Reputação
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Feedback espontâneo dos clientes pós-atendimento para medição da qualidade por profissional.
          </p>
        </div>
      </div>

      {/* Resumo de Reputação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold text-2xl font-mono">
            4.9
          </div>
          <div>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            <span className="text-xs font-bold text-foreground block mt-1">Classificação Geral</span>
            <span className="text-[11px] text-muted-foreground">Baseado em 128 avaliações</span>
          </div>
        </Card>

        <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Índice de Recomendação (NPS)
          </span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">98%</span>
          <p className="text-[11px] text-muted-foreground">Clientes que indicariam a barbearia a amigos</p>
        </Card>

        <Card className="border-hairline bg-card shadow-xs rounded-2xl p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Barbeiro Mais Elogiado
          </span>
          <span className="text-base font-bold text-foreground">Gabriel Silva (4.95 ⭐)</span>
          <p className="text-[11px] text-muted-foreground">Destaque em pontualidade e acabamento</p>
        </Card>
      </div>

      {/* Lista de Avaliações */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Comentários Recentes
        </h3>
        <div className="space-y-3">
          {reviews.map((rev) => (
            <Card key={rev.id} className="border-hairline bg-card shadow-xs rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-foreground">{rev.customerName}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Atendido por <strong className="text-foreground">{rev.barberName}</strong> • {rev.serviceName}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex text-amber-400">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{rev.date}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/90 italic bg-muted/20 p-2.5 rounded-xl border border-hairline/60">
                "{rev.comment}"
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
