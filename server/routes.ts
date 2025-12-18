import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGuildConfigSchema, insertFeedbackSchema } from "@shared/schema";
import { apiLogger } from "./logger";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Allowed fields for update (whitelist to prevent serverKey manipulation)
  const ALLOWED_UPDATE_FIELDS = [
    "welcomeMessage", "staffRoleId", "ticketCategoryId", "logChannelId",
    "feedbackChannelId", "aiEnabled", "aiSystemPrompt", "panelTitle",
    "panelDescription", "panelButtonText", "panelColor"
  ];

  // Helper to extract server key from Authorization header
  const getServerKeyFromHeader = (req: any): string | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  };

  // Auth endpoint - authenticate with server key (via POST body, not URL)
  app.post("/api/auth/key", async (req, res) => {
    try {
      const { serverKey } = req.body;
      if (!serverKey) {
        return res.status(400).json({ error: "Server key is required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(401).json({ error: "Invalid server key" });
      }

      // Return guild info WITHOUT the serverKey
      const { serverKey: _, ...safeGuild } = guild;
      res.json({
        success: true,
        guild: {
          id: safeGuild.id,
          guildId: safeGuild.guildId,
          guildName: safeGuild.guildName,
          guildIcon: safeGuild.guildIcon,
        }
      });
    } catch (error) {
      apiLogger.error("Auth key validation failed");
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Get guild - uses Authorization header instead of URL param
  app.get("/api/dashboard/guild", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }
      
      // Remove serverKey from response
      const { serverKey: _, ...safeGuild } = guild;
      const stats = await storage.getGuildStats(guild.guildId);
      res.json({ ...safeGuild, stats });
    } catch (error) {
      apiLogger.error("Failed to fetch guild");
      res.status(500).json({ error: "Failed to fetch guild" });
    }
  });

  // Get tickets - uses Authorization header
  app.get("/api/dashboard/tickets", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }
      
      const tickets = await storage.getTicketsByGuild(guild.guildId);
      res.json(tickets);
    } catch (error) {
      apiLogger.error("Failed to fetch tickets");
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  // Get feedbacks - uses Authorization header
  app.get("/api/dashboard/feedbacks", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }
      
      const feedbacks = await storage.getFeedbacksByGuild(guild.guildId);
      res.json(feedbacks);
    } catch (error) {
      apiLogger.error("Failed to fetch feedbacks");
      res.status(500).json({ error: "Failed to fetch feedbacks" });
    }
  });

  // Update guild config - uses Authorization header with field whitelist
  app.patch("/api/dashboard/guild", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guildConfig = await storage.getGuildConfigByKey(serverKey);
      if (!guildConfig) {
        return res.status(404).json({ error: "Guild not found" });
      }
      
      // Only allow whitelisted fields to be updated
      const sanitizedData: Record<string, any> = {};
      for (const field of ALLOWED_UPDATE_FIELDS) {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      }

      if (Object.keys(sanitizedData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updated = await storage.updateGuildConfig(guildConfig.guildId, sanitizedData);
      
      // Remove serverKey from response
      if (updated) {
        const { serverKey: _, ...safeUpdated } = updated;
        res.json(safeUpdated);
      } else {
        res.status(500).json({ error: "Update failed" });
      }
    } catch (error) {
      apiLogger.error("Failed to update guild");
      res.status(500).json({ error: "Failed to update guild" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const guilds = await storage.getAllGuildConfigs();
      let totalStats = {
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
        averageRating: 0,
        totalFeedbacks: 0,
      };

      for (const guild of guilds) {
        const guildStats = await storage.getGuildStats(guild.guildId);
        totalStats.totalTickets += guildStats.totalTickets;
        totalStats.openTickets += guildStats.openTickets;
        totalStats.closedTickets += guildStats.closedTickets;
        totalStats.totalFeedbacks += guildStats.totalFeedbacks;
      }

      if (totalStats.totalFeedbacks > 0) {
        const allFeedbacks = [];
        for (const guild of guilds) {
          const feedbacks = await storage.getFeedbacksByGuild(guild.guildId);
          allFeedbacks.push(...feedbacks);
        }
        const totalRating = allFeedbacks.reduce((sum, f) => sum + f.rating, 0);
        totalStats.averageRating = totalRating / allFeedbacks.length;
      }

      res.json(totalStats);
    } catch (error) {
      apiLogger.error("Failed to fetch stats");
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Guild endpoints
  app.get("/api/guilds", async (req, res) => {
    try {
      const guilds = await storage.getAllGuildConfigs();
      res.json(guilds);
    } catch (error) {
      apiLogger.error("Failed to fetch guilds");
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });

  app.get("/api/guilds/:guildId", async (req, res) => {
    try {
      const guild = await storage.getGuildConfig(req.params.guildId);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }
      res.json(guild);
    } catch (error) {
      apiLogger.error("Failed to fetch guild");
      res.status(500).json({ error: "Failed to fetch guild" });
    }
  });

  app.patch("/api/guilds/:guildId", async (req, res) => {
    try {
      const guild = await storage.updateGuildConfig(req.params.guildId, req.body);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }
      res.json(guild);
    } catch (error) {
      apiLogger.error("Failed to update guild");
      res.status(500).json({ error: "Failed to update guild" });
    }
  });

  // Ticket endpoints
  app.get("/api/tickets", async (req, res) => {
    try {
      const guilds = await storage.getAllGuildConfigs();
      const allTickets = [];
      for (const guild of guilds) {
        const tickets = await storage.getTicketsByGuild(guild.guildId);
        allTickets.push(...tickets);
      }
      allTickets.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      res.json(allTickets);
    } catch (error) {
      apiLogger.error("Failed to fetch tickets");
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/recent", async (req, res) => {
    try {
      const guilds = await storage.getAllGuildConfigs();
      const allTickets = [];
      for (const guild of guilds) {
        const tickets = await storage.getTicketsByGuild(guild.guildId);
        allTickets.push(...tickets);
      }
      allTickets.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      res.json(allTickets.slice(0, 10));
    } catch (error) {
      apiLogger.error("Failed to fetch recent tickets");
      res.status(500).json({ error: "Failed to fetch recent tickets" });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      apiLogger.error("Failed to fetch ticket");
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  app.get("/api/tickets/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getTicketMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      apiLogger.error("Failed to fetch ticket messages");
      res.status(500).json({ error: "Failed to fetch ticket messages" });
    }
  });

  // Feedback endpoints
  app.get("/api/feedbacks", async (req, res) => {
    try {
      const guilds = await storage.getAllGuildConfigs();
      const allFeedbacks = [];
      for (const guild of guilds) {
        const feedbacks = await storage.getFeedbacksByGuild(guild.guildId);
        allFeedbacks.push(...feedbacks);
      }
      allFeedbacks.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      res.json(allFeedbacks);
    } catch (error) {
      apiLogger.error("Failed to fetch feedbacks");
      res.status(500).json({ error: "Failed to fetch feedbacks" });
    }
  });

  app.get("/api/feedbacks/recent", async (req, res) => {
    try {
      const guilds = await storage.getAllGuildConfigs();
      const allFeedbacks = [];
      for (const guild of guilds) {
        const feedbacks = await storage.getFeedbacksByGuild(guild.guildId);
        allFeedbacks.push(...feedbacks);
      }
      allFeedbacks.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      res.json(allFeedbacks.slice(0, 5));
    } catch (error) {
      apiLogger.error("Failed to fetch recent feedbacks");
      res.status(500).json({ error: "Failed to fetch recent feedbacks" });
    }
  });

  // Bot status endpoint
  app.get("/api/bot/status", async (req, res) => {
    try {
      const { discordBot } = await import("./discord-bot");
      const status = discordBot.getStatus();
      res.json(status);
    } catch (error) {
      res.json({
        online: false,
        guilds: 0,
        users: 0,
        ping: 0,
      });
    }
  });

  // Guild Discord data endpoints (for dashboard dropdowns)
  app.get("/api/dashboard/channels", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const { discordBot } = await import("./discord-bot");
      const channels = await discordBot.getGuildChannels(guild.guildId);
      res.json(channels || []);
    } catch (error) {
      apiLogger.error("Failed to fetch channels");
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.get("/api/dashboard/categories", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const { discordBot } = await import("./discord-bot");
      const categories = await discordBot.getGuildCategories(guild.guildId);
      res.json(categories || []);
    } catch (error) {
      apiLogger.error("Failed to fetch categories");
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/dashboard/roles", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const { discordBot } = await import("./discord-bot");
      const roles = await discordBot.getGuildRoles(guild.guildId);
      res.json(roles || []);
    } catch (error) {
      apiLogger.error("Failed to fetch roles");
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/dashboard/emojis", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const { discordBot } = await import("./discord-bot");
      const emojis = await discordBot.getGuildEmojis(guild.guildId);
      res.json(emojis || []);
    } catch (error) {
      apiLogger.error("Failed to fetch emojis");
      res.status(500).json({ error: "Failed to fetch emojis" });
    }
  });

  // Send ticket panel to a channel
  app.post("/api/guilds/:guildId/panel", async (req, res) => {
    try {
      const { channelId } = req.body;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }
      
      const { discordBot } = await import("./discord-bot");
      await discordBot.sendTicketPanel(channelId, req.params.guildId);
      res.json({ success: true });
    } catch (error) {
      apiLogger.error("Failed to send ticket panel");
      res.status(500).json({ error: "Failed to send ticket panel" });
    }
  });

  // Panel management endpoints
  app.get("/api/dashboard/panels", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const panels = await storage.getPanelsByGuild(guild.guildId);
      const panelsWithButtons = await Promise.all(
        panels.map(async (panel) => {
          const buttons = await storage.getPanelButtons(panel.id);
          return { ...panel, buttons };
        })
      );

      res.json(panelsWithButtons);
    } catch (error) {
      apiLogger.error("Failed to fetch panels");
      res.status(500).json({ error: "Failed to fetch panels" });
    }
  });

  app.get("/api/dashboard/panels/:id", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const panel = await storage.getPanel(req.params.id);
      if (!panel) {
        return res.status(404).json({ error: "Panel not found" });
      }

      const buttons = await storage.getPanelButtons(panel.id);
      res.json({ ...panel, buttons });
    } catch (error) {
      apiLogger.error("Failed to fetch panel");
      res.status(500).json({ error: "Failed to fetch panel" });
    }
  });

  app.post("/api/dashboard/panels", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const guild = await storage.getGuildConfigByKey(serverKey);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const { channelId, title, description, embedColor, categoryId, welcomeMessage } = req.body;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const panel = await storage.createPanel({
        guildId: guild.guildId,
        channelId,
        createdBy: "dashboard",
        title: title || "Sistema de Tickets",
        description: description || "Clique no botão abaixo para abrir um ticket.",
        embedColor: embedColor || "#5865F2",
        categoryId,
        welcomeMessage,
        isConfigured: false,
      });

      res.json(panel);
    } catch (error) {
      apiLogger.error("Failed to create panel");
      res.status(500).json({ error: "Failed to create panel" });
    }
  });

  app.patch("/api/dashboard/panels/:id", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const { title, description, embedColor, categoryId, welcomeMessage } = req.body;
      const panel = await storage.updatePanel(req.params.id, {
        title,
        description,
        embedColor,
        categoryId,
        welcomeMessage,
      });

      if (!panel) {
        return res.status(404).json({ error: "Panel not found" });
      }

      res.json(panel);
    } catch (error) {
      apiLogger.error("Failed to update panel");
      res.status(500).json({ error: "Failed to update panel" });
    }
  });

  app.delete("/api/dashboard/panels/:id", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const deleted = await storage.deletePanel(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Panel not found" });
      }

      res.json({ success: true });
    } catch (error) {
      apiLogger.error("Failed to delete panel");
      res.status(500).json({ error: "Failed to delete panel" });
    }
  });

  // Panel button endpoints
  app.post("/api/dashboard/panels/:panelId/buttons", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const { label, emoji, style } = req.body;
      const existingButtons = await storage.getPanelButtons(req.params.panelId);

      const button = await storage.createPanelButton({
        panelId: req.params.panelId,
        label: label || "Abrir Ticket",
        emoji,
        style: style || "primary",
        order: existingButtons.length,
      });

      res.json(button);
    } catch (error) {
      apiLogger.error("Failed to create button");
      res.status(500).json({ error: "Failed to create button" });
    }
  });

  app.patch("/api/dashboard/buttons/:id", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const { label, emoji, style } = req.body;
      const button = await storage.updatePanelButton(req.params.id, { label, emoji, style });

      if (!button) {
        return res.status(404).json({ error: "Button not found" });
      }

      res.json(button);
    } catch (error) {
      apiLogger.error("Failed to update button");
      res.status(500).json({ error: "Failed to update button" });
    }
  });

  app.delete("/api/dashboard/buttons/:id", async (req, res) => {
    try {
      const serverKey = getServerKeyFromHeader(req);
      if (!serverKey) {
        return res.status(401).json({ error: "Authorization required" });
      }

      const deleted = await storage.deletePanelButton(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Button not found" });
      }

      res.json({ success: true });
    } catch (error) {
      apiLogger.error("Failed to delete button");
      res.status(500).json({ error: "Failed to delete button" });
    }
  });

  return httpServer;
}
