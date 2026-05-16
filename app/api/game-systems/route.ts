import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/game-systems - List all installed game systems
// POST /api/game-systems - Import a new game system from JSON
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = `
      SELECT * FROM game_systems
    `;
    
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    
    query += ' ORDER BY name';
    
    const systems = db.prepare(query).all();
    
    return NextResponse.json({ systems });
  } catch (error) {
    console.error('Error fetching game systems:', error);
    return NextResponse.json({ error: 'Failed to fetch game systems' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { system_meta, config, ...dataSections } = body;

    if (!system_meta || !system_meta.name) {
      return NextResponse.json({ error: 'Invalid game system package: missing system_meta' }, { status: 400 });
    }

    // Check if system already exists
    const existing = db.prepare('SELECT id FROM game_systems WHERE system_key = ?').get(system_meta.id || system_meta.name.toLowerCase().replace(/\s+/g, '-'));
    
    if (existing) {
      return NextResponse.json({ error: 'Game system already exists. Use PUT to update.' }, { status: 400 });
    }

    // Insert game system
    const insertSystem = db.prepare(`
      INSERT INTO game_systems (
        system_key, name, short_name, publisher, version, description, genre, icon, config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const systemKey = system_meta.id || system_meta.name.toLowerCase().replace(/\s+/g, '-');
    
    insertSystem.run(
      systemKey,
      system_meta.name,
      system_meta.short_name || null,
      system_meta.publisher || null,
      system_meta.version || '1.0.0',
      system_meta.description || null,
      system_meta.genre || null,
      system_meta.icon || null,
      JSON.stringify(config || {})
    );

    const systemId = db.prepare('SELECT last_insert_rowid() as id').get().id;
    let categoriesImported = 0;

    // Insert each data section
    const insertData = db.prepare(`
      INSERT INTO game_system_data (system_id, category, data, entry_count)
      VALUES (?, ?, ?, ?)
    `);

    for (const [category, data] of Object.entries(dataSections)) {
      if (category === 'system_meta' || category === 'config') continue;
      
      const dataValue = data as any;
      let entryCount = 0;
      
      // Count entries in array-type catalogs
      if (Array.isArray(dataValue)) {
        entryCount = dataValue.length;
      }
      
      // Store the data
      insertData.run(
        systemId,
        category,
        JSON.stringify(dataValue),
        entryCount
      );
      
      categoriesImported++;
    }

    const system = db.prepare('SELECT * FROM game_systems WHERE id = ?').get(systemId);

    return NextResponse.json({ 
      success: true, 
      system: { 
        id: systemId, 
        name: system.name, 
        categories_imported: categoriesImported 
      } 
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing game system:', error);
    return NextResponse.json({ error: 'Failed to import game system' }, { status: 500 });
  }
}