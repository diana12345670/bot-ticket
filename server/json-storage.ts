import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  type GuildConfig,
  type InsertGuildConfig,
  type Ticket,
  type InsertTicket,
  type TicketMessage,
  type InsertTicketMessage,
  type Feedback,
  type InsertFeedback,
  type TicketPanel,
  type InsertTicketPanel,
  type PanelButton,
  type InsertPanelButton,
  type TicketStats,
} from "@shared/schema";
import type { IStorage } from "./storage";

const DATA_DIR = process.env.DATA_DIR || "./data";

interface JsonDatabase {
  guildConfigs: GuildConfig[];
  tickets: Ticket[];
  ticketMessages: TicketMessage[];
  feedbacks: Feedback[];
  ticketPanels: TicketPanel[];
  panelButtons: PanelButton[];
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateServerKey(): string {
  return crypto.randomBytes(32).toString("hex").slice(0, 32);
}

export class JsonStorage implements IStorage {
  private dbPath: string;
  private db: JsonDatabase;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.dbPath = path.join(DATA_DIR, "database.json");
    this.db = this.loadDatabase();
  }

  private loadDatabase(): JsonDatabase {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading JSON database:", error);
    }
    return {
      guildConfigs: [],
      tickets: [],
      ticketMessages: [],
      feedbacks: [],
      ticketPanels: [],
      panelButtons: [],
    };
  }

  private saveDatabase(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
    } catch (error) {
      console.error("Error saving JSON database:", error);
    }
  }

  async getGuildConfig(guildId: string): Promise<GuildConfig | undefined> {
    return this.db.guildConfigs.find((c) => c.guildId === guildId);
  }

  async getGuildConfigByKey(serverKey: string): Promise<GuildConfig | undefined> {
    return this.db.guildConfigs.find((c) => c.serverKey === serverKey);
  }

  async getAllGuildConfigs(): Promise<GuildConfig[]> {
    return this.db.guildConfigs;
  }

  async createGuildConfig(config: Omit<InsertGuildConfig, "serverKey">): Promise<GuildConfig> {
    const newConfig: GuildConfig = {
      id: generateId(),
      guildId: config.guildId,
      guildName: config.guildName,
      guildIcon: config.guildIcon || null,
      serverKey: generateServerKey(),
      ticketCategoryId: config.ticketCategoryId || null,
      ticketPanelChannelId: config.ticketPanelChannelId || null,
      ticketPanelMessageId: config.ticketPanelMessageId || null,
      feedbackChannelId: config.feedbackChannelId || null,
      logChannelId: config.logChannelId || null,
      staffRoleId: config.staffRoleId || null,
      aiEnabled: config.aiEnabled ?? false,
      aiSystemPrompt: config.aiSystemPrompt || "Você é um assistente de suporte amigável e profissional.",
      welcomeMessage: config.welcomeMessage || "Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.",
      panelTitle: config.panelTitle || "Sistema de Tickets",
      panelDescription: config.panelDescription || "Clique no botão abaixo para abrir um ticket.",
      panelButtonText: config.panelButtonText || "Abrir Ticket",
      panelColor: config.panelColor || "#5865F2",
      createdAt: new Date(),
    };
    this.db.guildConfigs.push(newConfig);
    this.saveDatabase();
    return newConfig;
  }

  async updateGuildConfig(guildId: string, config: Partial<InsertGuildConfig>): Promise<GuildConfig | undefined> {
    const index = this.db.guildConfigs.findIndex((c) => c.guildId === guildId);
    if (index === -1) return undefined;
    this.db.guildConfigs[index] = { ...this.db.guildConfigs[index], ...config };
    this.saveDatabase();
    return this.db.guildConfigs[index];
  }

  async deleteGuildConfig(guildId: string): Promise<boolean> {
    const index = this.db.guildConfigs.findIndex((c) => c.guildId === guildId);
    if (index === -1) return false;
    this.db.guildConfigs.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  async regenerateServerKey(guildId: string): Promise<string | undefined> {
    const index = this.db.guildConfigs.findIndex((c) => c.guildId === guildId);
    if (index === -1) return undefined;
    const newKey = generateServerKey();
    this.db.guildConfigs[index].serverKey = newKey;
    this.saveDatabase();
    return newKey;
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.db.tickets.find((t) => t.id === id);
  }

  async getTicketByChannel(channelId: string): Promise<Ticket | undefined> {
    return this.db.tickets.find((t) => t.channelId === channelId);
  }

  async getTicketsByGuild(guildId: string): Promise<Ticket[]> {
    return this.db.tickets
      .filter((t) => t.guildId === guildId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getTicketsByUser(userId: string, guildId: string): Promise<Ticket[]> {
    return this.db.tickets
      .filter((t) => t.userId === userId && t.guildId === guildId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getNextTicketNumber(guildId: string): Promise<number> {
    const guildTickets = this.db.tickets.filter((t) => t.guildId === guildId);
    const maxNumber = guildTickets.reduce((max, t) => Math.max(max, t.ticketNumber), 0);
    return maxNumber + 1;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const newTicket: Ticket = {
      id: generateId(),
      ticketNumber: ticket.ticketNumber,
      guildId: ticket.guildId,
      channelId: ticket.channelId,
      userId: ticket.userId,
      userName: ticket.userName,
      userAvatar: ticket.userAvatar || null,
      status: ticket.status || "open",
      staffId: ticket.staffId || null,
      staffName: ticket.staffName || null,
      aiModeEnabled: ticket.aiModeEnabled ?? false,
      createdAt: new Date(),
      closedAt: null,
      closedBy: null,
      closedByName: null,
    };
    this.db.tickets.push(newTicket);
    this.saveDatabase();
    return newTicket;
  }

  async updateTicket(id: string, ticket: Partial<Ticket>): Promise<Ticket | undefined> {
    const index = this.db.tickets.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    this.db.tickets[index] = { ...this.db.tickets[index], ...ticket };
    this.saveDatabase();
    return this.db.tickets[index];
  }

  async resetTickets(guildId: string): Promise<number> {
    const before = this.db.tickets.length;
    this.db.tickets = this.db.tickets.filter((t) => t.guildId !== guildId);
    this.saveDatabase();
    return before - this.db.tickets.length;
  }

  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return this.db.ticketMessages
      .filter((m) => m.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const newMessage: TicketMessage = {
      id: generateId(),
      ticketId: message.ticketId,
      messageId: message.messageId,
      authorId: message.authorId,
      authorName: message.authorName,
      authorAvatar: message.authorAvatar || null,
      content: message.content,
      isBot: message.isBot ?? false,
      isAi: message.isAi ?? false,
      createdAt: new Date(),
    };
    this.db.ticketMessages.push(newMessage);
    this.saveDatabase();
    return newMessage;
  }

  async getFeedback(ticketId: string): Promise<Feedback | undefined> {
    return this.db.feedbacks.find((f) => f.ticketId === ticketId);
  }

  async getFeedbacksByGuild(guildId: string): Promise<Feedback[]> {
    return this.db.feedbacks
      .filter((f) => f.guildId === guildId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const newFeedback: Feedback = {
      id: generateId(),
      ticketId: feedback.ticketId,
      guildId: feedback.guildId,
      userId: feedback.userId,
      userName: feedback.userName,
      staffId: feedback.staffId || null,
      staffName: feedback.staffName || null,
      rating: feedback.rating,
      comment: feedback.comment || null,
      createdAt: new Date(),
    };
    this.db.feedbacks.push(newFeedback);
    this.saveDatabase();
    return newFeedback;
  }

  async getGuildStats(guildId: string): Promise<TicketStats> {
    const guildTickets = this.db.tickets.filter((t) => t.guildId === guildId);
    const guildFeedbacks = this.db.feedbacks.filter((f) => f.guildId === guildId);
    const avgRating = guildFeedbacks.length > 0 
      ? guildFeedbacks.reduce((sum, f) => sum + f.rating, 0) / guildFeedbacks.length 
      : 0;

    return {
      totalTickets: guildTickets.length,
      openTickets: guildTickets.filter((t) => t.status === "open").length,
      closedTickets: guildTickets.filter((t) => t.status === "closed").length,
      averageRating: avgRating,
      totalFeedbacks: guildFeedbacks.length,
    };
  }

  async getPanel(id: string): Promise<TicketPanel | undefined> {
    return this.db.ticketPanels.find((p) => p.id === id);
  }

  async getPanelsByGuild(guildId: string): Promise<TicketPanel[]> {
    return this.db.ticketPanels
      .filter((p) => p.guildId === guildId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getPanelByMessage(messageId: string): Promise<TicketPanel | undefined> {
    return this.db.ticketPanels.find((p) => p.messageId === messageId);
  }

  async createPanel(panel: InsertTicketPanel): Promise<TicketPanel> {
    const newPanel: TicketPanel = {
      id: generateId(),
      guildId: panel.guildId,
      channelId: panel.channelId,
      messageId: panel.messageId || null,
      createdBy: panel.createdBy,
      title: panel.title || "Sistema de Tickets",
      description: panel.description || "Clique no botão abaixo para abrir um ticket.",
      embedColor: panel.embedColor || "#5865F2",
      categoryId: panel.categoryId || null,
      welcomeMessage: panel.welcomeMessage || "Bem-vindo ao suporte!",
      isConfigured: panel.isConfigured ?? false,
      createdAt: new Date(),
    };
    this.db.ticketPanels.push(newPanel);
    this.saveDatabase();
    return newPanel;
  }

  async updatePanel(id: string, panel: Partial<InsertTicketPanel>): Promise<TicketPanel | undefined> {
    const index = this.db.ticketPanels.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    this.db.ticketPanels[index] = { ...this.db.ticketPanels[index], ...panel };
    this.saveDatabase();
    return this.db.ticketPanels[index];
  }

  async deletePanel(id: string): Promise<boolean> {
    const index = this.db.ticketPanels.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.db.ticketPanels.splice(index, 1);
    this.db.panelButtons = this.db.panelButtons.filter((b) => b.panelId !== id);
    this.saveDatabase();
    return true;
  }

  async getPanelButtons(panelId: string): Promise<PanelButton[]> {
    return this.db.panelButtons
      .filter((b) => b.panelId === panelId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async createPanelButton(button: InsertPanelButton): Promise<PanelButton> {
    const newButton: PanelButton = {
      id: generateId(),
      panelId: button.panelId,
      label: button.label || "Abrir Ticket",
      emoji: button.emoji || "📩",
      style: button.style || "primary",
      order: button.order ?? 0,
      createdAt: new Date(),
    };
    this.db.panelButtons.push(newButton);
    this.saveDatabase();
    return newButton;
  }

  async updatePanelButton(id: string, button: Partial<InsertPanelButton>): Promise<PanelButton | undefined> {
    const index = this.db.panelButtons.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    this.db.panelButtons[index] = { ...this.db.panelButtons[index], ...button };
    this.saveDatabase();
    return this.db.panelButtons[index];
  }

  async deletePanelButton(id: string): Promise<boolean> {
    const index = this.db.panelButtons.findIndex((b) => b.id === id);
    if (index === -1) return false;
    this.db.panelButtons.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  async deletePanelButtons(panelId: string): Promise<boolean> {
    const before = this.db.panelButtons.length;
    this.db.panelButtons = this.db.panelButtons.filter((b) => b.panelId !== panelId);
    this.saveDatabase();
    return before !== this.db.panelButtons.length;
  }
}
