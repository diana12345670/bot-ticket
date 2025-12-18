import { 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  Star,
  Bot,
  Server
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Servidores",
    url: "/guilds",
    icon: Server,
  },
  {
    title: "Tickets",
    url: "/tickets",
    icon: MessageSquare,
  },
  {
    title: "Feedbacks",
    url: "/feedbacks",
    icon: Star,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">Ticket Bot</span>
            <span className="text-xs text-muted-foreground">Sistema de Suporte</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
          <span className="text-xs text-muted-foreground">Bot Online</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
