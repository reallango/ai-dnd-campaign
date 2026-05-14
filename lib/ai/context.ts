// Game Context Building - assemble context for prompt injection

import db from '@/lib/db';
import type { GameContext, CharacterInfo, NarrativeEntry } from './types';

export function buildContext(campaignId: number, sessionId?: number): GameContext | null {
  const database = db as any;
  
  // Get campaign
  const campaign = database.prepare(`
    SELECT id, name FROM campaigns WHERE id = ?
  `).get(campaignId) as { id: number; name: string } | undefined;
  
  if (!campaign) {
    return null;
  }

  // Get active session if not provided
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const session = database.prepare(`
      SELECT id, mode FROM sessions 
      WHERE campaign_id = ? AND status = 'active'
      ORDER BY started_at DESC LIMIT 1
    `).get(campaignId) as { id: number; mode: string } | undefined;
    
    if (!session) {
      return { campaignId: campaign.id, campaignName: campaign.name, sessionId: 0, mode: 'live', characters: [], recentNarrative: [], sessionNotes: '' };
    }
    
    activeSessionId = session.id;
  }

  // Get session info
  const session = database.prepare(`
    SELECT mode FROM sessions WHERE id = ?
  `).get(activeSessionId) as { mode: string } | undefined;

  // Get characters for campaign
  const characters = database.prepare(`
    SELECT c.id, c.name, c.race, c.class, c.level, c.stats
    FROM characters c
    JOIN players p ON c.player_id = p.id
    WHERE p.campaign_id = ?
  `).all(campaignId) as CharacterInfo[];

  // Parse stats JSON
  for (const char of characters) {
    if (typeof char.stats === 'string') {
      try {
        char.stats = JSON.parse(char.stats);
      } catch {
        char.stats = null;
      }
    }
  }

  // Get recent narrative (last N entries based on setting)
  const maxBeatsSetting = database.prepare(`
    SELECT value FROM app_settings WHERE key = 'max_context_beats'
  `).get() as { value: string } | undefined;
  
  const maxBeats = maxBeatsSetting ? parseInt(maxBeatsSetting.value, 10) : 20;

  const recentNarrative = database.prepare(`
    SELECT nl.id, nl.type, nl.content, nl.created_at
    FROM narrative_logs nl
    WHERE nl.session_id = ?
    ORDER BY nl.created_at DESC
    LIMIT ?
  `).all(activeSessionId, maxBeats) as NarrativeEntry[];

  // Reverse to get chronological order
  recentNarrative.reverse();

  // Get session notes
  const notesRows = database.prepare(`
    SELECT GROUP_CONCAT(nl.content, '\n') as notes
    FROM narrative_logs nl
    WHERE nl.session_id = ? AND nl.type = 'note'
  `).get(activeSessionId) as { notes: string | null } | undefined;

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    sessionId: activeSessionId,
    mode: session?.mode || 'live',
    characters,
    recentNarrative,
    sessionNotes: notesRows?.notes || ''
  };
}

// Format context for prompt injection
export function formatGameContext(context: GameContext): string {
  const lines: string[] = [];

  // Campaign header
  lines.push(`# Campaign: ${context.campaignName}`);
  lines.push(`Session Mode: ${context.mode}`);
  lines.push('');

  // Characters
  if (context.characters.length > 0) {
    lines.push('## Characters');
    for (const char of context.characters) {
      const statsLine = char.stats 
        ? ` STR ${char.stats.str || 10} DEX ${char.stats.dex || 10} CON ${char.stats.con || 10} INT ${char.stats.int || 10} WIS ${char.stats.wis || 10} CHA ${char.stats.cha || 10}`
        : '';
      lines.push(`- ${char.name} (${char.race} ${char.class} L${char.level})${statsLine}`);
    }
    lines.push('');
  }

  // Recent narrative
  if (context.recentNarrative.length > 0) {
    lines.push('## Recent Events');
    for (const entry of context.recentNarrative) {
      const prefix = entry.type === 'narrative' ? '>' : entry.type === 'choice' ? '?' : '-';
      // Truncate long content
      const content = entry.content.length > 200 
        ? entry.content.substring(0, 200) + '...'
        : entry.content;
      lines.push(`${prefix} ${content}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}