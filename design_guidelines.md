# Design Guidelines: Discord Ticket Bot

## Design Approach
**Discord-Native Design System**: Following Discord's UI/UX patterns with enhanced visual hierarchy through embeds, buttons, and emoji usage.

## Core Design Elements

### A. Discord Embed Structure
**Ticket Panel Embed:**
- Rich embed with branded thumbnail (server icon)
- Clear title: "🎫 Sistema de Tickets"
- Description explaining ticket purpose
- Footer with server name and timestamp
- Primary color: Discord Blurple (#5865F2) for consistency

**Ticket Channel Embeds:**
- Welcome message: Professional embed with user avatar, ticket number, and instructions
- Color coding: Blue (#5865F2) for active, Green (#57F287) for AI mode, Red (#ED4245) for closing
- Fields for ticket info: Status, Assigned Staff, Created At
- Inline fields for compact display

**Feedback Embed:**
- Clean 5-star display using emoji (⭐)
- Separate fields for rating, comments, and staff name
- Timestamp footer

### B. Button Layout System
**Ticket Creation Panel:**
- Single prominent button: "📩 Criar Ticket"
- Button style: Primary (blurple)

**Active Ticket Controls:**
- Row 1: [🔒 Fechar Ticket] [🔄 Resgatar] [🔔 Notificar DM]
- Row 2: [🤖 Ativar IA] (toggle style - Success when active)
- All buttons: Secondary style for visibility against embed backgrounds

**Feedback Interface:**
- Row 1: [⭐] [⭐⭐] [⭐⭐⭐] [⭐⭐⭐⭐] [⭐⭐⭐⭐⭐]
- Buttons using Emoji style for visual appeal

### C. Typography & Formatting
**Hierarchy:**
- Embed Titles: **Bold**, 18-20 char max for clarity
- Descriptions: Regular text, max 250 chars
- Field Names: **Bold**, concise labels
- Field Values: Regular, formatted with emoji prefixes

**Emoji System:**
- Status indicators: 🟢 (open), 🟡 (waiting), 🔴 (closed)
- Actions: 🔒 (close), 📩 (create), 🔔 (notify), 🤖 (AI)
- Feedback: ⭐ (rating), 💬 (comment), 👤 (staff)

### D. Message Patterns
**DM Notifications:**
- Concise embed with ticket link
- Clear action needed message
- Server context (name + icon)

**AI Response Format:**
- Prefix with 🤖 emoji
- Subtle markdown formatting for readability
- Clear attribution: "Resposta da IA"

**Archive Messages:**
- Summary embed with ticket stats
- Transcript link (if applicable)
- Participant list

## Layout Specifications

### Spacing & Organization
- Embed field spacing: Inline for 2-column data display
- Button spacing: Default Discord button gaps
- Message grouping: Related messages within 1-2 seconds

### Visual Hierarchy
1. Ticket number/title (most prominent)
2. Status indicators and buttons
3. Metadata (timestamps, staff info)
4. Historical messages (chronological)

## Component Library

**Core Components:**
- Ticket Creation Panel (persistent message)
- Ticket Control Panel (ephemeral/persistent buttons)
- Feedback Modal/Message
- DM Notification Template
- Archive Summary Embed

**Webhook Customization:**
- Bot name: Server-specific
- Avatar: Server icon via webhook
- Username format: "[Server Name] Tickets"

## Critical Implementation Notes
- Maintain Discord's 4000 char embed limit
- Use ephemeral messages for confirmations
- Leverage Discord's interaction responses for instant feedback
- Keep button labels under 80 characters
- Maximum 5 buttons per row, 5 rows per message