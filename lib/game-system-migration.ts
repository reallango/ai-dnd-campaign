// Database Migration: Game System Framework
// This migration adds tables for managing game system packages (D&D 5e, Pathfinder, VtM, etc.)
// Each game system stores its character schema, rules, and catalog data in flexible JSON

export function runGameSystemMigration(db: any) {
  const database = db;
  
  // Run the migration
  database.exec(`
    -- Game Systems: tracks installed game system packages
    CREATE TABLE IF NOT EXISTS game_systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      short_name TEXT,
      publisher TEXT,
      version TEXT DEFAULT '1.0.0',
      description TEXT,
      genre TEXT,
      icon TEXT,
      schema_version TEXT DEFAULT '1',
      is_active INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      config TEXT DEFAULT '{}',
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Game System Data: stores flexible JSON data for each system
    CREATE TABLE IF NOT EXISTS game_system_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_id INTEGER NOT NULL REFERENCES game_systems(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      data TEXT NOT NULL,
      entry_count INTEGER DEFAULT 0,
      version TEXT DEFAULT '1.0.0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(system_id, category)
    );
  `);

  // Seed the default 'generic' game system for backward compatibility
  const genericSystemExists = database.prepare(`
    SELECT 1 FROM game_systems WHERE system_key = 'generic'
  `).get();

  if (!genericSystemExists) {
    database.exec(`
      INSERT OR IGNORE INTO game_systems (system_key, name, short_name, description, genre, icon, is_default)
      VALUES ('generic', 'Generic Fantasy RPG', 'Generic', 'Default system for existing campaigns', 'fantasy', '⚔️', 1);
    `);

    // Add basic generic config
    database.prepare(`
      UPDATE game_systems SET config = ? WHERE system_key = 'generic'
    `).run(JSON.stringify({
      primary_dice: 'd20',
      dice_types: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'],
      max_level: 20,
      uses_classes: true,
      uses_races: true,
      uses_spells: true,
      uses_feats: true,
      ability_scores: [
        { key: 'str', name: 'Strength' },
        { key: 'dex', name: 'Dexterity' },
        { key: 'con', name: 'Constitution' },
        { key: 'int', name: 'Intelligence' },
        { key: 'wis', name: 'Wisdom' },
        { key: 'cha', name: 'Charisma' }
      ],
      stat_generation_methods: [
        {
          key: '4d6_drop_lowest',
          name: 'Roll 4d6, Drop Lowest',
          description: 'Roll 4d6, drop lowest die, sum remaining 3. Repeat 6x.',
          type: 'roll',
          dice: '4d6',
          keep: 'highest3',
          repeat: 6
        },
        {
          key: 'standard_array',
          name: 'Standard Array',
          description: 'Use fixed values: 15, 14, 13, 12, 10, 8',
          type: 'fixed',
          values: [15, 14, 13, 12, 10, 8]
        },
        {
          key: 'point_buy',
          name: 'Point Buy',
          description: '27 points. Scores 8-15.',
          type: 'point_buy',
          total_points: 27,
          min_score: 8,
          max_score: 15,
          cost_table: { '8': 0, '9': 1, '10': 2, '11': 3, '12': 4, '13': 5, '14': 7, '15': 9 }
        }
      ],
      currency_units: [
        { key: 'cp', name: 'Copper', abbrev: 'CP', base_value: 1 },
        { key: 'sp', name: 'Silver', abbrev: 'SP', base_value: 10 },
        { key: 'ep', name: 'Electrum', abbrev: 'EP', base_value: 50 },
        { key: 'gp', name: 'Gold', abbrev: 'GP', base_value: 100 },
        { key: 'pp', name: 'Platinum', abbrev: 'PP', base_value: 1000 }
      ]
    }));
  }

  console.log('Game system migration completed');
}