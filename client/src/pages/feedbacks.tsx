import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { Progress } from "@/components/ui/progress";
import type { Feedback, TicketStats } from "@shared/schema";

export default function Feedbacks() {
  const { data: feedbacks, isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedbacks"],
  });

  const { data: stats } = useQuery<TicketStats>({
    queryKey: ["/api/stats"],
  });

  const ratingDistribution = feedbacks?.reduce((acc, f) => {
    acc[f.rating] = (acc[f.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  const totalFeedbacks = feedbacks?.length || 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Star className="w-8 h-8 text-chart-4" />
          Feedbacks
        </h1>
        <p className="text-muted-foreground mt-1">
          Avaliações recebidas dos usuários após o atendimento
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Resumo de Avaliações</CardTitle>
            <CardDescription>
              Estatísticas gerais de satisfação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="text-5xl font-bold text-chart-4">
                {stats?.averageRating ? stats.averageRating.toFixed(1) : "—"}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= (stats?.averageRating || 0)
                        ? "fill-chart-4 text-chart-4"
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {totalFeedbacks} avaliações
              </p>
            </div>

            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating] || 0;
                const percentage = totalFeedbacks > 0 ? (count / totalFeedbacks) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="h-3 w-3 fill-chart-4 text-chart-4" />
                    </div>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Avaliações Recentes</CardTitle>
            <CardDescription>
              Feedbacks mais recentes dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackList feedbacks={feedbacks || []} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
