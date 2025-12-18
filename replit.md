# Discord Ticket Bot

## Overview
A comprehensive Discord ticket bot system with AI support, feedback ratings, and a web dashboard for management. The bot allows users to create support tickets, get responses from AI or staff, and rate their experience with a star-based feedback system.

## Features
- **Multi-Panel System**: Create multiple ticket panels in different channels with customizable settings
- **Interactive Configuration**: Admin panel with buttons to configure title, description, colors, emojis, and buttons
- **Custom Server Emojis**: Support for custom Discord server emojis in panel buttons
- **Private Ticket Channels**: Each ticket creates a private channel for the user and staff
- **AI Integration**: ChatGPT-powered automatic responses in tickets
- **Staff Management**: Claim tickets, notify users via DM
- **Feedback System**: 5-star rating system with comments after ticket closure
- **Archive System**: Archive and delete closed tickets
- **Web Dashboard**: View statistics, manage guilds, configure settings, and manage panels via API

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Discord**: discord.js v14
- **AI**: OpenAI GPT-5

## Project Structure
```
client/                 # Frontend React application
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and hooks
│   └── App.tsx         # Main app with routing

server/                 # Backend Express server
├── db.ts               # Database connection
├── discord-bot.ts      # Discord bot logic
├── routes.ts           # API endpoints
├── storage.ts          # Data access layer
└── index.ts            # Server entry point

shared/
└── schema.ts           # Database schema and types
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `DISCORD_BOT_TOKEN` - Discord bot token
- `OPENAI_API_KEY` - OpenAI API key for AI responses

## Discord Bot Commands
### Slash Commands (Admin only)
- `/setup-tickets` - Configure staff role, ticket category, and log channel
- `/painel-ticket` - Create a ticket panel with custom or AI-generated embed
- `/ativar-ia` - Toggle AI responses globally for the server
- `/resetar-tickets` - Reset all tickets for the server
- `/servidor-key` - View the server key for dashboard access (admin only)

### Button Interactions
- "Criar Ticket" - Open a new support ticket
- Inside tickets:
  - "Fechar Ticket" - Close the ticket
  - "Reivindicar" - Staff claims the ticket
  - "Notificar DM" - Send DM notification to user
  - "Ativar IA" - Toggle AI responses for this ticket

## Dashboard Security
The dashboard uses a server-specific key for authentication:
1. Admin uses `/servidor-key` command in Discord to get the key
2. Key is entered in the dashboard login form
3. All API requests use Authorization headers (not URL params)
4. Protected fields cannot be modified via API (serverKey is never exposed)

## Database Schema
- `guild_configs` - Server configurations
- `tickets` - Ticket records with status tracking
- `ticket_messages` - Message history for archiving
- `feedbacks` - User ratings and comments
- `ticket_panels` - Multi-panel configurations (channel, title, description, color, category, welcome message)
- `panel_buttons` - Button configurations for panels (label, emoji, style, order)

## API Endpoints
### Panel Management (Authorization: Bearer {serverKey})
- `GET /api/dashboard/panels` - List all panels for the guild
- `GET /api/dashboard/panels/:id` - Get panel with buttons
- `POST /api/dashboard/panels` - Create new panel
- `PATCH /api/dashboard/panels/:id` - Update panel settings
- `DELETE /api/dashboard/panels/:id` - Delete panel
- `POST /api/dashboard/panels/:panelId/buttons` - Add button to panel
- `PATCH /api/dashboard/buttons/:id` - Update button
- `DELETE /api/dashboard/buttons/:id` - Delete button

## Recent Changes
- **Dashboard UX Improvements** (Dec 18, 2025):
  - `/setup-tickets` now offers choice between website or Discord-based configuration
  - New API endpoints to fetch server data (channels, categories, roles, emojis)
  - Settings page completely redesigned with automatic dropdowns (no manual ID input)
  - Panel management section with create, edit, delete functionality
  - Button customization with color picker and server emoji picker
  - AI configuration tab for toggling and setting custom prompts
  - Proper error handling with toast notifications for authorization issues
- **Webhook Panel Publishing** (Dec 17, 2025):
  - `/painel-ticket` now sends panel messages via webhook with server avatar
  - Webhook named "ServidorWebhook" is automatically created/reused per channel
  - Fixed ticket evaluation message to include timestamp and status when closing
  - New "criar_ticket" button handler for webhook-based panels
  - Separate `createTicketFromWebhookPanel` function for webhook interactions
- Multi-panel system with separate configurations per panel
- Interactive admin configuration panel with buttons (no more command-based setup)
- Support for custom server emojis in buttons
- Category validation before ticket creation to prevent errors
- API endpoints for managing panels via website
- AI integration with OpenAI GPT-5
- Feedback system with 5-star ratings

## Webhook Implementation Details
- When publishing a panel, the bot searches for existing webhook named "ServidorWebhook"
- If webhook doesn't exist, bot creates one with the server's icon as avatar
- Panel messages are sent via webhook with server name as username
- Webhook is reused for multiple panels in the same channel
- Button customId is fixed to "criar_ticket" for all panel buttons
- Ticket creation from webhook panels uses dedicated handler function

## Deploy no Railway

### Compatibilidade
O bot é compatível com deploy no Railway e outras plataformas. Funciona com ou sem PostgreSQL:
- **Com PostgreSQL**: Define `DATABASE_URL` e usa banco de dados PostgreSQL
- **Sem PostgreSQL**: Usa armazenamento em arquivo JSON automaticamente

### Arquivos de Configuração
- `Procfile` - Define o comando de start para Railway/Heroku
- `railway.json` - Configurações específicas do Railway
- `nixpacks.toml` - Configuração de build para Nixpacks
- `.env.example` - Exemplo de variáveis de ambiente

### Passos para Deploy no Railway
1. Crie um novo projeto no Railway
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente:
   - `DISCORD_BOT_TOKEN` (obrigatório)
   - `DATABASE_URL` (opcional - se não configurar, usa JSON)
   - `OPENAI_API_KEY` (opcional - para IA)
   - `NODE_ENV=production`
4. Deploy automático será iniciado

### Armazenamento JSON
Quando `DATABASE_URL` não está definido:
- Dados são salvos em `./data/database.json`
- Funciona perfeitamente para servidores pequenos/médios
- Backup é simples (copiar arquivo JSON)
- Migração para PostgreSQL possível a qualquer momento

### Variáveis de Ambiente
```bash
# Obrigatório
DISCORD_BOT_TOKEN=seu_token_aqui

# Opcional - PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/db

# Opcional - OpenAI para IA
OPENAI_API_KEY=sua_chave_aqui

# Opcional - Diretório de dados JSON
DATA_DIR=./data

# Produção
NODE_ENV=production
```
