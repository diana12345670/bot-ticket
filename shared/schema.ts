import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "waiting", "closed", "archived"]);
export const buttonStyleEnum = pgEnum("button_style", ["primary", "secondary", "success", "danger"]);

// Guild Configuration Table
export const guildConfigs = pgTable("guild_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id", { length: 32 }).notNull().unique(),
  guildName: text("guild_name").notNull(),
  guildIcon: text("guild_icon"),
  serverKey: varchar("server_key", { length: 64 }).notNull().unique(),
  ticketCategoryId: varchar("ticket_category_id", { length: 32 }),
  ticketPanelChannelId: varchar("ticket_panel_channel_id", { length: 32 }),
  ticketPanelMessageId: varchar("ticket_panel_message_id", { length: 32 }),
  feedbackChannelId: varchar("feedback_channel_id", { length: 32 }),
  logChannelId: varchar("log_channel_id", { length: 32 }),
  staffRoleId: varchar("staff_role_id", { length: 32 }),
  aiEnabled: boolean("ai_enabled").default(false),
  aiSystemPrompt: text("ai_system_prompt").default("Você é um assistente de suporte amigável e profissional. Responda de forma clara e objetiva."),
  welcomeMessage: text("welcome_message").default("Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve."),
  panelTitle: text("panel_title").default("Sistema de Tickets"),
  panelDescription: text("panel_description").default("Clique no botão abaixo para abrir um ticket e entrar em contato com nossa equipe de suporte."),
  panelButtonText: text("panel_button_text").default("Abrir Ticket"),
  panelColor: varchar("panel_color", { length: 7 }).default("#5865F2"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tickets Table
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: integer("ticket_number").notNull(),
  guildId: varchar("guild_id", { length: 32 }).notNull(),
  channelId: varchar("channel_id", { length: 32 }).notNull().unique(),
  userId: varchar("user_id", { length: 32 }).notNull(),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  status: ticketStatusEnum("status").default("open").notNull(),
  staffId: varchar("staff_id", { length: 32 }),
  staffName: text("staff_name"),
  aiModeEnabled: boolean("ai_mode_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by", { length: 32 }),
  closedByName: text("closed_by_name"),
});

// Ticket Messages Table (for archiving)
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  messageId: varchar("message_id", { length: 32 }).notNull(),
  authorId: varchar("author_id", { length: 32 }).notNull(),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  content: text("content").notNull(),
  isBot: boolean("is_bot").default(false),
  isAi: boolean("is_ai").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ticket Panels Table (multiple panels per guild)
export const ticketPanels = pgTable("ticket_panels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guildId: varchar("guild_id", { length: 32 }).notNull(),
  channelId: varchar("channel_id", { length: 32 }).notNull(),
  messageId: varchar("message_id", { length: 32 }),
  createdBy: varchar("created_by", { length: 32 }).notNull(),
  title: text("title").default("Sistema de Tickets"),
  description: text("description").default("Clique no botão abaixo para abrir um ticket."),
  embedColor: varchar("embed_color", { length: 7 }).default("#5865F2"),
  categoryId: varchar("category_id", { length: 32 }),
  welcomeMessage: text("welcome_message").default("Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve."),
  isConfigured: boolean("is_configured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Panel Buttons Table (multiple buttons per panel)
export const panelButtons = pgTable("panel_buttons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  panelId: varchar("panel_id").notNull().references(() => ticketPanels.id, { onDelete: "cascade" }),
  label: text("label").default("Abrir Ticket"),
  emoji: text("emoji").default("📩"),
  style: buttonStyleEnum("style").default("primary"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback Table
export const feedbacks = pgTable("feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  guildId: varchar("guild_id", { length: 32 }).notNull(),
  userId: varchar("user_id", { length: 32 }).notNull(),
  userName: text("user_name").notNull(),
  staffId: varchar("staff_id", { length: 32 }),
  staffName: text("staff_name"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const guildConfigsRelations = relations(guildConfigs, ({ many }) => ({
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ many, one }) => ({
  messages: many(ticketMessages),
  feedback: one(feedbacks, {
    fields: [tickets.id],
    references: [feedbacks.ticketId],
  }),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
}));

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  ticket: one(tickets, {
    fields: [feedbacks.ticketId],
    references: [tickets.id],
  }),
}));

export const ticketPanelsRelations = relations(ticketPanels, ({ many }) => ({
  buttons: many(panelButtons),
}));

export const panelButtonsRelations = relations(panelButtons, ({ one }) => ({
  panel: one(ticketPanels, {
    fields: [panelButtons.panelId],
    references: [ticketPanels.id],
  }),
}));

// Insert Schemas
export const insertGuildConfigSchema = createInsertSchema(guildConfigs).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
});

export const insertTicketPanelSchema = createInsertSchema(ticketPanels).omit({
  id: true,
  createdAt: true,
});

export const insertPanelButtonSchema = createInsertSchema(panelButtons).omit({
  id: true,
  createdAt: true,
});

// Types
export type GuildConfig = typeof guildConfigs.$inferSelect;
export type InsertGuildConfig = z.infer<typeof insertGuildConfigSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type TicketPanel = typeof ticketPanels.$inferSelect;
export type InsertTicketPanel = z.infer<typeof insertTicketPanelSchema>;

export type PanelButton = typeof panelButtons.$inferSelect;
export type InsertPanelButton = z.infer<typeof insertPanelButtonSchema>;

// Stats type for dashboard
export type TicketStats = {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  averageRating: number;
  totalFeedbacks: number;
};
