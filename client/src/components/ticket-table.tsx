import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Ticket } from "@shared/schema";

interface TicketTableProps {
  tickets: Ticket[];
  isLoading?: boolean;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "open":
      return <Badge variant="default" className="bg-status-online text-white">Aberto</Badge>;
    case "waiting":
      return <Badge variant="secondary" className="bg-status-away text-white">Aguardando</Badge>;
    case "closed":
      return <Badge variant="secondary" className="bg-status-busy text-white">Fechado</Badge>;
    case "archived":
      return <Badge variant="outline">Arquivado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function TicketTable({ tickets, isLoading }: TicketTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="skeleton-tickets">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-tickets">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Nenhum ticket encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Os tickets aparecerão aqui quando forem criados no Discord.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border" data-testid="table-tickets">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">#</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>IA</TableHead>
            <TableHead>Criado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
              <TableCell className="font-mono font-medium">
                #{ticket.ticketNumber.toString().padStart(4, '0')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={ticket.userAvatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {ticket.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{ticket.userName}</span>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
              <TableCell>
                {ticket.staffName ? (
                  <span className="text-sm">{ticket.staffName}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {ticket.aiModeEnabled ? (
                  <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/30">
                    Ativo
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {ticket.createdAt
                  ? formatDistanceToNow(new Date(ticket.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
