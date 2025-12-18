import { 
  guildConfigs, tickets, ticketMessages, feedbacks, ticketPanels, panelButtons,
  type GuildConfig, type InsertGuildConfig,
  type Ticket, type InsertTicket,
  type TicketMessage, type InsertTicketMessage,
  type Feedback, type InsertFeedback,
  type TicketPanel, type InsertTicketPanel,
  type PanelButton, type InsertPanelButton,
  type TicketStats
} from "@shared/schema";
import { db, hasDatabase } from "./db";
import { eq, desc, and, sql, count, avg } from "drizzle-orm";
import crypto from "crypto";
import { JsonStorage } from "./json-storage";
import { dbLogger } from "./logger";
import { DatabaseError } from "./error-handler";

function generateServerKey(): string {
  return crypto.randomBytes(32).toString("hex").slice(0, 32);
}

// Helper function for safe database operations with error handling
async function withErrorHandler<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    dbLogger.error(`${operation} failed`, {
      error: error.message,
      code: error.code,
      detail: error.detail,
    });
    throw new DatabaseError(`${operation} failed: ${error.message}`, {
      code: error.code,
      operation,
    });
  }
}

export interface IStorage {
  // Guild Config
  getGuildConfig(guildId: string): Promise<GuildConfig | undefined>;
  getGuildConfigByKey(serverKey: string): Promise<GuildConfig | undefined>;
  getAllGuildConfigs(): Promise<GuildConfig[]>;
  createGuildConfig(config: Omit<InsertGuildConfig, "serverKey">): Promise<GuildConfig>;
  updateGuildConfig(guildId: string, config: Partial<InsertGuildConfig>): Promise<GuildConfig | undefined>;
  deleteGuildConfig(guildId: string): Promise<boolean>;
  regenerateServerKey(guildId: string): Promise<string | undefined>;
  
  // Tickets
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketByChannel(channelId: string): Promise<Ticket | undefined>;
  getTicketsByGuild(guildId: string): Promise<Ticket[]>;
  getTicketsByUser(userId: string, guildId: string): Promise<Ticket[]>;
  getNextTicketNumber(guildId: string): Promise<number>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, ticket: Partial<Ticket>): Promise<Ticket | undefined>;
  resetTickets(guildId: string): Promise<number>;
  
  // Ticket Messages
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
  createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;
  
  // Feedback
  getFeedback(ticketId: string): Promise<Feedback | undefined>;
  getFeedbacksByGuild(guildId: string): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  
  // Stats
  getGuildStats(guildId: string): Promise<TicketStats>;
  
  // Panels
  getPanel(id: string): Promise<TicketPanel | undefined>;
  getPanelsByGuild(guildId: string): Promise<TicketPanel[]>;
  getPanelByMessage(messageId: string): Promise<TicketPanel | undefined>;
  createPanel(panel: InsertTicketPanel): Promise<TicketPanel>;
  updatePanel(id: string, panel: Partial<InsertTicketPanel>): Promise<TicketPanel | undefined>;
  deletePanel(id: string): Promise<boolean>;
  
  // Panel Buttons
  getPanelButtons(panelId: string): Promise<PanelButton[]>;
  createPanelButton(button: InsertPanelButton): Promise<PanelButton>;
  updatePanelButton(id: string, button: Partial<InsertPanelButton>): Promise<PanelButton | undefined>;
  deletePanelButton(id: string): Promise<boolean>;
  deletePanelButtons(panelId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Guild Config Methods
  async getGuildConfig(guildId: string): Promise<GuildConfig | undefined> {
    return withErrorHandler("getGuildConfig", async () => {
      const [config] = await db!.select().from(guildConfigs).where(eq(guildConfigs.guildId, guildId));
      return config || undefined;
    });
  }

  async getGuildConfigByKey(serverKey: string): Promise<GuildConfig | undefined> {
    const [config] = await db!.select().from(guildConfigs).where(eq(guildConfigs.serverKey, serverKey));
    return config || undefined;
  }

  async getAllGuildConfigs(): Promise<GuildConfig[]> {
    return await db!.select().from(guildConfigs);
  }

  async createGuildConfig(config: Omit<InsertGuildConfig, "serverKey">): Promise<GuildConfig> {
    const serverKey = generateServerKey();
    const [newConfig] = await db!.insert(guildConfigs).values({ ...config, serverKey }).returning();
    return newConfig;
  }

  async updateGuildConfig(guildId: string, config: Partial<InsertGuildConfig>): Promise<GuildConfig | undefined> {
    const [updated] = await db!
      .update(guildConfigs)
      .set(config)
      .where(eq(guildConfigs.guildId, guildId))
      .returning();
    return updated || undefined;
  }

  async deleteGuildConfig(guildId: string): Promise<boolean> {
    const result = await db!.delete(guildConfigs).where(eq(guildConfigs.guildId, guildId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async regenerateServerKey(guildId: string): Promise<string | undefined> {
    const newKey = generateServerKey();
    const [updated] = await db!
      .update(guildConfigs)
      .set({ serverKey: newKey })
      .where(eq(guildConfigs.guildId, guildId))
      .returning();
    return updated ? newKey : undefined;
  }

  // Ticket Methods
  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db!.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async getTicketByChannel(channelId: string): Promise<Ticket | undefined> {
    const [ticket] = await db!.select().from(tickets).where(eq(tickets.channelId, channelId));
    return ticket || undefined;
  }

  async getTicketsByGuild(guildId: string): Promise<Ticket[]> {
    return await db!.select().from(tickets).where(eq(tickets.guildId, guildId)).orderBy(desc(tickets.createdAt));
  }

  async getTicketsByUser(userId: string, guildId: string): Promise<Ticket[]> {
    return await db!.select().from(tickets).where(
      and(eq(tickets.userId, userId), eq(tickets.guildId, guildId))
    ).orderBy(desc(tickets.createdAt));
  }

  async getNextTicketNumber(guildId: string): Promise<number> {
    const [result] = await db!
      .select({ maxNumber: sql<number>`COALESCE(MAX(${tickets.ticketNumber})::integer, 0)` })
      .from(tickets)
      .where(eq(tickets.guildId, guildId));
    const maxNum = result?.maxNumber ?? 0;
    return (typeof maxNum === 'string' ? parseInt(maxNum, 10) : maxNum) + 1;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db!.insert(tickets).values(ticket).returning();
    return newTicket;
  }

  async updateTicket(id: string, ticket: Partial<Ticket>): Promise<Ticket | undefined> {
    const [updated] = await db!
      .update(tickets)
      .set(ticket)
      .where(eq(tickets.id, id))
      .returning();
    return updated || undefined;
  }

  async resetTickets(guildId: string): Promise<number> {
    const result = await db!.delete(tickets).where(eq(tickets.guildId, guildId));
    return result.rowCount || 0;
  }

  // Ticket Messages Methods
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return await db!.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
  }

  async createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const [newMessage] = await db!.insert(ticketMessages).values(message).returning();
    return newMessage;
  }

  // Feedback Methods
  async getFeedback(ticketId: string): Promise<Feedback | undefined> {
    const [feedback] = await db!.select().from(feedbacks).where(eq(feedbacks.ticketId, ticketId));
    return feedback || undefined;
  }

  async getFeedbacksByGuild(guildId: string): Promise<Feedback[]> {
    return await db!.select().from(feedbacks).where(eq(feedbacks.guildId, guildId)).orderBy(desc(feedbacks.createdAt));
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db!.insert(feedbacks).values(feedback).returning();
    return newFeedback;
  }

  // Stats Methods
  async getGuildStats(guildId: string): Promise<TicketStats> {
    const [totalResult] = await db!
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.guildId, guildId));

    const [openResult] = await db!
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.guildId, guildId), eq(tickets.status, "open")));

    const [closedResult] = await db!
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.guildId, guildId), eq(tickets.status, "closed")));

    const [feedbackResult] = await db!
      .select({ 
        count: count(),
        avgRating: avg(feedbacks.rating)
      })
      .from(feedbacks)
      .where(eq(feedbacks.guildId, guildId));

    return {
      totalTickets: totalResult?.count || 0,
      openTickets: openResult?.count || 0,
      closedTickets: closedResult?.count || 0,
      averageRating: feedbackResult?.avgRating ? parseFloat(String(feedbackResult.avgRating)) : 0,
      totalFeedbacks: feedbackResult?.count || 0,
    };
  }

  // Panel Methods
  async getPanel(id: string): Promise<TicketPanel | undefined> {
    return withErrorHandler("getPanel", async () => {
      const [panel] = await db!.select().from(ticketPanels).where(eq(ticketPanels.id, id));
      return panel || undefined;
    });
  }

  async getPanelsByGuild(guildId: string): Promise<TicketPanel[]> {
    return withErrorHandler("getPanelsByGuild", async () => {
      return await db!.select().from(ticketPanels).where(eq(ticketPanels.guildId, guildId)).orderBy(desc(ticketPanels.createdAt));
    });
  }

  async getPanelByMessage(messageId: string): Promise<TicketPanel | undefined> {
    return withErrorHandler("getPanelByMessage", async () => {
      const [panel] = await db!.select().from(ticketPanels).where(eq(ticketPanels.messageId, messageId));
      return panel || undefined;
    });
  }

  async createPanel(panel: InsertTicketPanel): Promise<TicketPanel> {
    return withErrorHandler("createPanel", async () => {
      const [newPanel] = await db!.insert(ticketPanels).values(panel).returning();
      dbLogger.success("Panel created", { panelId: newPanel.id, guildId: panel.guildId });
      return newPanel;
    });
  }

  async updatePanel(id: string, panel: Partial<InsertTicketPanel>): Promise<TicketPanel | undefined> {
    return withErrorHandler("updatePanel", async () => {
      const [updated] = await db!.update(ticketPanels).set(panel).where(eq(ticketPanels.id, id)).returning();
      if (updated) {
        dbLogger.success("Panel updated", { panelId: id });
      }
      return updated || undefined;
    });
  }

  async deletePanel(id: string): Promise<boolean> {
    return withErrorHandler("deletePanel", async () => {
      const result = await db!.delete(ticketPanels).where(eq(ticketPanels.id, id));
      if (result.rowCount && result.rowCount > 0) {
        dbLogger.success("Panel deleted", { panelId: id });
      }
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  // Panel Button Methods
  async getPanelButtons(panelId: string): Promise<PanelButton[]> {
    return withErrorHandler("getPanelButtons", async () => {
      return await db!.select().from(panelButtons).where(eq(panelButtons.panelId, panelId)).orderBy(panelButtons.order);
    });
  }

  async createPanelButton(button: InsertPanelButton): Promise<PanelButton> {
    return withErrorHandler("createPanelButton", async () => {
      const [newButton] = await db!.insert(panelButtons).values(button).returning();
      dbLogger.success("Panel button created", { buttonId: newButton.id });
      return newButton;
    });
  }

  async updatePanelButton(id: string, button: Partial<InsertPanelButton>): Promise<PanelButton | undefined> {
    return withErrorHandler("updatePanelButton", async () => {
      const [updated] = await db!.update(panelButtons).set(button).where(eq(panelButtons.id, id)).returning();
      if (updated) {
        dbLogger.success("Panel button updated", { buttonId: id });
      }
      return updated || undefined;
    });
  }

  async deletePanelButton(id: string): Promise<boolean> {
    return withErrorHandler("deletePanelButton", async () => {
      const result = await db!.delete(panelButtons).where(eq(panelButtons.id, id));
      if (result.rowCount && result.rowCount > 0) {
        dbLogger.success("Panel button deleted", { buttonId: id });
      }
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  async deletePanelButtons(panelId: string): Promise<boolean> {
    return withErrorHandler("deletePanelButtons", async () => {
      const result = await db!.delete(panelButtons).where(eq(panelButtons.panelId, panelId));
      if (result.rowCount && result.rowCount > 0) {
        dbLogger.success("Panel buttons deleted", { panelId, count: result.rowCount });
      }
      return result.rowCount !== null && result.rowCount > 0;
    });
  }
}

function createStorage(): IStorage {
  if (hasDatabase) {
    console.log("✓ Using PostgreSQL storage");
    return new DatabaseStorage();
  } else {
    console.log("✓ Using JSON file storage");
    return new JsonStorage();
  }
}

export const storage = createStorage();
