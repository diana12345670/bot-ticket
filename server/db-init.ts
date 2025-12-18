import { pool, hasDatabase } from "./db";
import { dbLogger } from "./logger";

/**
 * Initialize the database schema by running migrations
 * This ensures all tables exist before the bot tries to use them
 */
export async function initializeDatabase(): Promise<boolean> {
  if (!hasDatabase || !pool) {
    dbLogger.warn("Database not configured, skipping initialization");
    return false;
  }

  const client = await pool.connect();
  try {
    dbLogger.info("Starting database initialization...");

    // Check if all required tables exist
    const requiredTables = ['guild_configs', 'tickets', 'ticket_messages', 'ticket_panels', 'feedbacks', 'panel_buttons'];
    const missingTables: string[] = [];
    
    for (const tableName of requiredTables) {
      const tableCheckQuery = `
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `;
      const result = await client.query(tableCheckQuery, [tableName]);
      if (result.rows.length === 0) {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length === 0) {
      dbLogger.success("Database tables already exist");
      return true;
    }

    dbLogger.info(`Creating missing database tables: ${missingTables.join(', ')}`);

    // Drop and recreate ENUMs if needed (ENUMs can't be modified, only dropped)
    try {
      await client.query(`DROP TYPE IF EXISTS ticket_status CASCADE;`);
      dbLogger.debug("Dropped existing ticket_status type");
    } catch (e) {
      // Ignore if type doesn't exist
    }

    try {
      await client.query(`DROP TYPE IF EXISTS button_style CASCADE;`);
      dbLogger.debug("Dropped existing button_style type");
    } catch (e) {
      // Ignore if type doesn't exist
    }

    // Create all required tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS guild_configs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id VARCHAR(32) NOT NULL UNIQUE,
        guild_name TEXT NOT NULL,
        guild_icon TEXT,
        server_key VARCHAR(64) NOT NULL UNIQUE,
        ticket_category_id VARCHAR(32),
        ticket_panel_channel_id VARCHAR(32),
        ticket_panel_message_id VARCHAR(32),
        feedback_channel_id VARCHAR(32),
        log_channel_id VARCHAR(32),
        staff_role_id VARCHAR(32),
        ai_enabled BOOLEAN DEFAULT FALSE,
        ai_system_prompt TEXT DEFAULT 'Você é um assistente de suporte amigável e profissional. Responda de forma clara e objetiva.',
        welcome_message TEXT DEFAULT 'Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.',
        panel_title TEXT DEFAULT 'Sistema de Tickets',
        panel_description TEXT DEFAULT 'Clique no botão abaixo para abrir um ticket e entrar em contato com nossa equipe de suporte.',
        panel_button_text TEXT DEFAULT 'Abrir Ticket',
        panel_color VARCHAR(7) DEFAULT '#5865F2',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create ticket_status ENUM - now safe since we dropped it above
    try {
      await client.query(`
        CREATE TYPE ticket_status AS ENUM ('open', 'waiting', 'closed', 'archived');
      `);
      dbLogger.debug("Created ticket_status enum");
    } catch (error: any) {
      if (error.code !== "42710") { // 42710 = type already exists
        throw error;
      }
      dbLogger.debug("ticket_status enum already exists");
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number INTEGER NOT NULL,
        guild_id VARCHAR(32) NOT NULL,
        channel_id VARCHAR(32) NOT NULL UNIQUE,
        user_id VARCHAR(32) NOT NULL,
        user_name TEXT NOT NULL,
        user_avatar TEXT,
        status ticket_status DEFAULT 'open' NOT NULL,
        staff_id VARCHAR(32),
        staff_name TEXT,
        ai_mode_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        closed_by VARCHAR(32),
        closed_by_name TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id VARCHAR NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        message_id VARCHAR(32) NOT NULL,
        author_id VARCHAR(32) NOT NULL,
        author_name TEXT NOT NULL,
        author_avatar TEXT,
        content TEXT NOT NULL,
        is_bot BOOLEAN DEFAULT FALSE,
        is_ai BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create button_style ENUM - now safe since we dropped it above
    try {
      await client.query(`
        CREATE TYPE button_style AS ENUM ('primary', 'secondary', 'success', 'danger');
      `);
      dbLogger.debug("Created button_style enum");
    } catch (error: any) {
      if (error.code !== "42710") { // 42710 = type already exists
        throw error;
      }
      dbLogger.debug("button_style enum already exists");
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_panels (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id VARCHAR(32) NOT NULL,
        channel_id VARCHAR(32) NOT NULL,
        message_id VARCHAR(32),
        created_by VARCHAR(32) NOT NULL,
        title TEXT DEFAULT 'Sistema de Tickets',
        description TEXT DEFAULT 'Clique no botão abaixo para abrir um ticket.',
        embed_color VARCHAR(7) DEFAULT '#5865F2',
        category_id VARCHAR(32),
        welcome_message TEXT DEFAULT 'Bem-vindo ao suporte! Um membro da equipe irá atendê-lo em breve.',
        is_configured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS panel_buttons (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        panel_id VARCHAR NOT NULL REFERENCES ticket_panels(id) ON DELETE CASCADE,
        label TEXT DEFAULT 'Abrir Ticket',
        emoji TEXT DEFAULT '📩',
        style button_style DEFAULT 'primary',
        "order" INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id VARCHAR NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        guild_id VARCHAR(32) NOT NULL,
        user_id VARCHAR(32) NOT NULL,
        user_name TEXT NOT NULL,
        staff_id VARCHAR(32),
        staff_name TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guild_configs_guild_id ON guild_configs(guild_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets(guild_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_channel_id ON tickets(channel_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feedbacks_guild_id ON feedbacks(guild_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_panels_guild_id ON ticket_panels(guild_id);`);

    dbLogger.success("Database tables created successfully");
    
    // CRITICAL: Verify all tables exist after creation (must be 100%)
    const verifyQuery = `
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ANY($1)
    `;
    const verifyResult = await client.query(verifyQuery, [requiredTables]);
    const createdCount = verifyResult.rows.length;
    
    if (createdCount === requiredTables.length) {
      dbLogger.success(`Database initialization complete: ${createdCount}/${requiredTables.length} tables verified ✓`);
      return true;
    } else {
      const missingAfterCreate = requiredTables.filter(
        t => !verifyResult.rows.some(r => r.table_name === t)
      );
      dbLogger.error(`Database verification FAILED - Missing tables: ${missingAfterCreate.join(', ')}`, {
        found: createdCount,
        required: requiredTables.length,
        missing: missingAfterCreate,
      });
      return false; // CRITICAL: Return false if not all tables exist
    }
  } catch (error: any) {
    // Ignore errors if tables already exist
    if (error.message && error.message.includes("already exists")) {
      dbLogger.success("Database tables already initialized");
      return true;
    }

    if (error.code === "42P07") {
      // Duplicate table error - tables already exist
      dbLogger.success("Database tables already exist");
      return true;
    }

    if (error.code === "42P01") {
      // Relation does not exist - critical error
      dbLogger.error("Database relation does not exist - schema incomplete", {
        error: error.message,
        code: error.code,
      });
      return false;
    }

    dbLogger.error("Database initialization failed", {
      error: error.message,
      code: error.code,
    });
    return false;
  } finally {
    client.release();
  }
}

/**
 * Test database connection with retry logic
 */
export async function testDatabaseConnection(maxRetries: number = 5): Promise<boolean> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      if (!pool) {
        dbLogger.warn("Database pool not available");
        return false;
      }

      const client = await pool.connect();
      const result = await client.query("SELECT 1");
      client.release();

      dbLogger.success("Database connection test successful");
      return true;
    } catch (error: any) {
      retries++;
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);

      dbLogger.warn("Database connection test failed", {
        attempt: `${retries}/${maxRetries}`,
        error: error.message,
        retryIn: `${delay}ms`,
      });

      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  dbLogger.error("Database connection test failed after retries", {
    maxRetries,
  });
  return false;
}
