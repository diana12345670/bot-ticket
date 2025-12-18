import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  Bot, 
  MessageSquare, 
  Save, 
  Hash, 
  Palette, 
  Layout, 
  Plus, 
  Trash2, 
  Edit,
  Send,
  Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type DiscordChannel = {
  id: string;
  name: string;
  type: string;
};

type DiscordRole = {
  id: string;
  name: string;
  color: string;
  position: number;
};

type DiscordEmoji = {
  id: string;
  name: string;
  animated: boolean;
  url: string;
  identifier: string;
};

type GuildConfig = {
  id: number;
  guildId: string;
  guildName: string;
  guildIcon?: string;
  staffRoleId?: string;
  ticketCategoryId?: string;
  logChannelId?: string;
  feedbackChannelId?: string;
  aiEnabled: boolean;
  aiSystemPrompt?: string;
  welcomeMessage?: string;
};

type Panel = {
  id: string;
  guildId: string;
  channelId: string;
  title: string;
  description: string;
  embedColor: string;
  categoryId?: string;
  welcomeMessage?: string;
  isConfigured: boolean;
  buttons?: PanelButton[];
};

type PanelButton = {
  id: string;
  panelId: string;
  label: string;
  emoji?: string;
  style: string;
  order: number;
};

const BUTTON_COLORS = [
  { value: "primary", label: "Azul (Blurple)", color: "#5865F2" },
  { value: "secondary", label: "Cinza", color: "#4F545C" },
  { value: "success", label: "Verde", color: "#57F287" },
  { value: "danger", label: "Vermelho", color: "#ED4245" },
];

const EMBED_COLORS = [
  { value: "#5865F2", label: "Azul Discord" },
  { value: "#57F287", label: "Verde" },
  { value: "#FEE75C", label: "Amarelo" },
  { value: "#EB459E", label: "Rosa" },
  { value: "#ED4245", label: "Vermelho" },
  { value: "#9B59B6", label: "Roxo" },
  { value: "#3498DB", label: "Azul Claro" },
  { value: "#E67E22", label: "Laranja" },
];

export default function Settings() {
  const { toast } = useToast();
  const [serverKey, setServerKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [guildData, setGuildData] = useState<GuildConfig | null>(null);
  
  const [formData, setFormData] = useState({
    ticketCategoryId: "",
    feedbackChannelId: "",
    logChannelId: "",
    staffRoleId: "",
    aiEnabled: false,
    aiSystemPrompt: "Voce e um assistente de suporte amigavel e profissional. Responda de forma clara e objetiva.",
    welcomeMessage: "Bem-vindo ao suporte! Um membro da equipe ira atende-lo em breve.",
  });

  const [panelDialogOpen, setPanelDialogOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [newPanel, setNewPanel] = useState({
    channelId: "",
    title: "Sistema de Tickets",
    description: "Clique no botao abaixo para abrir um ticket.",
    embedColor: "#5865F2",
    categoryId: "",
    welcomeMessage: "",
  });

  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<PanelButton | null>(null);
  const [newButton, setNewButton] = useState({
    label: "Abrir Ticket",
    emoji: "",
    style: "primary",
  });
  const [selectedPanelForButton, setSelectedPanelForButton] = useState<string | null>(null);

  const getAuthHeaders = () => ({
    "Authorization": `Bearer ${authToken}`,
    "Content-Type": "application/json",
  });

  const handleFetchError = (res: Response, endpoint: string) => {
    if (res.status === 401) {
      setIsAuthenticated(false);
      toast({
        title: "Sessao expirada",
        description: "Faca login novamente.",
        variant: "destructive",
      });
    }
  };

  const { data: channels } = useQuery<DiscordChannel[]>({
    queryKey: ["/api/dashboard/channels", authToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/channels", { headers: getAuthHeaders() });
      if (!res.ok) {
        handleFetchError(res, "channels");
        return [];
      }
      return res.json();
    },
  });

  const { data: categories } = useQuery<DiscordChannel[]>({
    queryKey: ["/api/dashboard/categories", authToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/categories", { headers: getAuthHeaders() });
      if (!res.ok) {
        handleFetchError(res, "categories");
        return [];
      }
      return res.json();
    },
  });

  const { data: roles } = useQuery<DiscordRole[]>({
    queryKey: ["/api/dashboard/roles", authToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/roles", { headers: getAuthHeaders() });
      if (!res.ok) {
        handleFetchError(res, "roles");
        return [];
      }
      return res.json();
    },
  });

  const { data: emojis } = useQuery<DiscordEmoji[]>({
    queryKey: ["/api/dashboard/emojis", authToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/emojis", { headers: getAuthHeaders() });
      if (!res.ok) {
        handleFetchError(res, "emojis");
        return [];
      }
      return res.json();
    },
  });

  const { data: panels, refetch: refetchPanels } = useQuery<Panel[]>({
    queryKey: ["/api/dashboard/panels", authToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/panels", { headers: getAuthHeaders() });
      if (!res.ok) {
        handleFetchError(res, "panels");
        return [];
      }
      return res.json();
    },
  });

  const { data: guild, refetch: refetchGuild } = useQuery<GuildConfig | null>({
    queryKey: ["/api/dashboard/guild", authToken],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/guild", { headers: getAuthHeaders() });
      if (!res.ok) {
        handleFetchError(res, "guild");
        return null;
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (guild) {
      setGuildData(guild);
      setFormData({
        ticketCategoryId: guild.ticketCategoryId || "",
        feedbackChannelId: guild.feedbackChannelId || "",
        logChannelId: guild.logChannelId || "",
        staffRoleId: guild.staffRoleId || "",
        aiEnabled: guild.aiEnabled || false,
        aiSystemPrompt: guild.aiSystemPrompt || "Voce e um assistente de suporte amigavel e profissional. Responda de forma clara e objetiva.",
        welcomeMessage: guild.welcomeMessage || "Bem-vindo ao suporte! Um membro da equipe ira atende-lo em breve.",
      });
    }
  }, [guild]);

  const handleAuthenticate = async () => {
    try {
      const res = await fetch("/api/auth/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverKey }),
      });
      
      if (res.ok) {
        setAuthToken(serverKey);
        setIsAuthenticated(true);
        toast({
          title: "Autenticado com sucesso!",
          description: "Bem-vindo ao painel de configuracoes.",
        });
      } else {
        toast({
          title: "Chave invalida",
          description: "Verifique a chave do servidor e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro de conexao",
        description: "Nao foi possivel conectar ao servidor.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/dashboard/guild", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          title: "Configuracoes salvas!",
          description: "As alteracoes foram aplicadas com sucesso.",
        });
        refetchGuild();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Nao foi possivel salvar as configuracoes.",
        variant: "destructive",
      });
    }
  };

  const handleCreatePanel = async () => {
    try {
      const res = await fetch("/api/dashboard/panels", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newPanel),
      });

      if (res.ok) {
        toast({
          title: "Painel criado!",
          description: "O painel foi criado com sucesso.",
        });
        setPanelDialogOpen(false);
        refetchPanels();
        setNewPanel({
          channelId: "",
          title: "Sistema de Tickets",
          description: "Clique no botao abaixo para abrir um ticket.",
          embedColor: "#5865F2",
          categoryId: "",
          welcomeMessage: "",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao criar painel",
        description: "Nao foi possivel criar o painel.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePanel = async () => {
    if (!editingPanel) return;
    
    try {
      const res = await fetch(`/api/dashboard/panels/${editingPanel.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editingPanel.title,
          description: editingPanel.description,
          embedColor: editingPanel.embedColor,
          categoryId: editingPanel.categoryId,
          welcomeMessage: editingPanel.welcomeMessage,
        }),
      });

      if (res.ok) {
        toast({
          title: "Painel atualizado!",
          description: "As alteracoes foram salvas.",
        });
        setEditingPanel(null);
        refetchPanels();
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Nao foi possivel atualizar o painel.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePanel = async (panelId: string) => {
    try {
      const res = await fetch(`/api/dashboard/panels/${panelId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        toast({
          title: "Painel excluido",
          description: "O painel foi removido.",
        });
        refetchPanels();
      }
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        variant: "destructive",
      });
    }
  };

  const handleAddButton = async () => {
    if (!selectedPanelForButton) return;

    try {
      const res = await fetch(`/api/dashboard/panels/${selectedPanelForButton}/buttons`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newButton),
      });

      if (res.ok) {
        toast({
          title: "Botao adicionado!",
        });
        setButtonDialogOpen(false);
        refetchPanels();
        setNewButton({ label: "Abrir Ticket", emoji: "", style: "primary" });
      }
    } catch (error) {
      toast({
        title: "Erro ao adicionar botao",
        variant: "destructive",
      });
    }
  };

  const handleUpdateButton = async () => {
    if (!editingButton) return;

    try {
      const res = await fetch(`/api/dashboard/buttons/${editingButton.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          label: editingButton.label,
          emoji: editingButton.emoji,
          style: editingButton.style,
        }),
      });

      if (res.ok) {
        toast({ title: "Botao atualizado!" });
        setEditingButton(null);
        refetchPanels();
      }
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDeleteButton = async (buttonId: string) => {
    try {
      const res = await fetch(`/api/dashboard/buttons/${buttonId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        toast({ title: "Botao removido" });
        refetchPanels();
      }
    } catch (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-md mx-auto mt-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              Acessar Configuracoes
            </CardTitle>
            <CardDescription>
              Digite a chave do servidor para acessar o painel de configuracoes. 
              Use o comando /servidor-key no Discord para obter sua chave.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="serverKey">Chave do Servidor</Label>
              <Input
                id="serverKey"
                type="password"
                placeholder="Digite a chave do servidor..."
                value={serverKey}
                onChange={(e) => setServerKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
              />
            </div>
            <Button onClick={handleAuthenticate} className="w-full">
              Acessar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Configuracoes
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurando: <strong>{guildData?.guildName || "Carregando..."}</strong>
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
          Sair
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <Hash className="w-4 h-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="panels">
            <Layout className="w-4 h-4 mr-2" />
            Paineis
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Bot className="w-4 h-4 mr-2" />
            IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Canais e Cargos
              </CardTitle>
              <CardDescription>
                Selecione os canais e cargos do servidor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria de Tickets</Label>
                  <Select 
                    value={formData.ticketCategoryId} 
                    onValueChange={(v) => setFormData({...formData, ticketCategoryId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Tickets serao criados nesta categoria
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cargo Staff</Label>
                  <Select 
                    value={formData.staffRoleId} 
                    onValueChange={(v) => setFormData({...formData, staffRoleId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <span style={{ color: role.color }}>{role.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Membros com este cargo podem ver tickets
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Canal de Logs</Label>
                  <Select 
                    value={formData.logChannelId} 
                    onValueChange={(v) => setFormData({...formData, logChannelId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels?.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          #{ch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Logs de abertura/fechamento de tickets
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Canal de Feedback</Label>
                  <Select 
                    value={formData.feedbackChannelId} 
                    onValueChange={(v) => setFormData({...formData, feedbackChannelId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels?.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          #{ch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Avaliacoes dos usuarios serao enviadas aqui
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Mensagem de Boas-vindas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Mensagem exibida ao criar um novo ticket"
                className="min-h-[100px]"
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({...formData, welcomeMessage: e.target.value})}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configuracoes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="panels" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Paineis de Tickets</h2>
              <p className="text-muted-foreground">
                Gerencie os paineis de tickets do servidor
              </p>
            </div>
            <Dialog open={panelDialogOpen} onOpenChange={setPanelDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Painel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar Novo Painel</DialogTitle>
                  <DialogDescription>
                    Configure o painel de tickets
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Canal</Label>
                    <Select 
                      value={newPanel.channelId} 
                      onValueChange={(v) => setNewPanel({...newPanel, channelId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o canal" />
                      </SelectTrigger>
                      <SelectContent>
                        {channels?.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            #{ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Titulo</Label>
                    <Input
                      value={newPanel.title}
                      onChange={(e) => setNewPanel({...newPanel, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descricao</Label>
                    <Textarea
                      value={newPanel.description}
                      onChange={(e) => setNewPanel({...newPanel, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Embed</Label>
                    <Select 
                      value={newPanel.embedColor} 
                      onValueChange={(v) => setNewPanel({...newPanel, embedColor: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMBED_COLORS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded" 
                                style={{ backgroundColor: c.value }}
                              />
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria para Tickets</Label>
                    <Select 
                      value={newPanel.categoryId} 
                      onValueChange={(v) => setNewPanel({...newPanel, categoryId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Usar categoria padrao" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPanelDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePanel}>
                    Criar Painel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {panels && panels.length > 0 ? (
            <div className="grid gap-4">
              {panels.map((panel) => (
                <Card key={panel.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: panel.embedColor }}
                          />
                          {panel.title}
                        </CardTitle>
                        <CardDescription>
                          Canal: #{channels?.find(c => c.id === panel.channelId)?.name || panel.channelId}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingPanel(panel)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeletePanel(panel.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">{panel.description}</p>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Botoes</Label>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedPanelForButton(panel.id);
                              setButtonDialogOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {panel.buttons?.map((btn) => (
                            <div
                              key={btn.id}
                              className="flex items-center gap-1 px-3 py-1 rounded text-white text-sm cursor-pointer"
                              style={{ 
                                backgroundColor: BUTTON_COLORS.find(c => c.value === btn.style)?.color || "#5865F2"
                              }}
                              onClick={() => setEditingButton(btn)}
                            >
                              {btn.emoji && <span>{btn.emoji}</span>}
                              {btn.label}
                              <button 
                                className="ml-1 opacity-70 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteButton(btn.id);
                                }}
                              >
                                x
                              </button>
                            </div>
                          ))}
                          {(!panel.buttons || panel.buttons.length === 0) && (
                            <p className="text-sm text-muted-foreground">
                              Nenhum botao configurado
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layout className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum painel criado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie um painel de tickets para seus usuarios
                </p>
                <Button onClick={() => setPanelDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Painel
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Inteligencia Artificial
              </CardTitle>
              <CardDescription>
                Configure o atendimento automatico por IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base">Ativar IA</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que a IA responda automaticamente em tickets
                  </p>
                </div>
                <Switch
                  checked={formData.aiEnabled}
                  onCheckedChange={(v) => setFormData({...formData, aiEnabled: v})}
                />
              </div>

              <div className="space-y-2">
                <Label>Prompt do Sistema</Label>
                <Textarea
                  placeholder="Instrucoes para a IA"
                  className="min-h-[150px]"
                  value={formData.aiSystemPrompt}
                  onChange={(e) => setFormData({...formData, aiSystemPrompt: e.target.value})}
                />
                <p className="text-sm text-muted-foreground">
                  Define como a IA deve se comportar e responder
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configuracoes
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingPanel} onOpenChange={(open) => !open && setEditingPanel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Painel</DialogTitle>
          </DialogHeader>
          {editingPanel && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input
                  value={editingPanel.title}
                  onChange={(e) => setEditingPanel({...editingPanel, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  value={editingPanel.description}
                  onChange={(e) => setEditingPanel({...editingPanel, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor do Embed</Label>
                <Select 
                  value={editingPanel.embedColor} 
                  onValueChange={(v) => setEditingPanel({...editingPanel, embedColor: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMBED_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: c.value }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria para Tickets</Label>
                <Select 
                  value={editingPanel.categoryId || ""} 
                  onValueChange={(v) => setEditingPanel({...editingPanel, categoryId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Usar categoria padrao" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mensagem de Boas-vindas (opcional)</Label>
                <Textarea
                  value={editingPanel.welcomeMessage || ""}
                  onChange={(e) => setEditingPanel({...editingPanel, welcomeMessage: e.target.value})}
                  placeholder="Deixe vazio para usar a mensagem padrao"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPanel(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePanel}>
              Salvar Alteracoes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={buttonDialogOpen} onOpenChange={setButtonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Botao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texto do Botao</Label>
              <Input
                value={newButton.label}
                onChange={(e) => setNewButton({...newButton, label: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Emoji (opcional)</Label>
              {emojis && emojis.length > 0 ? (
                <Select 
                  value={newButton.emoji} 
                  onValueChange={(v) => setNewButton({...newButton, emoji: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um emoji" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {emojis.map((emoji) => (
                      <SelectItem key={emoji.id} value={emoji.identifier}>
                        <img src={emoji.url} alt={emoji.name || ""} className="w-5 h-5 inline mr-2" />
                        :{emoji.name}:
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={newButton.emoji}
                  onChange={(e) => setNewButton({...newButton, emoji: e.target.value})}
                  placeholder="Ex: 🎫 ou deixe vazio"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Cor do Botao</Label>
              <Select 
                value={newButton.style} 
                onValueChange={(v) => setNewButton({...newButton, style: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUTTON_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: c.color }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setButtonDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddButton}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingButton} onOpenChange={(open) => !open && setEditingButton(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Botao</DialogTitle>
          </DialogHeader>
          {editingButton && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Texto do Botao</Label>
                <Input
                  value={editingButton.label}
                  onChange={(e) => setEditingButton({...editingButton, label: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Emoji</Label>
                {emojis && emojis.length > 0 ? (
                  <Select 
                    value={editingButton.emoji || ""} 
                    onValueChange={(v) => setEditingButton({...editingButton, emoji: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um emoji" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {emojis.map((emoji) => (
                        <SelectItem key={emoji.id} value={emoji.identifier}>
                          <img src={emoji.url} alt={emoji.name || ""} className="w-5 h-5 inline mr-2" />
                          :{emoji.name}:
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editingButton.emoji || ""}
                    onChange={(e) => setEditingButton({...editingButton, emoji: e.target.value})}
                    placeholder="Ex: 🎫"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Cor do Botao</Label>
                <Select 
                  value={editingButton.style} 
                  onValueChange={(v) => setEditingButton({...editingButton, style: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: c.color }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingButton(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateButton}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
