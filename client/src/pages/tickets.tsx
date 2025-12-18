import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketTable } from "@/components/ticket-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { Ticket } from "@shared/schema";

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const filteredTickets = tickets?.filter((ticket) => {
    if (statusFilter === "all") return true;
    return ticket.status === statusFilter;
  }) || [];

  const statusCounts = {
    all: tickets?.length || 0,
    open: tickets?.filter((t) => t.status === "open").length || 0,
    waiting: tickets?.filter((t) => t.status === "waiting").length || 0,
    closed: tickets?.filter((t) => t.status === "closed").length || 0,
    archived: tickets?.filter((t) => t.status === "archived").length || 0,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Tickets
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e visualize todos os tickets do sistema
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
              <SelectItem value="open">Abertos ({statusCounts.open})</SelectItem>
              <SelectItem value="waiting">Aguardando ({statusCounts.waiting})</SelectItem>
              <SelectItem value="closed">Fechados ({statusCounts.closed})</SelectItem>
              <SelectItem value="archived">Arquivados ({statusCounts.archived})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("all")}
          data-testid="card-filter-all"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{statusCounts.all}</span>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === "open" ? "ring-2 ring-status-online" : ""}`}
          onClick={() => setStatusFilter("open")}
          data-testid="card-filter-open"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Abertos</span>
              <span className="text-2xl font-bold text-status-online">{statusCounts.open}</span>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === "waiting" ? "ring-2 ring-status-away" : ""}`}
          onClick={() => setStatusFilter("waiting")}
          data-testid="card-filter-waiting"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Aguardando</span>
              <span className="text-2xl font-bold text-status-away">{statusCounts.waiting}</span>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === "closed" ? "ring-2 ring-status-busy" : ""}`}
          onClick={() => setStatusFilter("closed")}
          data-testid="card-filter-closed"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Fechados</span>
              <span className="text-2xl font-bold text-status-busy">{statusCounts.closed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tickets</CardTitle>
          <CardDescription>
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} encontrado{filteredTickets.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketTable tickets={filteredTickets} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
