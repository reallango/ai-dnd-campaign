import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/characters - List characters for player
// POST /api/characters - Create new character
// PUT /api/characters - Update character
// DELETE /api/characters - Delete character
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameSystemId = searchParams.get('game_system_id');
    const playerId = searchParams.get('player_id');
    const userId = searchParams.get('user_id');
    const includeTemplates = searchParams.get('include_templates') === 'true';
    
    let query = `
      SELECT c.*, gs.name as game_system_name, gs.system_key
      FROM characters c
      LEFT JOIN game_systems gs ON c.game_system_id = gs.id
      WHERE c.is_active = 1
    `;
    const params: any[] = [];
    
    if (gameSystemId) {
      query += ' AND c.game_system_id = ?';
      params.push(gameSystemId);
    }
    
    if (playerId) {
      query += ' AND c.player_id = ?';
      params.push(playerId);
    }
    
    if (userId) {
      query += ' AND c.user_id = ?';
      params.push(userId);
    }
    
    if (!includeTemplates) {
      query += ' AND c.is_template = 0';
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const characters = db.prepare(query).all(...params);
    
    // Parse character_data for each character
    const result = characters.map((char: any) => {
      let charData = {};
      try {
        charData = char.character_data ? JSON.parse(char.character_data) : {};
      } catch (e) {}
      
      // Extract summary
      const summary = charData?.basics || {
        race: '',
        class: '',
        level: 1
      };
      
      return {
        ...char,
        character_data: charData,
        summary
      };
    });
    
    return NextResponse.json({ characters: result });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      game_system_id, 
      creation_mode,
      character_data, 
      portrait_url,
      player_id,
      user_id,
      is_template,
      gm_notes 
    } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 });
    }
    
    if (!game_system_id) {
      return NextResponse.json({ error: 'game_system_id is required' }, { status: 400 });
    }
    
    // Get default system if not specified
    let systemId = game_system_id;
    if (!systemId) {
      const defaultSystem = db.prepare('SELECT id FROM game_systems WHERE is_default = 1').get() as { id: number };
      systemId = defaultSystem?.id || 1;
    }
    
    const stmt = db.prepare(`
      INSERT INTO characters (
        player_id, user_id, game_system_id, name, portrait_url, creation_mode,
        character_data, is_template, is_active, gm_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      player_id || null,
      user_id || null,
      systemId,
      name,
      portrait_url || null,
      creation_mode || 'manual',
      JSON.stringify(character_data || {}),
      is_template ? 1 : 0,
      1,
      gm_notes || ''
    );
    
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Build update query dynamically
    const fields: string[] = [];
    const values: any[] = [];
    
    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.character_data !== undefined) { 
      fields.push('character_data = ?'); 
      values.push(JSON.stringify(body.character_data));
    }
    if (body.portrait_url !== undefined) { fields.push('portrait_url = ?'); values.push(body.portrait_url); }
    if (body.gm_notes !== undefined) { fields.push('gm_notes = ?'); values.push(body.gm_notes); }
    if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active); }
    
    // Always increment version
    fields.push('version = version + 1');
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    values.push(id);
    
    db.prepare(`UPDATE characters SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    
    return NextResponse.json({ character });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }
    
    // Soft delete
    db.prepare('UPDATE characters SET is_active = 0 WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
  }
}