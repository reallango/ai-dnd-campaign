// Database Migration: Character Table
// This migration transforms the characters table to support game systems
// and flexible character_data JSON

export function runCharacterMigration(db: any) {
  const database = db;
  
  // Check if characters_v2 already exists
  const v2Exists = database.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='characters_v2'
  `).get();
  
  if (v2Exists) {
    console.log('Character migration already completed');
    return;
  }
  
  // Get the 'generic' game system id
  const genericSystem = database.prepare(`
    SELECT id FROM game_systems WHERE is_default = 1 LIMIT 1
  `).get() as { id: number };
  
  const genericSystemId = genericSystem?.id || 1;
  
  // Create the new characters table
  database.exec(`
    CREATE TABLE IF NOT EXISTS characters_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER,
      user_id INTEGER REFERENCES users(id),
      game_system_id INTEGER REFERENCES game_systems(id),
      name TEXT NOT NULL,
      portrait_url TEXT,
      creation_mode TEXT DEFAULT 'manual',
      character_data TEXT NOT NULL DEFAULT '{}',
      is_template INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      gm_notes TEXT,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing characters from the old table
  const oldCharacters = database.prepare(`
    SELECT * FROM characters
  `).all() as any[];

  if (oldCharacters.length > 0) {
    const insertNew = database.prepare(`
      INSERT INTO characters_v2 (
        player_id, user_id, game_system_id, name, portrait_url, creation_mode,
        character_data, is_template, is_active, gm_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const char of oldCharacters) {
      // Build character_data from old columns
      let stats = {};
      let inventory = {};
      
      try {
        if (char.stats) {
          stats = typeof char.stats === 'string' ? JSON.parse(char.stats) : char.stats;
        }
      } catch (e) { /* ignore parse errors */ }
      
      try {
        if (char.inventory) {
          inventory = typeof char.inventory === 'string' ? JSON.parse(char.inventory) : char.inventory;
        }
      } catch (e) { /* ignore parse errors */ }
      
      const characterData = {
        basics: {
          name: char.name,
          race: char.race || '',
          class: char.class || '',
          level: char.level || 1,
          background: char.background || ''
        },
        ability_scores: stats,
        equipment: { inventory },
        backstory: { additional_notes: char.notes || '' }
      };
      
      insertNew.run(
        char.player_id || null,
        null, // user_id
        genericSystemId,
        char.name,
        null, // portrait_url
        'manual',
        JSON.stringify(characterData),
        0, // is_template
        1, // is_active
        char.notes || '' // gm_notes
      );
    }
  }

  // Rename old table to characters_legacy
  database.exec(`
    ALTER TABLE characters RENAME TO characters_legacy
  `);

  // Rename characters_v2 to characters
  database.exec(`
    ALTER TABLE characters_v2 RENAME TO characters
  `);

  console.log(`Character migration completed: ${oldCharacters.length} characters migrated`);
}