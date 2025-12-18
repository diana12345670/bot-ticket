import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Bot, MessageSquare } from "lucide-react";
import type { GuildConfig } from "@shared/schema";

interface GuildCardProps {
  guild: GuildConfig;
  onConfigure?: (guildId: string) => void;
}

export function GuildCard({ guild, onConfigure }: GuildCardProps) {
  return (
    <Card 
      className="hover-elevate transition-all duration-200"
      data-testid={`card-guild-${guild.guildId}`}
    >
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
        <Avatar className="h-12 w-12">
          {guild.guildIcon && (
            <AvatarImage 
              src={`https://cdn.discordapp.com/icons/${guild.guildId}/${guild.guildIcon}.png`} 
              alt={guild.guildName}
            />
          )}
          <AvatarFallback className="text-lg">
            {guild.guildName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg truncate">{guild.guildName}</CardTitle>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {guild.aiEnabled && (
              <Badge variant="outline" className="text-xs">
                <Bot className="w-3 h-3 mr-1" />
                IA Ativa
              </Badge>
            )}
            {guild.ticketPanelChannelId && (
              <Badge variant="secondary" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Painel Ativo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            ID: {guild.guildId}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigure?.(guild.guildId)}
            data-testid={`button-configure-${guild.guildId}`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
