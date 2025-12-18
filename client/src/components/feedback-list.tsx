import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Feedback } from "@shared/schema";

interface FeedbackListProps {
  feedbacks: Feedback[];
  isLoading?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-chart-4 text-chart-4"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function FeedbackList({ feedbacks, isLoading }: FeedbackListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Star className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Nenhum feedback ainda</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Os feedbacks aparecerão aqui quando os usuários avaliarem o suporte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id} data-testid={`card-feedback-${feedback.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {feedback.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{feedback.userName}</span>
                    <StarRating rating={feedback.rating} />
                  </div>
                  {feedback.comment && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {feedback.comment}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    {feedback.staffName && (
                      <span>Atendido por: {feedback.staffName}</span>
                    )}
                    <span>•</span>
                    <span>
                      {feedback.createdAt
                        ? formatDistanceToNow(new Date(feedback.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
