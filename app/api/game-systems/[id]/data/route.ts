import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/game-systems/[id]/data?category=races
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const systemId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    if (isNaN(systemId)) {
      return NextResponse.json({ error: 'Invalid system ID' }, { status: 400 });
    }
    
    if (!category) {
      return NextResponse.json({ error: 'category parameter required' }, { status: 400 });
    }
    
    const row = db.prepare(`
      SELECT * FROM game_system_data 
      WHERE system_id = ? AND category = ?
    `).get(systemId, category);
    
    if (!row) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    const data = JSON.parse(row.data as string);
    
    return NextResponse.json({ 
      category: row.category, 
      data, 
      entry_count: row.entry_count 
    });
  } catch (error) {
    console.error('Error fetching game system data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}