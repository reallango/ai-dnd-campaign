// Database Migration: AI Configuration System
// This migration adds all tables needed for the database-driven AI configuration system
// Run this after db.ts has initialized the database

export function runAIMigration(db: any) {
  const database = db;
  
  // Run the migration
  database.exec(`
    -- Ollama Instances: tracks registered Ollama server endpoints
    CREATE TABLE IF NOT EXISTS ollama_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      last_health_check DATETIME,
      health_status TEXT DEFAULT 'unknown',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Available Models: models discovered or registered on each instance
    CREATE TABLE IF NOT EXISTS available_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id INTEGER NOT NULL,
      model_tag TEXT NOT NULL,
      display_name TEXT,
      parameter_size TEXT,
      quantization TEXT,
      vram_required_mb INTEGER,
      is_available INTEGER DEFAULT 1,
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instance_id) REFERENCES ollama_instances(id) ON DELETE CASCADE,
      UNIQUE(instance_id, model_tag)
    );

    -- Agent Roles: defines functional roles the AI system uses
    CREATE TABLE IF NOT EXISTS agent_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_key TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Role Assignments: maps which model on which instance handles which role
    CREATE TABLE IF NOT EXISTS role_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      model_id INTEGER NOT NULL,
      priority INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES agent_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (model_id) REFERENCES available_models(id) ON DELETE CASCADE,
      UNIQUE(role_id, priority)
    );

    -- Role Parameters: generation parameters per role
    CREATE TABLE IF NOT EXISTS role_parameters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL UNIQUE,
      temperature REAL DEFAULT 0.7,
      top_p REAL DEFAULT 0.9,
      top_k INTEGER DEFAULT 40,
      repeat_penalty REAL DEFAULT 1.1,
      num_ctx INTEGER DEFAULT 8192,
      response_format TEXT DEFAULT 'text',
      keep_alive TEXT DEFAULT '10m',
      max_tokens INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES agent_roles(id) ON DELETE CASCADE
    );

    -- System Prompts: versioned system prompts per role
    CREATE TABLE IF NOT EXISTS system_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      prompt_text TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES agent_roles(id) ON DELETE CASCADE
    );

    -- App Settings: global key-value settings
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default agent roles
  const seedRoles = [
    { role_key: 'dm', display_name: 'Dungeon Master', description: 'Main orchestrator — analyzes player actions and routes to other agents', icon: '🎯', sort_order: 1 },
    { role_key: 'narrator', display_name: 'Narrator', description: 'Generates rich scene descriptions, atmosphere, and lore', icon: '🎭', sort_order: 2 },
    { role_key: 'combat', display_name: 'Combat Master', description: 'Handles combat resolution, initiative, and action sequences', icon: '⚔️', sort_order: 3 },
    { role_key: 'npc', display_name: 'NPC Generator', description: 'Creates and voices NPCs, shopkeepers, and encounter characters', icon: '🧙', sort_order: 4 },
    { role_key: 'state', display_name: 'State Manager', description: 'Manages JSON game state — inventory, stats, world state updates', icon: '📊', sort_order: 5 },
    { role_key: 'character', display_name: 'Character Builder', description: 'Guides players through character creation', icon: '🛡️', sort_order: 6 },
  ];

  const insertRole = database.prepare(`
    INSERT OR IGNORE INTO agent_roles (role_key, display_name, description, icon, sort_order)
    VALUES (@role_key, @display_name, @description, @icon, @sort_order)
  `);

  for (const role of seedRoles) {
    insertRole.run(role);
  }

  // Seed default role parameters
  const seedParams = [
    { role_key: 'dm', temperature: 0.7, top_p: 0.9, top_k: 40, repeat_penalty: 1.1, num_ctx: 8192, response_format: 'text', keep_alive: '10m', max_tokens: 1024 },
    { role_key: 'narrator', temperature: 0.9, top_p: 0.95, top_k: 40, repeat_penalty: 1.1, num_ctx: 8192, response_format: 'text', keep_alive: '10m', max_tokens: 1024 },
    { role_key: 'combat', temperature: 0.5, top_p: 0.8, top_k: 40, repeat_penalty: 1.1, num_ctx: 4096, response_format: 'text', keep_alive: '10m', max_tokens: 512 },
    { role_key: 'npc', temperature: 0.85, top_p: 0.9, top_k: 40, repeat_penalty: 1.1, num_ctx: 4096, response_format: 'text', keep_alive: '10m', max_tokens: 512 },
    { role_key: 'state', temperature: 0.1, top_p: 0.5, top_k: 20, repeat_penalty: 1.0, num_ctx: 4096, response_format: 'json', keep_alive: '5m', max_tokens: 2048 },
    { role_key: 'character', temperature: 0.7, top_p: 0.9, top_k: 40, repeat_penalty: 1.1, num_ctx: 4096, response_format: 'text', keep_alive: '10m', max_tokens: 512 },
  ];

  // Get role IDs
  const getRoleId = database.prepare('SELECT id FROM agent_roles WHERE role_key = ?');
  const insertParams = database.prepare(`
    INSERT OR IGNORE INTO role_parameters (role_id, temperature, top_p, top_k, repeat_penalty, num_ctx, response_format, keep_alive, max_tokens)
    VALUES (@role_id, @temperature, @top_p, @top_k, @repeat_penalty, @num_ctx, @response_format, @keep_alive, @max_tokens)
  `);

  for (const p of seedParams) {
    const role = getRoleId.get(p.role_key) as { id: number };
    if (role) {
      insertParams.run({ role_id: role.id, ...p });
    }
  }

  // Seed default system prompts
  const seedPrompts = [
    {
      role_key: 'dm',
      prompt_text: `You are the Dungeon Master (DM) for a D&D 5e adventure. Your role is to orchestrate the game, interpret player actions, and coordinate with specialized agents (Narrator, Combat, NPC, State, Character Builder) to deliver a seamless storytelling experience.

When a player takes an action, analyze it and determine which specialized agent should handle the response:
- For exploration, scene descriptions, atmosphere → Narrator
- For combat encounters, dice rolls, initiative → Combat
- For NPCs, merchants, quest givers → NPC
- For inventory, stats, world changes → State
- For character creation/advancement → Character Builder

Always respond in character as the DM, guiding the narrative forward while making the world feel alive and responsive to player choices.`,
      notes: 'Default DM system prompt'
    },
    {
      role_key: 'narrator',
      prompt_text: `You are the Narrator for a D&D 5e adventure. Your specialty is crafting rich, immersive descriptions that bring the world to life.

Describe locations with all five senses — what things look, sound, smell, feel, or taste like. Use evocative language that helps players visualize each scene. Weave in lore, history, and atmospheric details naturally.

When describing non-player characters, give them distinct voices and personalities. Describe their mannerisms, speech patterns, and emotional states. Make every NPC memorable.

Set the mood for each scene: tense, joyful, mysterious, dangerous, or whimsical. Your descriptions should inspire player imagination and drive engagement.`,
      notes: 'Default Narrator system prompt'
    },
    {
      role_key: 'combat',
      prompt_text: `You are the Combat Master for a D&D 5e adventure. Your role is to resolve combat encounters fairly and dramatically.

When resolving combat:
1. Establish initiative order clearly
2. Describe combat actions cinematically — not just "you hit" but HOW
3. Apply rules consistently: modifiers, advantage/disadvantage, critical hits
4. Keep combat flowing — don't let analysis paralysis slow things down
5. Describe damage dramatically: "The goblin's blade slices across your arm" not "You take 6 damage"

For dice rolls, announce the roll, show the result, then describe the outcome. Make every roll matter.

Balance is your responsibility — challenge the players without overwhelming them unless narrative demands it.`,
      notes: 'Default Combat system prompt'
    },
    {
      role_key: 'npc',
      prompt_text: `You are the NPC Generator for a D&D 5e adventure. Your role is to create and voice memorable non-player characters.

When creating or voicing NPCs:
- Give each NPC a distinct personality, quirks, and speech patterns
- Consider their background: what do they want, fear, hate, love?
- NPCs should react to the party based on their personalities and knowledge
- Shopkeepers set prices based on location and their attitude
- Quest givers provide enough information to be interesting but not complete hand-holding

Make NPCs feel like real people with goals, not just quest dispensers or merchant interfaces. Players should remember specific NPCs.`,
      notes: 'Default NPC system prompt'
    },
    {
      role_key: 'state',
      prompt_text: `You are the State Manager for a D&D 5e adventure. Your role is to track and manage the game state accurately.

You work with JSON data structures representing:
- Player characters: stats, HP, AC, abilities, conditions
- Inventory: items, quantities, weights, equip status
- World state: quest flags, NPC locations, faction relationships
- Session notes: important discoveries, story beats

When updating state:
- Be precise with numbers (don't fudge rolls or HP)
- Track gold and valuable items carefully
- Note time passed and narrative consequences
- Keep a coherent record of what happened

Always respond with valid JSON that can be parsed by the game system. Clarity and accuracy are your top priorities.`,
      notes: 'Default State Manager system prompt'
    },
    {
      role_key: 'character',
      prompt_text: `You are the Character Builder for a D&D 5e adventure. Your role is to guide players through creating and advancing their characters.

For character creation:
- Walk through each step: race, class, background, stats
- Explain options in player-friendly language
- Suggest builds that match the player's playstyle preferences
- Help with character backstory that fits the campaign
- Ensure legal builds per D&D 5e rules

For level advancement:
- Explain class features clearly
- Help players understand their options
- Suggest useful feats or ability score improvements

Make character creation an engaging experience, not a form to fill out. Help players bring their character visions to life.`,
      notes: 'Default Character Builder system prompt'
    },
  ];

  const insertPrompt = database.prepare(`
    INSERT INTO system_prompts (role_id, prompt_text, version, is_active, notes)
    SELECT @role_id, @prompt_text, 1, 1, @notes
    WHERE NOT EXISTS (SELECT 1 FROM system_prompts WHERE role_id = @role_id)
  `);

  for (const p of seedPrompts) {
    const role = getRoleId.get(p.role_key) as { id: number };
    if (role) {
      insertPrompt.run({ role_id: role.id, ...p });
    }
  }

  // Seed default app settings
  const seedSettings = [
    { key: 'health_check_interval_sec', value: '60', description: 'How often to check Ollama instance health (in seconds)' },
    { key: 'fallback_enabled', value: 'true', description: 'Whether to fall back to DM role when target role is unavailable' },
    { key: 'max_context_beats', value: '20', description: 'Maximum number of conversation turns to include in context' },
    { key: 'model_swap_timeout_sec', value: '30', description: 'Timeout when switching between models (in seconds)' },
  ];

  const insertSetting = database.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, description)
    VALUES (@key, @value, @description)
  `);

  for (const s of seedSettings) {
    insertSetting.run(s);
  }

  console.log('AI configuration migration completed');
}