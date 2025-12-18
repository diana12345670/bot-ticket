import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Eye, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Panels() {
  const { toast } = useToast();
  const [serverKey, setServerKey] = useState(localStorage.getItem("serverKey") || "");
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);

  const { data: panels, isLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/panels", serverKey],
    enabled: !!serverKey,
    queryFn: async () => {
      if (!serverKey) return [];
      const response = await fetch("/api/dashboard/panels", {
        headers: { Authorization: `Bearer ${serverKey}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar painéis");
      return response.json();
    },
  });

  const updatePanelMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/dashboard/panels/${selectedPanelId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serverKey}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Falha ao atualizar painel");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/panels", serverKey] });
      setSelectedPanelId(null);
      setEditData(null);
      toast({
        title: "Painel atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar o painel.",
        variant: "destructive",
      });
    },
  });

  const deletePanelMutation = useMutation({
    mutationFn: async (panelId: string) => {
      const response = await fetch(`/api/dashboard/panels/${panelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serverKey}` },
      });
      if (!response.ok) throw new Error("Falha ao deletar painel");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/panels", serverKey] });
      toast({
        title: "Painel deletado",
        description: "O painel foi removido com sucesso.",
      });
    },
  });

  if (!serverKey) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Painéis de Tickets</h1>
          <p className="text-muted-foreground">Configure seus painéis de tickets</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <h3 className="text-xl font-semibold mb-2">Chave do servidor necessária</h3>
            <Input
              type="password"
              placeholder="Cole sua chave de servidor aqui"
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              className="max-w-md mb-4"
            />
            <Button onClick={() => localStorage.setItem("serverKey", serverKey)}>
              Validar Chave
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold">Carregando painéis...</h1>
      </div>
    );
  }

  if (selectedPanelId && editData) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Editar Painel</h1>
          <Button variant="outline" onClick={() => { setSelectedPanelId(null); setEditData(null); }}>
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Painel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={editData.title || ""}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={editData.description || ""}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label>Cor do Embed (hex)</Label>
              <Input
                type="color"
                value={editData.embedColor || "#5865F2"}
                onChange={(e) => setEditData({ ...editData, embedColor: e.target.value })}
              />
            </div>

            <div>
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea
                value={editData.welcomeMessage || ""}
                onChange={(e) => setEditData({ ...editData, welcomeMessage: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setSelectedPanelId(null); setEditData(null); }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => updatePanelMutation.mutate(editData)}
                disabled={updatePanelMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Painéis de Tickets</h1>
        <p className="text-muted-foreground">Gerencie seus painéis de tickets</p>
      </div>

      {!panels || panels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <p className="text-muted-foreground">Nenhum painel configurado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {panels.map((panel) => (
            <Card key={panel.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{panel.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {panel.buttons?.length || 0} botão(ões)
                  </span>
                </CardTitle>
                <CardDescription>{panel.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPanelId(panel.id);
                      setEditData(panel);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Preview logic
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deletePanelMutation.mutate(panel.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
