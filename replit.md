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
- **Database**: PostgreSQL with Drizzle ORM (or JSON file storage)
- **Discord**: discord.js v14
- **AI**: OpenAI GPT-4

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
├── storage.ts          # Database storage layer
├── json-storage.ts     # JSON file storage fallback
└── index.ts            # Server entry point

shared/
└── schema.ts           # Database schema and types
```

## Environment Variables

### Required
- `DISCORD_BOT_TOKEN` - Discord bot token (keep this secret!)

### Optional
- `DATABASE_URL` - PostgreSQL connection string (if not set, uses JSON file storage)
- `OPENAI_API_KEY` - OpenAI API key for AI responses
- `DATA_DIR` - Directory for JSON storage (defaults to `./data`)
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Set to `production` for deployments

## Discord Bot Commands
### Slash Commands (Admin only)
- `/setup-tickets` - Configure staff role, ticket category, and log channel
- `/painel-ticket` - Create a ticket panel with custom settings
- `/ativar-ia` - Toggle AI responses globally for the server
- `/resetar-tickets` - Reset all tickets for the server (irreversible!)
- `/servidor-key` - View the server key for dashboard access (admin only)

### Button Interactions
- "Criar Ticket" - Open a new support ticket
- Inside tickets:
  - "Fechar Ticket" - Close the ticket
  - "Reivindicar" - Staff claims the ticket
  - "Notificar DM" - Send DM notification to user
  - "Ativar IA" - Toggle AI responses for this ticket
  - "Arquivar e Deletar" - Archive and delete closed ticket

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
- `ticket_panels` - Multi-panel configurations
- `panel_buttons` - Button configurations for panels

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

## Recent Changes (Dec 18, 2025)

### Bug Fixes
- Fixed exposed Discord bot token in `.replit` configuration
- Fixed async/await issue in channel deletion timeout
- Fixed feedback comment modal customId parsing
- Fixed duplicate button customIds in panel publishing
- Fixed button layout to respect Discord's 5-button-per-row limit
- Updated panel preview to properly handle multiple button rows

### Features & Improvements
- Multi-panel system with separate configurations per panel
- Interactive admin configuration panel with buttons
- Support for custom server emojis in buttons
- Category validation before ticket creation
- API endpoints for managing panels via website
- AI integration with OpenAI GPT-4
- 5-star feedback system with comments

## Webhook Implementation Details
- When publishing a panel, the bot searches for existing webhook named "ServidorWebhook"
- If webhook doesn't exist, bot creates one with the server's icon as avatar
- Panel messages are sent via webhook with server name as username
- Webhook is reused for multiple panels in the same channel
- Buttons have unique customIds to prevent conflicts
- Ticket creation from webhook panels uses dedicated handler function

## Deployment

### Compatible Platforms
This bot is compatible with any Node.js hosting platform:
- **Replit** (development/testing)
- **Railway** (recommended for production)
- **Heroku** (legacy)
- **VPS** (DigitalOcean, Linode, AWS, etc.)

### Storage Options
The bot automatically detects which storage to use:

#### PostgreSQL Database (Recommended)
- Set `DATABASE_URL` environment variable
- Provides better performance and scalability
- Required for production deployments at scale
- Automatic migrations handled by Drizzle ORM

#### JSON File Storage (Default Fallback)
- Used when `DATABASE_URL` is not configured
- Stores data in `./data/database.json`
- Perfect for small to medium-sized servers
- Simple backup (copy the JSON file)
- No database setup required

### Deploy to Railway

#### Step 1: Prepare Your Project
```bash
# Ensure your repository is clean
git add .
git commit -m "Deploy to Railway"
git push
```

#### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "Start New Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub account and select this repository

#### Step 3: Configure Environment Variables
In Railway dashboard, add:
```
DISCORD_BOT_TOKEN=your_discord_token_here
NODE_ENV=production
```

Optional:
```
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=your_openai_key_here
```

#### Step 4: Deploy
- Railway will automatically detect `nixpacks.toml` configuration
- Build process: `npm ci` → `npm run build`
- Start command: `npm run start`
- The bot will be live immediately!

### Configuration Files
- `Procfile` - Process definition for Railway/Heroku
- `railway.json` - Railway-specific configuration (auto-detected)
- `nixpacks.toml` - Build environment configuration
- `.env.example` - Environment variables template
- `.gitignore` - Excludes `data/` directory and sensitive files

### First Run Checklist
- [ ] Set `DISCORD_BOT_TOKEN` environment variable
- [ ] (Optional) Set `DATABASE_URL` for PostgreSQL
- [ ] (Optional) Set `OPENAI_API_KEY` for AI features
- [ ] Ensure bot has proper Discord permissions
- [ ] Run `/setup-tickets` command to initialize the guild
- [ ] Test creating a ticket with `/painel-ticket`

### Backup & Migration
#### JSON to PostgreSQL Migration
1. Set up PostgreSQL database
2. Set `DATABASE_URL` environment variable
3. Restart the application
4. Historical data remains in `./data/database.json` for reference
5. New data will be stored in PostgreSQL

#### Backup Process
- **JSON Storage**: Copy `./data/database.json` to safe location
- **PostgreSQL**: Use standard database backup tools (`pg_dump`, etc.)

## Troubleshooting

### Bot Not Responding
1. Verify `DISCORD_BOT_TOKEN` is set correctly
2. Check bot has required Discord permissions
3. Ensure bot is invited to the server
4. Check logs: `npm run dev` to see real-time logs

### Database Connection Issues
- If `DATABASE_URL` is invalid, bot automatically falls back to JSON storage
- Check database credentials in `DATABASE_URL`
- Verify database is accessible from deployment location

### JSON Storage Issues
- Ensure `./data/` directory has write permissions
- On Railway, this is handled automatically
- Check available disk space

### AI Not Working
- Verify `OPENAI_API_KEY` is set
- Check OpenAI API quota and billing
- Verify model name is correct (gpt-4o-mini)

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run check

# Database migrations
npm run db:push
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your values
```

## Support
For issues, questions, or feature requests, please open an issue on GitHub or contact the development team.
