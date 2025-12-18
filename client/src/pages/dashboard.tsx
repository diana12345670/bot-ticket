import { useQuery } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Star, 
  CheckCircle2,
  Clock,
  Bot
} from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { TicketTable } from "@/components/ticket-table";
import { FeedbackList } from "@/components/feedback-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Ticket, Feedback, TicketStats } from "@shared/schema";

type BotStatus = {
  online: boolean;
  guilds: number;
  users: number;
  ping: number;
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<TicketStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentTickets, isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets/recent"],
  });

  const { data: recentFeedbacks, isLoading: feedbacksLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedbacks/recent"],
  });

  const { data: botStatus } = useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 10000,
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do sistema de tickets
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Tickets"
          value={statsLoading ? "—" : stats?.totalTickets || 0}
          description="Todos os tickets criados"
          icon={MessageSquare}
        />
        <StatsCard
          title="Tickets Abertos"
          value={statsLoading ? "—" : stats?.openTickets || 0}
          description="Aguardando atendimento"
          icon={Clock}
        />
        <StatsCard
          title="Tickets Fechados"
          value={statsLoading ? "—" : stats?.closedTickets || 0}
          description="Resolvidos com sucesso"
          icon={CheckCircle2}
        />
        <StatsCard
          title="Avaliação Média"
          value={statsLoading ? "—" : stats?.averageRating ? `${stats.averageRating.toFixed(1)} / 5` : "—"}
          description={`${stats?.totalFeedbacks || 0} avaliações`}
          icon={Star}
        />
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets" data-testid="tab-tickets">
            <MessageSquare className="w-4 h-4 mr-2" />
            Tickets Recentes
          </TabsTrigger>
          <TabsTrigger value="feedbacks" data-testid="tab-feedbacks">
            <Star className="w-4 h-4 mr-2" />
            Feedbacks Recentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Últimos Tickets</CardTitle>
              <CardDescription>
                Os tickets mais recentes criados no servidor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketTable 
                tickets={recentTickets || []} 
                isLoading={ticketsLoading} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedbacks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Últimas Avaliações</CardTitle>
              <CardDescription>
                Feedbacks recebidos dos usuários após o fechamento dos tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackList 
                feedbacks={recentFeedbacks || []} 
                isLoading={feedbacksLoading} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <CardTitle>Status do Bot</CardTitle>
          </div>
          <CardDescription>
            Informações sobre o funcionamento do bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 rounded-md bg-muted/50">
              <div className={`w-3 h-3 rounded-full ${botStatus?.online ? 'bg-status-online animate-pulse' : 'bg-status-offline'}`} />
              <div>
                <p className="font-medium">{botStatus?.online ? 'Bot Online' : 'Bot Offline'}</p>
                <p className="text-sm text-muted-foreground">
                  {botStatus?.online 
                    ? 'O bot está funcionando e pronto para receber comandos'
                    : 'O bot não está conectado ao Discord'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1 p-4 rounded-md bg-muted/30">
                <span className="text-2xl font-bold" data-testid="text-guilds-count">
                  {botStatus?.guilds || 0}
                </span>
                <span className="text-sm text-muted-foreground">Servidores conectados</span>
              </div>
              <div className="flex flex-col gap-1 p-4 rounded-md bg-muted/30">
                <span className="text-2xl font-bold" data-testid="text-users-count">
                  {botStatus?.users || 0}
                </span>
                <span className="text-sm text-muted-foreground">Usuários alcançáveis</span>
              </div>
              <div className="flex flex-col gap-1 p-4 rounded-md bg-muted/30">
                <span className="text-2xl font-bold" data-testid="text-ping">
                  {botStatus?.ping || 0}ms
                </span>
                <span className="text-sm text-muted-foreground">Latência da API</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
