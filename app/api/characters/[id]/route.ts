import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/characters/[id] - Get full character details
// PUT /api/characters/[id] - Update character
// DELETE /api/characters/[id] - Delete character
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const charId = parseInt(id);
    
    if (isNaN(charId)) {
      return NextResponse.json({ error: 'Invalid character ID' }, { status: 400 });
    }
    
    const character = db.prepare(`
      SELECT c.*, gs.name as game_system_name, gs.system_key, gs.config as game_system_config
      FROM characters c
      LEFT JOIN game_systems gs ON c.game_system_id = gs.id
      WHERE c.id = ?
    `).get(charId);
    
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    
    // Parse character_data
    let charData = {};
    try {
      charData = character.character_data ? JSON.parse(character.character_data) : {};
    } catch (e) {}
    
    // Parse system config
    let sysConfig = {};
    try {
      sysConfig = character.game_system_config ? JSON.parse(character.game_system_config) : {};
    } catch (e) {}
    
    return NextResponse.json({ 
      character: { 
        ...character, 
        character_data: charData,
        game_system: {
          id: character.game_system_id,
          name: character.game_system_name,
          system_key: character.system_key,
          config: sysConfig
        }
      } 
    });
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const charId = parseInt(id);
    
    if (isNaN(charId)) {
      return NextResponse.json({ error: 'Invalid character ID' }, { status: 400 });
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
    
    // Always increment version
    fields.push('version = version + 1');
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    values.push(charId);
    
    db.prepare(`UPDATE characters SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
    
    return NextResponse.json({ character });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const charId = parseInt(id);
    
    if (isNaN(charId)) {
      return NextResponse.json({ error: 'Invalid character ID' }, { status: 400 });
    }
    
    // Soft delete
    db.prepare('UPDATE characters SET is_active = 0 WHERE id = ?').run(charId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
  }
}