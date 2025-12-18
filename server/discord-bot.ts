import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  WebhookClient,
  Message,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuInteraction,
  ChannelSelectMenuInteraction,
} from "discord.js";
import { storage } from "./storage";
import OpenAI from "openai";
import { discordLogger, aiLogger } from "./logger";

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const commands = [
  new SlashCommandBuilder()
    .setName("setup-tickets")
    .setDescription("Configurar o sistema de tickets do servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName("painel-ticket")
    .setDescription("Criar um painel de tickets personalizado")
    .addChannelOption(option =>
      option.setName("canal")
        .setDescription("Canal onde o painel será enviado")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName("ativar-ia")
    .setDescription("Ativar/desativar IA para responder tickets automaticamente")
    .addBooleanOption(option =>
      option.setName("ativar")
        .setDescription("Ativar ou desativar a IA")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("prompt")
        .setDescription("Personalidade/instruções da IA")
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName("resetar-tickets")
    .setDescription("Resetar todos os tickets do servidor (CUIDADO!)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName("servidor-key")
    .setDescription("Mostrar a chave do servidor para acessar o dashboard")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

class DiscordBot {
  private client: Client;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once("clientReady", async () => {
      discordLogger.success(`Logged in as ${this.client.user?.tag}`);
      this.isReady = true;
      await this.registerCommands();
      await this.syncGuilds();
    });

    this.client.on("error", (error: Error) => {
      discordLogger.error("Discord client error", { error: error.message });
    });

    this.client.on("guildCreate", async (guild) => {
      discordLogger.info("Joined guild", { name: guild.name, id: guild.id });
      await this.registerGuild(guild);
    });

    this.client.on("guildDelete", async (guild) => {
      discordLogger.info("Left guild", { name: guild.name });
      await storage.deleteGuildConfig(guild.id);
    });

    this.client.on("interactionCreate", async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
          await this.handleButtonInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
          await this.handleModalSubmit(interaction);
        } else if (interaction.isStringSelectMenu()) {
          await this.handleSelectMenu(interaction);
        } else if (interaction.isRoleSelectMenu()) {
          await this.handleRoleSelectMenu(interaction);
        } else if (interaction.isChannelSelectMenu()) {
          await this.handleChannelSelectMenu(interaction);
        }
      } catch (error: any) {
        discordLogger.error("Interaction handler error", { error: error.message });
        await this.safeReply(interaction, "Ocorreu um erro ao processar sua interação.");
      }
    });

    this.client.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      await this.handleTicketMessage(message);
    });
  }

  private async safeReply(interaction: any, content: string) {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    } catch {
    }
  }

  private async registerCommands() {
    try {
      const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!);
      await rest.put(
        Routes.applicationCommands(this.client.user!.id),
        { body: commands.map(cmd => cmd.toJSON()) }
      );
      discordLogger.success("Slash commands registered");
    } catch (error: any) {
      discordLogger.error("Failed to register commands", { error: error.message });
    }
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction) {
    const { commandName } = interaction;
    
    try {
      switch (commandName) {
        case "setup-tickets":
          await this.handleSetupCommand(interaction);
          break;
        case "painel-ticket":
          await this.handlePanelCommand(interaction);
          break;
        case "ativar-ia":
          await this.handleAICommand(interaction);
          break;
        case "resetar-tickets":
          await this.handleResetCommand(interaction);
          break;
        case "servidor-key":
          await this.handleKeyCommand(interaction);
          break;
      }
    } catch (error: any) {
      discordLogger.error("Command error", { command: commandName, error: error.message });
      const reply = interaction.replied || interaction.deferred
        ? interaction.followUp.bind(interaction)
        : interaction.reply.bind(interaction);
      await reply({ content: "Ocorreu um erro ao executar o comando.", ephemeral: true });
    }
  }

  private async handleSetupCommand(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply({ ephemeral: true });

    let guildConfig = await storage.getGuildConfig(guild.id);
    if (!guildConfig) {
      guildConfig = await storage.createGuildConfig({
        guildId: guild.id,
        guildName: guild.name,
        guildIcon: guild.icon || undefined,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Configuração do Sistema de Tickets")
      .setDescription("Selecione abaixo o que deseja configurar:")
      .addFields(
        { name: "Cargo Staff", value: guildConfig.staffRoleId ? `<@&${guildConfig.staffRoleId}>` : "Não configurado", inline: true },
        { name: "Categoria Tickets", value: guildConfig.ticketCategoryId ? `<#${guildConfig.ticketCategoryId}>` : "Não configurado", inline: true },
        { name: "Canal de Logs", value: guildConfig.logChannelId ? `<#${guildConfig.logChannelId}>` : "Não configurado", inline: true },
        { name: "Canal de Feedback", value: guildConfig.feedbackChannelId ? `<#${guildConfig.feedbackChannelId}>` : "Não configurado", inline: true },
        { name: "IA Habilitada", value: guildConfig.aiEnabled ? "Sim" : "Não", inline: true },
      );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("setup_menu")
      .setPlaceholder("Selecione o que configurar")
      .addOptions([
        { label: "Cargo Staff", value: "staff_role", description: "Cargo que pode ver tickets", emoji: "👥" },
        { label: "Categoria de Tickets", value: "ticket_category", description: "Categoria onde tickets são criados", emoji: "📁" },
        { label: "Canal de Logs", value: "log_channel", description: "Canal para logs de tickets", emoji: "📝" },
        { label: "Canal de Feedback", value: "feedback_channel", description: "Canal para feedbacks", emoji: "⭐" },
        { label: "Mensagem de Boas-vindas", value: "welcome_message", description: "Mensagem ao abrir ticket", emoji: "👋" },
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async handleSelectMenu(interaction: StringSelectMenuInteraction) {
    if (interaction.customId !== "setup_menu") return;

    const value = interaction.values[0];
    const guild = interaction.guild;
    if (!guild) return;

    try {
      switch (value) {
        case "staff_role":
          const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId("setup_staff_role_select")
            .setPlaceholder("Selecione o cargo staff")
            .setMinValues(1)
            .setMaxValues(1);
          
          const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect);
          await interaction.reply({
            content: "👥 Selecione o cargo que poderá ver e responder os tickets:",
            components: [roleRow],
            ephemeral: true,
          });
          break;

        case "ticket_category":
          const categorySelect = new ChannelSelectMenuBuilder()
            .setCustomId("setup_category_select")
            .setPlaceholder("Selecione a categoria")
            .setChannelTypes(ChannelType.GuildCategory)
            .setMinValues(1)
            .setMaxValues(1);
          
          const categoryRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(categorySelect);
          await interaction.reply({
            content: "📁 Selecione a categoria onde os tickets serão criados:",
            components: [categoryRow],
            ephemeral: true,
          });
          break;

        case "log_channel":
          const logSelect = new ChannelSelectMenuBuilder()
            .setCustomId("setup_log_channel_select")
            .setPlaceholder("Selecione o canal de logs")
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1);
          
          const logRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(logSelect);
          await interaction.reply({
            content: "📝 Selecione o canal onde os logs de tickets serão enviados:",
            components: [logRow],
            ephemeral: true,
          });
          break;

        case "feedback_channel":
          const feedbackSelect = new ChannelSelectMenuBuilder()
            .setCustomId("setup_feedback_channel_select")
            .setPlaceholder("Selecione o canal de feedback")
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1);
          
          const feedbackRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(feedbackSelect);
          await interaction.reply({
            content: "⭐ Selecione o canal onde os feedbacks serão enviados:",
            components: [feedbackRow],
            ephemeral: true,
          });
          break;

        case "welcome_message":
          const welcomeModal = new ModalBuilder()
            .setCustomId("setup_welcome")
            .setTitle("Configurar Mensagem de Boas-vindas")
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId("message")
                  .setLabel("Mensagem de Boas-vindas")
                  .setPlaceholder("Digite a mensagem que aparece ao abrir um ticket")
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true)
                  .setMaxLength(1000)
              )
            );
          await interaction.showModal(welcomeModal);
          break;
      }
    } catch (error: any) {
      discordLogger.error("Select menu error", { error: error.message });
    }
  }

  private async handleRoleSelectMenu(interaction: RoleSelectMenuInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    try {
      if (interaction.customId === "setup_staff_role_select") {
        const roleId = interaction.values[0];
        await storage.updateGuildConfig(guild.id, { staffRoleId: roleId });
        await interaction.update({
          content: `✅ Cargo Staff configurado: <@&${roleId}>`,
          components: [],
        }).catch(() => {});
      }
    } catch (error: any) {
      discordLogger.error("Role select error", { error: error.message });
    }
  }

  private async handleChannelSelectMenu(interaction: ChannelSelectMenuInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    try {
      const channelId = interaction.values[0];

      switch (interaction.customId) {
        case "setup_category_select":
          await storage.updateGuildConfig(guild.id, { ticketCategoryId: channelId });
          await interaction.update({
            content: `✅ Categoria de tickets configurada: <#${channelId}>`,
            components: [],
          }).catch(() => {});
          break;

        case "setup_log_channel_select":
          await storage.updateGuildConfig(guild.id, { logChannelId: channelId });
          await interaction.update({
            content: `✅ Canal de logs configurado: <#${channelId}>`,
            components: [],
          }).catch(() => {});
          break;

        case "setup_feedback_channel_select":
          await storage.updateGuildConfig(guild.id, { feedbackChannelId: channelId });
          await interaction.update({
            content: `✅ Canal de feedback configurado: <#${channelId}>`,
            components: [],
          }).catch(() => {});
          break;
      }
    } catch (error: any) {
      discordLogger.error("Channel select error", { error: error.message });
    }
  }

  private async handlePanelCommand(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.reply({ ephemeral: true, content: "⏳ Processando..." });

    const channel = interaction.options.getChannel("canal");
    if (!channel) {
      await interaction.editReply({ content: "Canal inválido!" });
      return;
    }

    const chooseEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Escolha o Método de Configuração")
      .setDescription("Como você deseja configurar seu painel de tickets?")
      .addFields(
        { name: "🌐 Website", value: "Configure seu painel com uma interface visual moderna no site.", inline: false },
        { name: "🎮 Discord", value: "Configure seu painel diretamente no Discord usando botões.", inline: false }
      )
      .setFooter({ text: "Escolha uma das opções abaixo" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`panel_config_website_${channel.id}`)
        .setLabel("Configurar no Website")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`panel_config_discord_${channel.id}`)
        .setLabel("Configurar no Discord")
        .setEmoji("🎮")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [chooseEmbed], components: [row] });
  }

  private async handlePanelConfigChoice(interaction: ButtonInteraction) {
    const customId = interaction.customId;
    
    try {
      await interaction.deferUpdate();

      if (customId.startsWith("panel_config_website_")) {
        const channelId = customId.replace("panel_config_website_", "");
        const dashboardUrl = "https://ticketai.up.railway.app/";
        
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("Redirecionando para o Website")
          .setDescription(`[Clique aqui para acessar o painel de configuração](${dashboardUrl})`)
          .addFields(
            { name: "Canal Selecionado", value: `<#${channelId}>`, inline: true }
          );

        await interaction.editReply({ embeds: [embed], components: [] });
      } else if (customId.startsWith("panel_config_discord_")) {
        const channelId = customId.replace("panel_config_discord_", "");
        const guild = interaction.guild;
        if (!guild) {
          await interaction.editReply({ content: "Servidor não encontrado.", components: [] });
          return;
        }

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          await interaction.editReply({ content: "Canal não encontrado.", components: [] });
          return;
        }

        const panel = await storage.createPanel({
          guildId: guild.id,
          channelId: channelId,
          createdBy: interaction.user.id,
          title: "Sistema de Tickets",
          description: "Clique no botão abaixo para abrir um ticket e entrar em contato com nossa equipe.",
          embedColor: "#5865F2",
          isConfigured: false,
        });

        if (panel) {
          await storage.createPanelButton({
            panelId: panel.id,
            label: "Abrir Ticket",
            emoji: "📩",
            style: "primary",
            order: 0,
          });

          const configEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("Configuração do Painel de Tickets")
            .setDescription("Configure seu painel de tickets usando os botões abaixo. Quando terminar, clique em **Publicar Painel**.")
            .addFields(
              { name: "Canal", value: `<#${channel.id}>`, inline: true },
              { name: "Título", value: panel.title || "Sistema de Tickets", inline: true },
              { name: "Cor", value: panel.embedColor || "#5865F2", inline: true },
              { name: "Categoria de Tickets", value: panel.categoryId ? `<#${panel.categoryId}>` : "Não configurada", inline: true },
              { name: "Botões", value: "1 botão configurado", inline: true },
            )
            .setFooter({ text: `ID do Painel: ${panel.id}` });

          const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`panel_edit_title_${panel.id}`)
              .setLabel("Editar Título/Descrição")
              .setEmoji("✏️")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`panel_edit_color_${panel.id}`)
              .setLabel("Cor do Embed")
              .setEmoji("🎨")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`panel_edit_category_${panel.id}`)
              .setLabel("Categoria")
              .setEmoji("📁")
              .setStyle(ButtonStyle.Secondary),
          );

          const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`panel_edit_buttons_${panel.id}`)
              .setLabel("Gerenciar Botões")
              .setEmoji("🔘")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`panel_edit_welcome_${panel.id}`)
              .setLabel("Mensagem de Boas-vindas")
              .setEmoji("👋")
              .setStyle(ButtonStyle.Secondary),
          );

          const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`panel_publish_${panel.id}`)
              .setLabel("Publicar Painel")
              .setEmoji("✅")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`panel_preview_${panel.id}`)
              .setLabel("Visualizar")
              .setEmoji("👁️")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`panel_delete_${panel.id}`)
              .setLabel("Cancelar")
              .setEmoji("🗑️")
              .setStyle(ButtonStyle.Danger),
          );

          await interaction.editReply({ embeds: [configEmbed], components: [row1, row2, row3] });
        } else {
          await interaction.editReply({ content: "Erro ao criar painel.", components: [] });
        }
      }
    } catch (error: any) {
      discordLogger.error("Panel config choice error", { error: error.message });
      await interaction.editReply({ content: "Erro ao processar sua solicitação.", components: [] }).catch(() => {});
    }
  }

  private async handleAICommand(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply({ ephemeral: true });

    const ativar = interaction.options.getBoolean("ativar", true);
    const prompt = interaction.options.getString("prompt");

    const updateData: any = { aiEnabled: ativar };
    if (prompt) {
      updateData.aiSystemPrompt = prompt;
    }

    await storage.updateGuildConfig(guild.id, updateData);

    const embed = new EmbedBuilder()
      .setColor(ativar ? 0x57F287 : 0xED4245)
      .setTitle(ativar ? "IA Ativada" : "IA Desativada")
      .setDescription(
        ativar
          ? "A IA agora responderá automaticamente aos tickets quando ativada pelo staff."
          : "A IA foi desativada para este servidor."
      );

    if (prompt && ativar) {
      embed.addFields({ name: "Prompt Configurado", value: prompt.slice(0, 200) + (prompt.length > 200 ? "..." : "") });
    }

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleResetCommand(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("⚠️ Confirmar Reset de Tickets")
      .setDescription(
        "**ATENÇÃO:** Esta ação irá deletar TODOS os tickets deste servidor do banco de dados.\n\n" +
        "Os canais de ticket existentes NÃO serão deletados automaticamente.\n\n" +
        "Esta ação é **IRREVERSÍVEL**!"
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_reset_tickets")
        .setLabel("Confirmar Reset")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_reset_tickets")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
  }

  private async handleKeyCommand(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply({ ephemeral: true });

    let guildConfig = await storage.getGuildConfig(guild.id);
    if (!guildConfig) {
      guildConfig = await storage.createGuildConfig({
        guildId: guild.id,
        guildName: guild.name,
        guildIcon: guild.icon || undefined,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Chave do Servidor")
      .setDescription(
        "Use esta chave para acessar o painel de gerenciamento do seu servidor no dashboard.\n\n" +
        "**⚠️ NUNCA compartilhe esta chave com ninguém!**"
      )
      .addFields(
        { name: "Sua Chave", value: `\`\`\`${guildConfig.serverKey}\`\`\`` }
      )
      .setFooter({ text: "Esta mensagem só é visível para você" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("regenerate_key")
        .setLabel("Gerar Nova Chave")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async syncGuilds() {
    for (const [guildId, guild] of this.client.guilds.cache) {
      const existing = await storage.getGuildConfig(guildId);
      if (!existing) {
        await this.registerGuild(guild);
      } else {
        await storage.updateGuildConfig(guildId, {
          guildName: guild.name,
          guildIcon: guild.icon || undefined,
        });
      }
    }
  }

  private async registerGuild(guild: any) {
    await storage.createGuildConfig({
      guildId: guild.id,
      guildName: guild.name,
      guildIcon: guild.icon || undefined,
    });
  }

  private async handleButtonInteraction(interaction: ButtonInteraction) {
    const customId = interaction.customId;
    const guild = interaction.guild;

    try {
      if (customId.startsWith("create_ticket_")) {
        await this.createTicketFromPanel(interaction);
      } else if (customId === "create_ticket") {
        await this.createTicket(interaction);
      } else if (customId === "criar_ticket") {
        await this.createTicketFromWebhookPanel(interaction);
      } else if (customId === "close_ticket") {
        await this.closeTicket(interaction);
      } else if (customId === "claim_ticket") {
        await this.claimTicket(interaction);
      } else if (customId === "notify_dm") {
        await this.notifyUserDM(interaction);
      } else if (customId === "toggle_ai") {
        await this.toggleAI(interaction);
      } else if (customId === "archive_ticket") {
        await this.archiveTicket(interaction);
      } else if (customId.startsWith("feedback_")) {
        await this.handleFeedbackRating(interaction);
      } else if (customId.startsWith("panel_config_website_") || customId.startsWith("panel_config_discord_")) {
        await this.handlePanelConfigChoice(interaction);
      } else if (customId.startsWith("panel_edit_title_")) {
        await this.handlePanelEditTitle(interaction);
      } else if (customId.startsWith("panel_edit_color_")) {
        await this.handlePanelEditColor(interaction);
      } else if (customId.startsWith("panel_edit_category_")) {
        await this.handlePanelEditCategory(interaction);
      } else if (customId.startsWith("panel_edit_buttons_")) {
        await this.handlePanelEditButtons(interaction);
      } else if (customId.startsWith("panel_edit_welcome_")) {
        await this.handlePanelEditWelcome(interaction);
      } else if (customId.startsWith("panel_publish_")) {
        await this.handlePanelPublish(interaction);
      } else if (customId.startsWith("panel_preview_")) {
        await this.handlePanelPreview(interaction);
      } else if (customId.startsWith("panel_delete_")) {
        await this.handlePanelDelete(interaction);
      } else if (customId.startsWith("panel_add_button_")) {
        await this.handlePanelAddButton(interaction);
      } else if (customId === "confirm_reset_tickets" && guild) {
        await interaction.deferUpdate();
        const count = await storage.resetTickets(guild.id);
        await interaction.editReply({
          content: `Tickets resetados com sucesso! ${count} tickets foram removidos do banco de dados.`,
          embeds: [],
          components: [],
        });
      } else if (customId === "cancel_reset_tickets") {
        await interaction.update({
          content: "Operação cancelada.",
          embeds: [],
          components: [],
        });
      } else if (customId === "regenerate_key" && guild) {
        await interaction.deferUpdate();
        const newKey = await storage.regenerateServerKey(guild.id);
        if (newKey) {
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle("Nova Chave Gerada")
            .setDescription("Sua chave anterior foi invalidada. Use a nova chave abaixo:")
            .addFields({ name: "Nova Chave", value: `\`\`\`${newKey}\`\`\`` })
            .setFooter({ text: "Esta mensagem só é visível para você" });
          await interaction.editReply({ embeds: [embed], components: [] });
        }
      }
    } catch (error: any) {
      discordLogger.error("Button interaction failed", { error: error.message });
      await this.safeReply(interaction, "Ocorreu um erro ao processar sua ação.");
    }
  }

  private async handleModalSubmit(interaction: ModalSubmitInteraction) {
    if (interaction.customId.startsWith("feedback_comment_")) {
      await this.handleFeedbackComment(interaction);
      return;
    }

    const guild = interaction.guild;
    if (!guild) return;

    try {
      if (interaction.customId === "setup_welcome") {
        const welcomeMessage = interaction.fields.getTextInputValue("message");
        await storage.updateGuildConfig(guild.id, { welcomeMessage: welcomeMessage });
        await interaction.reply({ content: "Mensagem de boas-vindas configurada!", ephemeral: true });
        return;
      }

      if (interaction.customId.startsWith("modal_panel_title_")) {
        const panelId = interaction.customId.replace("modal_panel_title_", "");
        const title = interaction.fields.getTextInputValue("title");
        const description = interaction.fields.getTextInputValue("description");
        await storage.updatePanel(panelId, { title, description });
        await interaction.reply({ content: "Título e descrição atualizados!", ephemeral: true });
      } else if (interaction.customId.startsWith("modal_panel_color_")) {
        const panelId = interaction.customId.replace("modal_panel_color_", "");
        let color = interaction.fields.getTextInputValue("color");
        if (!color.startsWith("#")) color = "#" + color;
        await storage.updatePanel(panelId, { embedColor: color });
        await interaction.reply({ content: `Cor atualizada para ${color}!`, ephemeral: true });
      } else if (interaction.customId.startsWith("modal_panel_category_")) {
        const panelId = interaction.customId.replace("modal_panel_category_", "");
        const categoryId = interaction.fields.getTextInputValue("category_id");
        
        try {
          const category = await guild.channels.fetch(categoryId);
          if (!category || category.type !== ChannelType.GuildCategory) {
            await interaction.reply({ content: "ID inválido. Certifique-se de que é uma categoria.", ephemeral: true });
            return;
          }
          await storage.updatePanel(panelId, { categoryId });
          await interaction.reply({ content: `Categoria configurada: <#${categoryId}>`, ephemeral: true });
        } catch {
          await interaction.reply({ content: "Categoria não encontrada.", ephemeral: true });
        }
      } else if (interaction.customId.startsWith("modal_panel_welcome_")) {
        const panelId = interaction.customId.replace("modal_panel_welcome_", "");
        const welcome = interaction.fields.getTextInputValue("welcome");
        await storage.updatePanel(panelId, { welcomeMessage: welcome });
        await interaction.reply({ content: "Mensagem de boas-vindas atualizada!", ephemeral: true });
      } else if (interaction.customId.startsWith("modal_panel_add_button_")) {
        const panelId = interaction.customId.replace("modal_panel_add_button_", "");
        const panel = await storage.getPanel(panelId);
        
        if (!panel) {
          await interaction.reply({ content: "Painel não encontrado.", ephemeral: true });
          return;
        }

        const label = interaction.fields.getTextInputValue("label");
        const emoji = interaction.fields.getTextInputValue("emoji") || undefined;
        let style = interaction.fields.getTextInputValue("style").toLowerCase() as any;
        
        if (!["primary", "secondary", "success", "danger"].includes(style)) {
          style = "primary";
        }

        const existingButtons = await storage.getPanelButtons(panelId);
        await storage.createPanelButton({
          panelId,
          label,
          emoji,
          style,
          order: existingButtons.length,
        });

        await interaction.reply({ content: `Botão "${label}" adicionado!`, ephemeral: true });
      }
    } catch (error: any) {
      discordLogger.error("Modal submit error", { error: error.message });
      await this.safeReply(interaction, "Erro ao salvar configuração.");
    }
  }

  private async createTicket(interaction: ButtonInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const guildConfig = await storage.getGuildConfig(guild.id);
    if (!guildConfig) {
      await interaction.reply({
        content: "Configuração do servidor não encontrada.",
        ephemeral: true,
      });
      return;
    }

    const existingTickets = await storage.getTicketsByUser(interaction.user.id, guild.id);
    const openTicket = existingTickets.find(t => t.status === "open" || t.status === "waiting");
    
    if (openTicket) {
      await interaction.reply({
        content: `Você já possui um ticket aberto: <#${openTicket.channelId}>`,
        ephemeral: true,
      });
      return;
    }

    const categoryId = guildConfig.ticketCategoryId;
    if (categoryId) {
      try {
        const category = await guild.channels.fetch(categoryId);
        if (!category || category.type !== ChannelType.GuildCategory) {
          await interaction.reply({
            content: "A categoria configurada não é válida. Por favor, contate um administrador para corrigir.",
            ephemeral: true,
          });
          return;
        }
      } catch {
        await interaction.reply({
          content: "Não foi possível encontrar a categoria de tickets. Por favor, contate um administrador.",
          ephemeral: true,
        });
        return;
      }
    }

    const ticketNumber = await storage.getNextTicketNumber(guild.id);
    const channelName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;

    const permissionOverwrites: any[] = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    if (guildConfig.staffRoleId) {
      permissionOverwrites.push({
        id: guildConfig.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId || undefined,
      permissionOverwrites,
    });

    const ticket = await storage.createTicket({
      ticketNumber,
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      userName: interaction.user.username,
      userAvatar: interaction.user.displayAvatarURL(),
      status: "open",
      aiModeEnabled: false,
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setDescription(guildConfig.welcomeMessage || "Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.")
      .addFields(
        { name: "Usuário", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Status", value: "Aberto", inline: true },
        { name: "Criado em", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined });

    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Fechar Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("claim_ticket")
          .setLabel("Reivindicar")
          .setEmoji("✋")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("notify_dm")
          .setLabel("Notificar DM")
          .setEmoji("🔔")
          .setStyle(ButtonStyle.Secondary)
      );

    const row2 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("toggle_ai")
          .setLabel("Ativar IA")
          .setEmoji("🤖")
          .setStyle(ButtonStyle.Success)
      );

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [welcomeEmbed],
      components: [row1, row2],
    });

    await interaction.reply({
      content: `Seu ticket foi criado: <#${ticketChannel.id}>`,
      ephemeral: true,
    });

    if (guildConfig.logChannelId) {
      await this.sendLog(guildConfig.logChannelId, {
        color: 0x57F287,
        title: "Novo Ticket Criado",
        description: `Ticket #${ticketNumber.toString().padStart(4, '0')} criado por <@${interaction.user.id}>`,
        fields: [
          { name: "Canal", value: `<#${ticketChannel.id}>`, inline: true },
        ],
      });
    }
  }

  private async closeTicket(interaction: ButtonInteraction) {
    const ticket = await storage.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        content: "Este não é um canal de ticket válido.",
        ephemeral: true,
      });
      return;
    }

    await storage.updateTicket(ticket.id, {
      status: "closed",
      closedAt: new Date(),
      closedBy: interaction.user.id,
      closedByName: interaction.user.username,
    });

    const closeEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("Ticket Fechado")
      .setDescription(`Este ticket foi fechado por <@${interaction.user.id}>`)
      .setTimestamp();

    const archiveRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("archive_ticket")
          .setLabel("Arquivar e Deletar")
          .setEmoji("📁")
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({
      embeds: [closeEmbed],
      components: [archiveRow],
    });

    await this.sendFeedbackDM(ticket);

    const guildConfig = await storage.getGuildConfig(ticket.guildId);
    if (guildConfig?.logChannelId) {
      await this.sendLog(guildConfig.logChannelId, {
        color: 0xED4245,
        title: "Ticket Fechado",
        description: `Ticket #${ticket.ticketNumber.toString().padStart(4, '0')} fechado por <@${interaction.user.id}>`,
        fields: [
          { name: "Usuário", value: `<@${ticket.userId}>`, inline: true },
          { name: "Staff", value: ticket.staffName || "Não atribuído", inline: true },
        ],
      });
    }
  }

  private async claimTicket(interaction: ButtonInteraction) {
    const ticket = await storage.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        content: "Este não é um canal de ticket válido.",
        ephemeral: true,
      });
      return;
    }

    await storage.updateTicket(ticket.id, {
      staffId: interaction.user.id,
      staffName: interaction.user.username,
      status: "waiting",
    });

    await interaction.reply({
      content: `<@${interaction.user.id}> assumiu o atendimento deste ticket.`,
    });
  }

  private async notifyUserDM(interaction: ButtonInteraction) {
    const ticket = await storage.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        content: "Este não é um canal de ticket válido.",
        ephemeral: true,
      });
      return;
    }

    try {
      const user = await this.client.users.fetch(ticket.userId);
      const guild = interaction.guild;

      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("Seu ticket foi respondido!")
        .setDescription(`Você tem uma nova resposta no seu ticket #${ticket.ticketNumber.toString().padStart(4, '0')}`)
        .setFooter({ text: guild?.name || "Servidor", iconURL: guild?.iconURL() || undefined })
        .setTimestamp();

      await user.send({ embeds: [dmEmbed] });
      await interaction.reply({
        content: "Notificação enviada para a DM do usuário!",
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: "Não foi possível enviar DM para o usuário. Ele pode ter as DMs fechadas.",
        ephemeral: true,
      });
    }
  }

  private async toggleAI(interaction: ButtonInteraction) {
    const ticket = await storage.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        content: "Este não é um canal de ticket válido.",
        ephemeral: true,
      });
      return;
    }

    const guildConfig = await storage.getGuildConfig(ticket.guildId);
    if (!guildConfig?.aiEnabled) {
      await interaction.reply({
        content: "A funcionalidade de IA não está habilitada neste servidor.",
        ephemeral: true,
      });
      return;
    }

    const newAiState = !ticket.aiModeEnabled;
    await storage.updateTicket(ticket.id, {
      aiModeEnabled: newAiState,
    });

    await interaction.reply({
      content: newAiState
        ? "🤖 Modo IA **ativado**! A IA irá responder automaticamente às mensagens."
        : "🤖 Modo IA **desativado**. Um membro da equipe irá atender.",
    });
  }

  private async archiveTicket(interaction: ButtonInteraction) {
    const ticket = await storage.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        content: "Este não é um canal de ticket válido.",
        ephemeral: true,
      });
      return;
    }

    await storage.updateTicket(ticket.id, {
      status: "archived",
    });

    await interaction.reply({
      content: "Arquivando e deletando canal em 5 segundos...",
    });

    setTimeout(async () => {
      try {
        const channel = interaction.channel;
        if (channel && "delete" in channel) {
          await channel.delete();
        }
      } catch (error: any) {
        discordLogger.error("Failed to delete channel", { error: error.message });
      }
    }, 5000);
  }

  private async sendFeedbackDM(ticket: any) {
    try {
      const user = await this.client.users.fetch(ticket.userId);
      const guild = await this.client.guilds.fetch(ticket.guildId);

      const feedbackEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle("Avalie seu atendimento!")
        .setDescription(`Como foi seu atendimento no ticket #${ticket.ticketNumber.toString().padStart(4, '0')}?`)
        .addFields(
          { name: "Staff", value: ticket.staffName || "Atendimento automático", inline: true },
          { name: "Status", value: "Fechado", inline: true }
        )
        .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined })
        .setTimestamp();

      const ratingRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`feedback_1_${ticket.id}`)
            .setLabel("1")
            .setEmoji("⭐")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`feedback_2_${ticket.id}`)
            .setLabel("2")
            .setEmoji("⭐")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`feedback_3_${ticket.id}`)
            .setLabel("3")
            .setEmoji("⭐")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`feedback_4_${ticket.id}`)
            .setLabel("4")
            .setEmoji("⭐")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`feedback_5_${ticket.id}`)
            .setLabel("5")
            .setEmoji("⭐")
            .setStyle(ButtonStyle.Secondary)
        );

      await user.send({
        embeds: [feedbackEmbed],
        components: [ratingRow],
      });
    } catch (error: any) {
      discordLogger.warn("Could not send feedback DM", { error: error.message });
    }
  }

  private async handleFeedbackRating(interaction: ButtonInteraction) {
    const [, ratingStr, ticketId] = interaction.customId.split("_");
    const rating = parseInt(ratingStr);

    const ticket = await storage.getTicket(ticketId);
    if (!ticket) {
      await interaction.reply({
        content: "Ticket não encontrado.",
        ephemeral: true,
      });
      return;
    }

    const existingFeedback = await storage.getFeedback(ticketId);
    if (existingFeedback) {
      await interaction.reply({
        content: "Você já avaliou este ticket!",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`feedback_comment_${ticketId}_${rating}`)
      .setTitle("Deixe um comentário (opcional)");

    const commentInput = new TextInputBuilder()
      .setCustomId("comment")
      .setLabel("Comentário")
      .setPlaceholder("Conte-nos mais sobre sua experiência...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(commentInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  }

  private async handleFeedbackComment(interaction: ModalSubmitInteraction) {
    const [, , ticketId, ratingStr] = interaction.customId.split("_");
    const rating = parseInt(ratingStr);
    const comment = interaction.fields.getTextInputValue("comment") || null;

    const ticket = await storage.getTicket(ticketId);
    if (!ticket) {
      await interaction.reply({
        content: "Ticket não encontrado.",
        ephemeral: true,
      });
      return;
    }

    await storage.createFeedback({
      ticketId,
      guildId: ticket.guildId,
      userId: interaction.user.id,
      userName: interaction.user.username,
      staffId: ticket.staffId || undefined,
      staffName: ticket.staffName || undefined,
      rating,
      comment,
    });

    const stars = "⭐".repeat(rating);
    await interaction.reply({
      content: `Obrigado pela sua avaliação! ${stars}\n${comment ? `Comentário: "${comment}"` : ""}`,
    });

    const guildConfig = await storage.getGuildConfig(ticket.guildId);
    if (guildConfig?.feedbackChannelId) {
      await this.sendFeedbackToChannel(guildConfig.feedbackChannelId, {
        userName: interaction.user.username,
        userAvatar: interaction.user.displayAvatarURL(),
        rating,
        comment,
        staffName: ticket.staffName,
        ticketNumber: ticket.ticketNumber,
      });
    }
  }

  private async sendFeedbackToChannel(channelId: string, data: any) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !("send" in channel)) return;

      const stars = "⭐".repeat(data.rating) + "☆".repeat(5 - data.rating);
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`Feedback - Ticket #${data.ticketNumber.toString().padStart(4, '0')}`)
        .setThumbnail(data.userAvatar)
        .addFields(
          { name: "Usuário", value: data.userName, inline: true },
          { name: "Avaliação", value: stars, inline: true },
          { name: "Staff", value: data.staffName || "—", inline: true }
        )
        .setTimestamp();

      if (data.comment) {
        embed.setDescription(`"${data.comment}"`);
      }

      await (channel as TextChannel).send({ embeds: [embed] });
    } catch (error: any) {
      discordLogger.error("Failed to send feedback to channel", { error: error.message });
    }
  }

  private async handleTicketMessage(message: Message) {
    const ticket = await storage.getTicketByChannel(message.channelId);
    if (!ticket || ticket.status !== "open" && ticket.status !== "waiting") return;

    await storage.createTicketMessage({
      ticketId: ticket.id,
      messageId: message.id,
      authorId: message.author.id,
      authorName: message.author.username,
      authorAvatar: message.author.displayAvatarURL(),
      content: message.content,
      isBot: message.author.bot,
      isAi: false,
    });

    if (ticket.aiModeEnabled && message.author.id === ticket.userId) {
      await this.handleAIResponse(message, ticket);
    }
  }

  private async handleAIResponse(message: Message, ticket: any) {
    if (!openai) {
      discordLogger.warn("OpenAI not configured, skipping AI response");
      return;
    }

    const guildConfig = await storage.getGuildConfig(ticket.guildId);
    if (!guildConfig) return;

    const channel = message.channel;
    if (!("send" in channel) || !("sendTyping" in channel)) return;

    try {
      await (channel as TextChannel).sendTyping();

      const messages = await storage.getTicketMessages(ticket.id);
      const conversationHistory = messages.slice(-10).map((m) => ({
        role: m.isBot || m.isAi ? "assistant" : "user",
        content: m.content,
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: guildConfig.aiSystemPrompt || "Você é um assistente de suporte amigável e profissional.",
          },
          ...conversationHistory as any,
        ],
        max_tokens: 500,
      });

      const aiResponse = response.choices[0].message.content;
      if (!aiResponse) return;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: "Assistente IA", iconURL: this.client.user?.displayAvatarURL() })
        .setDescription(aiResponse)
        .setFooter({ text: "Resposta gerada por IA" });

      const sentMessage = await (channel as TextChannel).send({ embeds: [embed] });

      await storage.createTicketMessage({
        ticketId: ticket.id,
        messageId: sentMessage.id,
        authorId: this.client.user?.id || "bot",
        authorName: "Assistente IA",
        content: aiResponse,
        isBot: true,
        isAi: true,
      });
    } catch (error: any) {
      aiLogger.error("AI response generation failed", { error: error.message });
    }
  }

  private async sendLog(channelId: string, data: any) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !("send" in channel)) return;

      const embed = new EmbedBuilder()
        .setColor(data.color)
        .setTitle(data.title)
        .setDescription(data.description)
        .setTimestamp();

      if (data.fields) {
        embed.addFields(data.fields);
      }

      await (channel as TextChannel).send({ embeds: [embed] });
    } catch (error: any) {
      discordLogger.error("Failed to send log", { error: error.message });
    }
  }

  async sendTicketPanel(channelId: string, guildId: string) {
    try {
      const guildConfig = await storage.getGuildConfig(guildId);
      if (!guildConfig) return;

      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !("send" in channel)) return;

      const guild = await this.client.guilds.fetch(guildId);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("Sistema de Tickets")
        .setDescription(
          "Clique no botão abaixo para abrir um ticket e entrar em contato com nossa equipe de suporte."
        )
        .addFields(
          { name: "Horário de Atendimento", value: "24/7", inline: true },
          { name: "Tempo Médio de Resposta", value: "< 1 hora", inline: true }
        )
        .setThumbnail(guild.iconURL() || null)
        .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Criar Ticket")
          .setEmoji("📩")
          .setStyle(ButtonStyle.Primary)
      );

      const message = await (channel as TextChannel).send({
        embeds: [embed],
        components: [row],
      });

      await storage.updateGuildConfig(guildId, {
        ticketPanelChannelId: channelId,
        ticketPanelMessageId: message.id,
      });

      return message;
    } catch (error) {
      discordLogger.error("Failed to send ticket panel");
    }
  }

  private async handlePanelEditTitle(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_edit_title_", "");
    const modal = new ModalBuilder()
      .setCustomId(`modal_panel_title_${panelId}`)
      .setTitle("Editar Título e Descrição")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("title")
            .setLabel("Título do Painel")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Descrição do Painel")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
        )
      );
    await interaction.showModal(modal);
  }

  private async handlePanelEditColor(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_edit_color_", "");
    const modal = new ModalBuilder()
      .setCustomId(`modal_panel_color_${panelId}`)
      .setTitle("Cor do Embed")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("color")
            .setLabel("Cor (hex: #5865F2)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("#5865F2")
            .setMaxLength(7)
        )
      );
    await interaction.showModal(modal);
  }

  private async handlePanelEditCategory(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_edit_category_", "");
    const modal = new ModalBuilder()
      .setCustomId(`modal_panel_category_${panelId}`)
      .setTitle("Categoria de Tickets")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("category_id")
            .setLabel("ID da Categoria")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("Cole o ID da categoria aqui")
        )
      );
    await interaction.showModal(modal);
  }

  private async handlePanelEditButtons(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_edit_buttons_", "");
    
    try {
      await interaction.deferUpdate();
      const buttons = await storage.getPanelButtons(panelId);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("Gerenciar Botões")
        .setDescription("Configure os botões do seu painel de tickets.\n\n**Botões atuais:**");

      if (buttons.length === 0) {
        embed.addFields({ name: "Nenhum botão", value: "Adicione um botão para continuar." });
      } else {
        buttons.forEach((btn, i) => {
          embed.addFields({
            name: `Botão ${i + 1}`,
            value: `${btn.emoji || ""} ${btn.label} (${btn.style})`,
            inline: true
          });
        });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`panel_add_button_${panelId}`)
          .setLabel("Adicionar Botão")
          .setEmoji("➕")
          .setStyle(ButtonStyle.Success)
          .setDisabled(buttons.length >= 5),
        new ButtonBuilder()
          .setCustomId(`panel_back_config_${panelId}`)
          .setLabel("Voltar")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error: any) {
      discordLogger.error("Error managing panel buttons", { error: error.message });
      await this.safeReply(interaction, "Erro ao gerenciar botões.");
    }
  }

  private async handlePanelEditWelcome(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_edit_welcome_", "");
    const modal = new ModalBuilder()
      .setCustomId(`modal_panel_welcome_${panelId}`)
      .setTitle("Mensagem de Boas-vindas")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("welcome")
            .setLabel("Mensagem ao abrir ticket")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setPlaceholder("Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.")
        )
      );
    await interaction.showModal(modal);
  }

  private async handlePanelAddButton(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_add_button_", "");
    const modal = new ModalBuilder()
      .setCustomId(`modal_panel_add_button_${panelId}`)
      .setTitle("Adicionar Botão")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("label")
            .setLabel("Texto do Botão")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("emoji")
            .setLabel("Emoji (pode ser emoji de servidor)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100)
            .setPlaceholder("📩 ou <:nome:id>")
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("style")
            .setLabel("Estilo (primary/secondary/success/danger)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("primary")
        )
      );
    await interaction.showModal(modal);
  }

  private async handlePanelPreview(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_preview_", "");
    const panel = await storage.getPanel(panelId);
    if (!panel) {
      await interaction.reply({ content: "Painel não encontrado.", ephemeral: true });
      return;
    }

    const buttons = await storage.getPanelButtons(panelId);
    const guild = interaction.guild;

    const colorInt = parseInt(panel.embedColor?.replace("#", "") || "5865F2", 16);
    const embed = new EmbedBuilder()
      .setColor(colorInt)
      .setTitle(panel.title || "Sistema de Tickets")
      .setDescription(panel.description || "Clique no botão abaixo para abrir um ticket.")
      .setThumbnail(guild?.iconURL() || null)
      .setFooter({ text: guild?.name || "Preview", iconURL: guild?.iconURL() || undefined });

    const buttonStyles: Record<string, ButtonStyle> = {
      primary: ButtonStyle.Primary,
      secondary: ButtonStyle.Secondary,
      success: ButtonStyle.Success,
      danger: ButtonStyle.Danger,
    };

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    buttons.forEach((btn, i) => {
      const button = new ButtonBuilder()
        .setCustomId(`preview_btn_${i}`)
        .setLabel(btn.label || "Abrir Ticket")
        .setStyle(buttonStyles[btn.style || "primary"] || ButtonStyle.Primary)
        .setDisabled(true);
      
      if (btn.emoji) {
        button.setEmoji(btn.emoji);
      }
      row.addComponents(button);
    });

    if (buttons.length > 0) {
      rows.push(row);
    }

    await interaction.reply({ 
      content: "**Pré-visualização do Painel:**", 
      embeds: [embed], 
      components: rows,
      ephemeral: true 
    });
  }

  private async getOrCreateWebhook(channel: TextChannel): Promise<any> {
    try {
      const webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(w => w.name === "ServidorWebhook");
      
      if (!webhook) {
        webhook = await channel.createWebhook({
          name: "ServidorWebhook",
          avatar: channel.guild.iconURL(),
        });
      }
      
      return webhook;
    } catch (error: any) {
      discordLogger.error("Failed to get or create webhook", { error: error.message });
      throw error;
    }
  }

  private async handlePanelPublish(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_publish_", "");
    const panel = await storage.getPanel(panelId);
    const guild = interaction.guild;
    
    if (!panel || !guild) {
      await interaction.reply({ content: "Painel não encontrado.", ephemeral: true });
      return;
    }

    await interaction.deferUpdate();

    const buttons = await storage.getPanelButtons(panelId);
    if (buttons.length === 0) {
      await interaction.followUp({ content: "Adicione pelo menos um botão antes de publicar.", ephemeral: true });
      return;
    }

    const channel = await guild.channels.fetch(panel.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.followUp({ content: "Canal não encontrado ou inválido.", ephemeral: true });
      return;
    }

    try {
      const webhook = await this.getOrCreateWebhook(channel as TextChannel);

      const colorInt = parseInt(panel.embedColor?.replace("#", "") || "5865F2", 16);
      const embed = new EmbedBuilder()
        .setColor(colorInt)
        .setTitle(panel.title || "Sistema de Tickets")
        .setDescription(panel.description || "Clique no botão abaixo para abrir um ticket.")
        .setThumbnail(guild.iconURL())
        .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined });

      const buttonStyles: Record<string, ButtonStyle> = {
        primary: ButtonStyle.Primary,
        secondary: ButtonStyle.Secondary,
        success: ButtonStyle.Success,
        danger: ButtonStyle.Danger,
      };

      const row = new ActionRowBuilder<ButtonBuilder>();
      buttons.forEach((btn) => {
        const button = new ButtonBuilder()
          .setCustomId("criar_ticket")
          .setLabel(btn.label || "Abrir Ticket")
          .setStyle(buttonStyles[btn.style || "primary"] || ButtonStyle.Primary);
        
        if (btn.emoji) {
          button.setEmoji(btn.emoji);
        }
        row.addComponents(button);
      });

      const webhookClient = new WebhookClient({ url: webhook.url });
      const message = await webhookClient.send({
        embeds: [embed],
        components: [row],
        username: guild.name,
        avatarURL: guild.iconURL() || undefined,
      });

      await storage.updatePanel(panelId, {
        messageId: message.id,
        isConfigured: true,
      });

      await interaction.editReply({
        content: `Painel publicado com sucesso em <#${panel.channelId}>!`,
        embeds: [],
        components: [],
      });
    } catch (error: any) {
      discordLogger.error("Failed to publish panel via webhook", { error: error.message });
      await interaction.followUp({ content: `Erro ao publicar painel: ${error.message}`, ephemeral: true });
    }
  }

  private async handlePanelDelete(interaction: ButtonInteraction) {
    const panelId = interaction.customId.replace("panel_delete_", "");
    await interaction.deferUpdate();
    await storage.deletePanel(panelId);
    await interaction.editReply({
      content: "Configuração do painel cancelada.",
      embeds: [],
      components: [],
    });
  }

  private async createTicketFromWebhookPanel(interaction: ButtonInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const guildConfig = await storage.getGuildConfig(guild.id);
    if (!guildConfig) {
      await interaction.reply({ content: "Configuração do servidor não encontrada.", ephemeral: true });
      return;
    }

    const existingTickets = await storage.getTicketsByUser(interaction.user.id, guild.id);
    const openTicket = existingTickets.find(t => t.status === "open" || t.status === "waiting");
    
    if (openTicket) {
      await interaction.reply({
        content: `Você já possui um ticket aberto: <#${openTicket.channelId}>`,
        ephemeral: true,
      });
      return;
    }

    const categoryId = guildConfig.ticketCategoryId;
    
    if (categoryId) {
      try {
        const category = await guild.channels.fetch(categoryId);
        if (!category || category.type !== ChannelType.GuildCategory) {
          await interaction.reply({
            content: "A categoria configurada não é válida. Por favor, contate um administrador.",
            ephemeral: true,
          });
          return;
        }
      } catch {
        await interaction.reply({
          content: "Não foi possível encontrar a categoria. Por favor, contate um administrador.",
          ephemeral: true,
        });
        return;
      }
    }

    const ticketNumber = await storage.getNextTicketNumber(guild.id);
    const channelName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;

    const permissionOverwrites: any[] = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    if (guildConfig.staffRoleId) {
      permissionOverwrites.push({
        id: guildConfig.staffRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId || undefined,
      permissionOverwrites,
    });

    const ticket = await storage.createTicket({
      ticketNumber,
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      userName: interaction.user.username,
      userAvatar: interaction.user.displayAvatarURL(),
      status: "open",
      aiModeEnabled: false,
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setDescription(guildConfig.welcomeMessage || "Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.")
      .addFields(
        { name: "Usuário", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Status", value: "Aberto", inline: true },
        { name: "Criado em", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined });

    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Fechar Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("claim_ticket").setLabel("Reivindicar").setEmoji("✋").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("notify_dm").setLabel("Notificar DM").setEmoji("🔔").setStyle(ButtonStyle.Secondary)
      );

    const row2 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId("toggle_ai").setLabel("Ativar IA").setEmoji("🤖").setStyle(ButtonStyle.Success)
      );

    await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed], components: [row1, row2] });

    await interaction.reply({ content: `Seu ticket foi criado: <#${ticketChannel.id}>`, ephemeral: true });

    if (guildConfig.logChannelId) {
      await this.sendLog(guildConfig.logChannelId, {
        color: 0x57F287,
        title: "Ticket Criado",
        description: `Um novo ticket foi aberto por <@${interaction.user.id}>`,
        fields: [
          { name: "Ticket", value: `<#${ticketChannel.id}>`, inline: true },
          { name: "Número", value: `#${ticketNumber}`, inline: true },
        ],
      });
    }
  }

  private async createTicketFromPanel(interaction: ButtonInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const customId = interaction.customId;
    const parts = customId.split("_");
    const panelId = parts[2];

    const panel = await storage.getPanel(panelId);
    if (!panel) {
      await interaction.reply({ content: "Painel não encontrado.", ephemeral: true });
      return;
    }

    const guildConfig = await storage.getGuildConfig(guild.id);
    if (!guildConfig) {
      await interaction.reply({ content: "Configuração do servidor não encontrada.", ephemeral: true });
      return;
    }

    const existingTickets = await storage.getTicketsByUser(interaction.user.id, guild.id);
    const openTicket = existingTickets.find(t => t.status === "open" || t.status === "waiting");
    
    if (openTicket) {
      await interaction.reply({
        content: `Você já possui um ticket aberto: <#${openTicket.channelId}>`,
        ephemeral: true,
      });
      return;
    }

    const categoryId = panel.categoryId || guildConfig.ticketCategoryId;
    
    if (categoryId) {
      try {
        const category = await guild.channels.fetch(categoryId);
        if (!category || category.type !== ChannelType.GuildCategory) {
          await interaction.reply({
            content: "A categoria configurada não é válida. Por favor, contate um administrador.",
            ephemeral: true,
          });
          return;
        }
      } catch {
        await interaction.reply({
          content: "Não foi possível encontrar a categoria. Por favor, contate um administrador.",
          ephemeral: true,
        });
        return;
      }
    }

    const ticketNumber = await storage.getNextTicketNumber(guild.id);
    const channelName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;

    const permissionOverwrites: any[] = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];

    if (guildConfig.staffRoleId) {
      permissionOverwrites.push({
        id: guildConfig.staffRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId || undefined,
      permissionOverwrites,
    });

    const ticket = await storage.createTicket({
      ticketNumber,
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      userName: interaction.user.username,
      userAvatar: interaction.user.displayAvatarURL(),
      status: "open",
      aiModeEnabled: false,
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setDescription(panel.welcomeMessage || guildConfig.welcomeMessage || "Bem-vindo ao suporte!")
      .addFields(
        { name: "Usuário", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Status", value: "Aberto", inline: true },
        { name: "Criado em", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined });

    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Fechar Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("claim_ticket").setLabel("Reivindicar").setEmoji("✋").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("notify_dm").setLabel("Notificar DM").setEmoji("🔔").setStyle(ButtonStyle.Secondary)
      );

    const row2 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId("toggle_ai").setLabel("Ativar IA").setEmoji("🤖").setStyle(ButtonStyle.Success)
      );

    await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed], components: [row1, row2] });

    await interaction.reply({ content: `Seu ticket foi criado: <#${ticketChannel.id}>`, ephemeral: true });

    if (guildConfig.logChannelId) {
      await this.sendLog(guildConfig.logChannelId, {
        color: 0x57F287,
        title: "Ticket Criado",
        description: `Um novo ticket foi aberto por <@${interaction.user.id}>`,
        fields: [
          { name: "Ticket", value: `<#${ticketChannel.id}>`, inline: true },
          { name: "Número", value: `#${ticketNumber}`, inline: true },
        ],
      });
    }
  }

  getStatus() {
    return {
      online: this.isReady,
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      ping: this.client.ws.ping,
    };
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      discordLogger.error("DISCORD_BOT_TOKEN is not set");
      return;
    }

    try {
      await this.client.login(token);
    } catch (error: any) {
      discordLogger.error("Failed to login to Discord", { error: error.message });
    }
  }
}

export const discordBot = new DiscordBot();
