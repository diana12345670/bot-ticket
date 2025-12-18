import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings as SettingsIcon, Bot, MessageSquare, Star, Save, Hash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GuildConfig } from "@shared/schema";

const settingsSchema = z.object({
  ticketCategoryId: z.string().optional(),
  feedbackChannelId: z.string().optional(),
  logChannelId: z.string().optional(),
  staffRoleId: z.string().optional(),
  aiEnabled: z.boolean(),
  aiSystemPrompt: z.string(),
  welcomeMessage: z.string(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const selectedGuildId = urlParams.get("guild");

  const { data: guilds } = useQuery<GuildConfig[]>({
    queryKey: ["/api/guilds"],
  });

  const selectedGuild = guilds?.find(g => g.guildId === selectedGuildId) || guilds?.[0];

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      ticketCategoryId: "",
      feedbackChannelId: "",
      logChannelId: "",
      staffRoleId: "",
      aiEnabled: false,
      aiSystemPrompt: "Você é um assistente de suporte amigável e profissional. Responda de forma clara e objetiva.",
      welcomeMessage: "Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.",
    },
    values: selectedGuild ? {
      ticketCategoryId: selectedGuild.ticketCategoryId || "",
      feedbackChannelId: selectedGuild.feedbackChannelId || "",
      logChannelId: selectedGuild.logChannelId || "",
      staffRoleId: selectedGuild.staffRoleId || "",
      aiEnabled: selectedGuild.aiEnabled || false,
      aiSystemPrompt: selectedGuild.aiSystemPrompt || "Você é um assistente de suporte amigável e profissional. Responda de forma clara e objetiva.",
      welcomeMessage: selectedGuild.welcomeMessage || "Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.",
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      if (!selectedGuild) throw new Error("Nenhum servidor selecionado");
      return apiRequest("PATCH", `/api/guilds/${selectedGuild.guildId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  if (!selectedGuild) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure o comportamento do bot
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <SettingsIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum servidor selecionado</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Adicione o bot a um servidor Discord para configurar suas preferências.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurando: <strong>{selectedGuild.guildName}</strong>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Canais e Cargos
              </CardTitle>
              <CardDescription>
                Configure os IDs dos canais e cargos do Discord
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="ticketCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria de Tickets</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ID da categoria onde os tickets serão criados" 
                        {...field}
                        data-testid="input-ticket-category"
                      />
                    </FormControl>
                    <FormDescription>
                      Os novos canais de tickets serão criados dentro desta categoria
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feedbackChannelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal de Feedback</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ID do canal para exibir feedbacks" 
                        {...field}
                        data-testid="input-feedback-channel"
                      />
                    </FormControl>
                    <FormDescription>
                      As avaliações dos usuários serão enviadas para este canal
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logChannelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal de Logs</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ID do canal para logs de atividades" 
                        {...field}
                        data-testid="input-log-channel"
                      />
                    </FormControl>
                    <FormDescription>
                      Registros de abertura/fechamento de tickets
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="staffRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo da Equipe</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ID do cargo que pode ver os tickets" 
                        {...field}
                        data-testid="input-staff-role"
                      />
                    </FormControl>
                    <FormDescription>
                      Membros com este cargo terão acesso a todos os tickets
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Mensagens
              </CardTitle>
              <CardDescription>
                Personalize as mensagens do bot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem de Boas-vindas</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Mensagem exibida ao criar um novo ticket" 
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-welcome-message"
                      />
                    </FormControl>
                    <FormDescription>
                      Esta mensagem será enviada quando um usuário criar um ticket
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Inteligência Artificial
              </CardTitle>
              <CardDescription>
                Configure o atendimento por IA (ChatGPT)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="aiEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativar IA</FormLabel>
                      <FormDescription>
                        Permitir que a IA responda automaticamente em tickets
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-ai-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aiSystemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt do Sistema</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Instruções para a IA" 
                        className="min-h-[120px]"
                        {...field}
                        data-testid="input-ai-prompt"
                      />
                    </FormControl>
                    <FormDescription>
                      Define como a IA deve se comportar e responder
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
