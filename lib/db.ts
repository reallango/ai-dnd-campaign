import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = '.';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'campaign.db');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
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

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'dm',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;

export interface Campaign {
  id: number;
  code: string;
  name: string;
  description?: string;
  dm_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: number;
  campaign_id: number;
  character_id?: number;
  name: string;
  is_connected: number;
  joined_at: string;
}

export interface Character {
  id: number;
  player_id?: number;
  name: string;
  race?: string;
  class?: string;
  level: number;
  background?: string;
  stats?: string;
  inventory?: string;
  notes?: string;
  created_at: string;
}

export interface Session {
  id: number;
  campaign_id: number;
  mode: string;
  status: string;
  started_at: string;
  ended_at?: string;
}

export interface NarrativeLog {
  id: number;
  session_id: number;
  type: string;
  content: string;
  metadata?: string;
  created_at: string;
}

export interface DiceRoll {
  id: number;
  campaign_id: number;
  player_id?: number;
  dice: string;
  result: number;
  breakdown?: string;
  label?: string;
  is_anonymous: number;
  created_at: string;
}