import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/game-systems/[id] - Get system details with category summary
// PUT /api/game-systems/[id] - Update system settings
// DELETE /api/game-systems/[id] - Remove game system
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const systemId = parseInt(id);
    
    if (isNaN(systemId)) {
      return NextResponse.json({ error: 'Invalid system ID' }, { status: 400 });
    }
    
    const system = db.prepare('SELECT * FROM game_systems WHERE id = ?').get(systemId);
    
    if (!system) {
      return NextResponse.json({ error: 'Game system not found' }, { status: 404 });
    }
    
    // Get category summary
    const categories = db.prepare(`
      SELECT category, entry_count FROM game_system_data 
      WHERE system_id = ? ORDER BY category
    `).all(systemId);
    
    return NextResponse.json({ system, categories });
  } catch (error) {
    console.error('Error fetching game system:', error);
    return NextResponse.json({ error: 'Failed to fetch game system' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const systemId = parseInt(id);
    
    if (isNaN(systemId)) {
      return NextResponse.json({ error: 'Invalid system ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { is_active, is_default } = body;
    
    const system = db.prepare('SELECT * FROM game_systems WHERE id = ?').get(systemId);
    
    if (!system) {
      return NextResponse.json({ error: 'Game system not found' }, { status: 404 });
    }
    
    // Handle is_default toggle
    if (is_default === 1) {
      db.prepare('UPDATE game_systems SET is_default = 0 WHERE is_default = 1').run();
    }
    
    // Update system
    db.prepare(`
      UPDATE game_systems 
      SET is_active = COALESCE(?, is_active), is_default = COALESCE(?, is_default), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(is_active ?? null, is_default ?? null, systemId);
    
    const updated = db.prepare('SELECT * FROM game_systems WHERE id = ?').get(systemId);
    
    return NextResponse.json({ system: updated });
  } catch (error) {
    console.error('Error updating game system:', error);
    return NextResponse.json({ error: 'Failed to update game system' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const systemId = parseInt(id);
    
    if (isNaN(systemId)) {
      return NextResponse.json({ error: 'Invalid system ID' }, { status: 400 });
    }
    
    const system: any = db.prepare('SELECT * FROM game_systems WHERE id = ?').get(systemId);
    
    if (!system) {
      return NextResponse.json({ error: 'Game system not found' }, { status: 404 });
    }
    
    // Check if any campaigns reference this system
    const campaignsUsing: any = db.prepare(`
      SELECT id FROM campaigns WHERE game_system = ? OR game_system = ?
    `).all(system.system_key, system.name);
    
    if (campaignsUsing.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete: campaigns still reference this game system. Remove or reassign them first.' 
      }, { status: 400 });
    }
    
    // Check if any characters reference this system
    const charactersUsing = db.prepare(`
      SELECT id FROM characters WHERE race != '' OR class != ''
    `).all(); // This is a simplified check - we'll improve in Phase 2
    
    // Delete game system data first
    db.prepare('DELETE FROM game_system_data WHERE system_id = ?').run(systemId);
    
    // Delete the system
    db.prepare('DELETE FROM game_systems WHERE id = ?').run(systemId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting game system:', error);
    return NextResponse.json({ error: 'Failed to delete game system' }, { status: 500 });
  }
}