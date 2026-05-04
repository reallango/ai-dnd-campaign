import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/characters - List characters for player
// POST /api/characters - Create new character
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    
    if (playerId) {
      const characters = db.prepare(`
        SELECT * FROM characters WHERE player_id = ? ORDER BY created_at DESC
      `).all(playerId);
      return NextResponse.json({ characters });
    }
    
    // List all saved characters
    const characters = db.prepare(`
      SELECT c.*, p.name as player_name
      FROM characters c
      LEFT JOIN players p ON c.player_id = p.id
      ORDER BY c.created_at DESC
    `).all();
    
    return NextResponse.json({ characters });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, race, class: charClass, level, background, stats, inventory, notes, player_id } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 });
    }
    
    const stmt = db.prepare(`
      INSERT INTO characters (name, race, class, level, background, stats, inventory, notes, player_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name,
      race || '',
      charClass || '',
      level || 1,
      background || '',
      stats ? JSON.stringify(stats) : '{}',
      inventory || '',
      notes || '',
      player_id || null
    );
    
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
  }
}

// PUT /api/characters - Update character
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    const { name, race, class: charClass, level, background, stats, inventory, notes } = body;
    
    db.prepare(`
      UPDATE characters SET name = ?, race = ?, class = ?, level = ?, background = ?, stats = ?, inventory = ?, notes = ?
      WHERE id = ?
    `).run(
      name,
      race || '',
      charClass || '',
      level || 1,
      background || '',
      stats ? JSON.stringify(stats) : null,
      inventory || '',
      notes || '',
      id
    );
    
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    
    return NextResponse.json({ character });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
  }
}

// DELETE /api/characters - Delete character
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }
    
    db.prepare('DELETE FROM characters WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
  }
}