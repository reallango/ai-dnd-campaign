import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function initDb() {
  if (db) return db;
  
  const dbDir = process.env.DATABASE_PATH || '/app/data';
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = process.env.DATABASE_PATH 
    ? process.env.DATABASE_PATH 
    : path.join(dbDir, 'campaign.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Run migrations for new columns
  try {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN password_reset_token TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN password_reset_expires DATETIME`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN game_system_id INTEGER REFERENCES game_systems(id)`);
  } catch (e) { /* column may already exist */ }

  // Set default game_system_id for existing campaigns
  try {
    db.exec(`UPDATE campaigns SET game_system_id = (SELECT id FROM game_systems WHERE is_default = 1 LIMIT 1) WHERE game_system_id IS NULL`);
  } catch (e) { /* ignore */ }
  
  // Run AI configuration migration
  try {
    const { runAIMigration } = require('./ai-migration');
    runAIMigration(db);
  } catch (e) {
    console.log('AI migration:', e);
  }

  // Run Game System migration
  try {
    const { runGameSystemMigration } = require('./game-system-migration');
    runGameSystemMigration(db);
  } catch (e) {
    console.log('Game system migration:', e);
  }

  // Run Character migration
  try {
    const { runCharacterMigration } = require('./character-migration');
    runCharacterMigration(db);
  } catch (e) {
    console.log('Character migration:', e);
  }
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'dm',
      password_reset_token TEXT,
      password_reset_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      game_system TEXT DEFAULT 'dnd5e',
      is_shared INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      character_id INTEGER,
      name TEXT NOT NULL,
      is_connected INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER,
      name TEXT NOT NULL,
      race TEXT,
      class TEXT,
      level INTEGER DEFAULT 1,
      background TEXT,
      stats TEXT,
      inventory TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      mode TEXT DEFAULT 'live',
      status TEXT DEFAULT 'waiting',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS narrative_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS choices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      narrative_log_id INTEGER NOT NULL,
      player_id INTEGER,
      choice_text TEXT NOT NULL,
      selected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (narrative_log_id) REFERENCES narrative_logs(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS dice_rolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      player_id INTEGER,
      dice TEXT NOT NULL,
      result INTEGER NOT NULL,
      breakdown TEXT,
      label TEXT,
      is_anonymous INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  
  return db;
}

const dbLazy = new Proxy({} as Database.Database, {
  get(_target, prop) {
    return (...args: any[]) => {
      const d = initDb();
      const method = (d as any)[prop];
      if (typeof method === 'function') {
        return method.apply(d, args);
      }
      return (d as any)[prop];
    };
  }
});

export default dbLazy;