import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Server, Key, Settings, Ticket, MessageSquare, Users, Loader2, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { GuildConfig, Ticket as TicketType, Feedback } from "@shared/schema";

interface GuildWithStats extends GuildConfig {
  stats: {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    averageRating: number;
    totalFeedbacks: number;
  };
}

export default function Guilds() {
  const [serverKey, setServerKey] = useState("");
  const [authenticatedKey, setAuthenticatedKey] = useState<string | null>(
    localStorage.getItem("serverKey")
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guild, isLoading: isLoadingGuild } = useQuery<GuildWithStats>({
    queryKey: ["/api/dashboard/guild", authenticatedKey],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/guild", {
        headers: { "Authorization": `Bearer ${authenticatedKey}` },
      });
      if (!res.ok) throw new Error("Guild not found");
      return res.json();
    },
    enabled: !!authenticatedKey,
  });

  const { data: tickets } = useQuery<TicketType[]>({
    queryKey: ["/api/dashboard/tickets", authenticatedKey],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/tickets", {
        headers: { "Authorization": `Bearer ${authenticatedKey}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    enabled: !!authenticatedKey,
  });

  const { data: feedbacks } = useQuery<Feedback[]>({
    queryKey: ["/api/dashboard/feedbacks", authenticatedKey],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/feedbacks", {
        headers: { "Authorization": `Bearer ${authenticatedKey}` },
      });
      if (!res.ok) throw new Error("Failed to fetch feedbacks");
      return res.json();
    },
    enabled: !!authenticatedKey,
  });

  const authMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch("/api/auth/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverKey: key }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid key");
      }
      return res.json();
    },
    onSuccess: () => {
      localStorage.setItem("serverKey", serverKey);
      setAuthenticatedKey(serverKey);
      toast({ title: "Conectado!", description: "Servidor autenticado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<GuildConfig>) => {
      const res = await fetch("/api/dashboard/guild", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authenticatedKey}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/guild", authenticatedKey] });
      toast({ title: "Salvo!", description: "Configurações atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (serverKey.trim()) {
      authMutation.mutate(serverKey.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("serverKey");
    setAuthenticatedKey(null);
    setServerKey("");
  };

  if (!authenticatedKey) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Server className="w-8 h-8 text-primary" />
            Gerenciar Servidor
          </h1>
          <p className="text-muted-foreground mt-1">
            Insira a chave do servidor para acessar o painel de gerenciamento
          </p>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Autenticação
            </CardTitle>
            <CardDescription>
              Use o comando /servidor-key no Discord para obter sua chave
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="serverKey">Chave do Servidor</Label>
                <Input
                  id="serverKey"
                  type="password"
                  placeholder="Cole sua chave aqui..."
                  value={serverKey}
                  onChange={(e) => setServerKey(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={authMutation.isPending || !serverKey.trim()}>
                {authMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingGuild) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Servidor não encontrado. A chave pode ter sido regenerada.</p>
            <Button className="mt-4" variant="outline" onClick={handleLogout}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {guild.guildIcon && (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.guildId}/${guild.guildIcon}.png`}
              alt={guild.guildName}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{guild.guildName}</h1>
            <p className="text-muted-foreground">Painel de Gerenciamento</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{guild.stats?.totalTickets || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{guild.stats?.openTickets || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Feedbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{guild.stats?.totalFeedbacks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avaliação Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {guild.stats?.averageRating ? guild.stats.averageRating.toFixed(1) : "N/A"} ⭐
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Tickets ({tickets?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedbacks ({feedbacks?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mensagem de Boas-vindas</Label>
                  <Textarea
                    defaultValue={guild.welcomeMessage || ""}
                    onBlur={(e) => updateMutation.mutate({ welcomeMessage: e.target.value })}
                    placeholder="Mensagem exibida ao abrir um ticket"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID do Cargo Staff</Label>
                  <Input
                    defaultValue={guild.staffRoleId || ""}
                    onBlur={(e) => updateMutation.mutate({ staffRoleId: e.target.value })}
                    placeholder="ID do cargo que pode ver tickets"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID da Categoria de Tickets</Label>
                  <Input
                    defaultValue={guild.ticketCategoryId || ""}
                    onBlur={(e) => updateMutation.mutate({ ticketCategoryId: e.target.value })}
                    placeholder="ID da categoria onde tickets são criados"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>IA Habilitada</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que a IA responda tickets automaticamente
                    </p>
                  </div>
                  <Switch
                    checked={guild.aiEnabled || false}
                    onCheckedChange={(checked) => updateMutation.mutate({ aiEnabled: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prompt da IA</Label>
                  <Textarea
                    defaultValue={guild.aiSystemPrompt || ""}
                    onBlur={(e) => updateMutation.mutate({ aiSystemPrompt: e.target.value })}
                    placeholder="Instruções/personalidade da IA"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Canais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Canal de Logs</Label>
                  <Input
                    defaultValue={guild.logChannelId || ""}
                    onBlur={(e) => updateMutation.mutate({ logChannelId: e.target.value })}
                    placeholder="ID do canal de logs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Canal de Feedback</Label>
                  <Input
                    defaultValue={guild.feedbackChannelId || ""}
                    onBlur={(e) => updateMutation.mutate({ feedbackChannelId: e.target.value })}
                    placeholder="ID do canal de feedbacks"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Painel de Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título do Painel</Label>
                  <Input
                    defaultValue={guild.panelTitle || ""}
                    onBlur={(e) => updateMutation.mutate({ panelTitle: e.target.value })}
                    placeholder="Título do embed"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição do Painel</Label>
                  <Textarea
                    defaultValue={guild.panelDescription || ""}
                    onBlur={(e) => updateMutation.mutate({ panelDescription: e.target.value })}
                    placeholder="Descrição do embed"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto do Botão</Label>
                  <Input
                    defaultValue={guild.panelButtonText || ""}
                    onBlur={(e) => updateMutation.mutate({ panelButtonText: e.target.value })}
                    placeholder="Texto do botão de criar ticket"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Usuário</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Staff</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets?.map((ticket) => (
                      <tr key={ticket.id} className="border-t">
                        <td className="px-4 py-3 text-sm font-mono">
                          #{ticket.ticketNumber.toString().padStart(4, "0")}
                        </td>
                        <td className="px-4 py-3 text-sm">{ticket.userName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              ticket.status === "open"
                                ? "bg-green-100 text-green-700"
                                : ticket.status === "waiting"
                                ? "bg-yellow-100 text-yellow-700"
                                : ticket.status === "closed"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{ticket.staffName || "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("pt-BR") : "-"}
                        </td>
                      </tr>
                    ))}
                    {(!tickets || tickets.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum ticket encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedbacks" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {feedbacks?.map((feedback) => (
              <Card key={feedback.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{feedback.userName}</CardTitle>
                    <span className="text-yellow-500">
                      {"⭐".repeat(feedback.rating)}
                      {"☆".repeat(5 - feedback.rating)}
                    </span>
                  </div>
                  <CardDescription>
                    Staff: {feedback.staffName || "N/A"}
                  </CardDescription>
                </CardHeader>
                {feedback.comment && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground italic">"{feedback.comment}"</p>
                  </CardContent>
                )}
              </Card>
            ))}
            {(!feedbacks || feedbacks.length === 0) && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum feedback encontrado
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
