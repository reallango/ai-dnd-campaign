import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import db from '@/lib/db';

// POST /api/character-generate - Generate a character
// Body: { mode: 'random' | 'guided' | 'ai_built', game_system_id?, preferences: {...} }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, game_system_id, preferences } = body;
    
    let prompt = '';
    let systemMessage = 'You are a character creation assistant. Generate complete characters in valid JSON format. Always respond with valid JSON only, no explanations.';
    
    // Fetch system context if provided
    let systemConfig: any = {};
    let characterSchema: any = null;
    let aiContext: any = '';
    
    if (game_system_id) {
      // Get system config
      const sysRow = db.prepare('SELECT config FROM game_systems WHERE id = ?').get(game_system_id) as { config: string } | undefined;
      if (sysRow?.config) {
        try {
          systemConfig = JSON.parse(sysRow.config);
        } catch (e) {}
      }
      
      // Get character schema
      const schemaRow = db.prepare('SELECT data FROM game_system_data WHERE system_id = ? AND category = ?').get(game_system_id, 'character_schema') as { data: string } | undefined;
      if (schemaRow?.data) {
        try {
          characterSchema = JSON.parse(schemaRow.data);
        } catch (e) {}
      }
      
      // Get AI context
      const aiRow = db.prepare('SELECT data FROM game_system_data WHERE system_id = ? AND category = ?').get(game_system_id, 'ai_context') as { data: string } | undefined;
      if (aiRow?.data) {
        try {
          aiContext = JSON.parse(aiRow.data);
        } catch (e) {}
      }
      
      // Update system message with game system info
      if (aiContext?.instructions) {
        systemMessage += '\n\n' + aiContext.instructions;
      }
    }
    
    if (mode === 'random' || mode === 'ai_built') {
      prompt = `Generate a complete character with all fields.`;
      
      if (characterSchema?.sections?.length > 0) {
        prompt += `\n\nFollow this schema structure:\n${JSON.stringify(characterSchema.sections.slice(0, 3), null, 2)}`;
      }
      
      prompt += `\nReturn as JSON with all character data fields.`;
      
    } else if (mode === 'guided') {
      const prefs = preferences || {};
      prompt = `Generate a character.
${prefs.race ? `Race: ${prefs.race}` : 'Any race'}
${prefs.class ? `Class: ${prefs.class}` : 'Any class'}
${prefs.concept || prefs.backstory || ''}

Return as JSON with all fields.`;
    } else {
      return NextResponse.json({ 
        ready: true, 
        fields_needed: ['name', 'race', 'class', 'background']
      });
    }
    
    // Use shared AI helper
    const response = await callAI({
      prompt,
      system: systemMessage,
      maxTokens: 1000,
      temperature: 0.8,
    });
    
    const text = response.content || '';
    
    // Parse JSON
    let character: any = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        character = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
    
    // Default character if parsing failed
    if (!character?.name) {
      const prefs = preferences || {};
      character = {
        basics: {
          name: prefs.name || 'Adventurer',
          race: prefs.race || 'Human',
          class: prefs.class || 'Fighter',
          background: prefs.background || 'Soldier',
          level: prefs.level || 1
        },
        ability_scores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
        skills: [],
        hit_points: 10,
        armor_class: 12,
        backstory: 'A wanderer seeking adventure.'
      };
    }
    
    // Calculate derived stats
    const scores = character.ability_scores || character.basics?.ability_scores || {};
    const mod = (score: number) => Math.floor((score - 10) / 2);
    
    // Get hit die from class
    const hitDie: Record<string, number> = {
      'Fighter': 10, 'Wizard': 6, 'Rogue': 8, 'Cleric': 8, 'Paladin': 10,
      'Ranger': 10, 'Bard': 8, 'Barbarian': 12, 'Druid': 8, 'Monk': 8, 'Sorcerer': 6, 'Warlock': 8
    };
    const charClass = character.basics?.class || character.class;
    const conMod = mod(scores.con || scores.CON || 10);
    
    if (!character.hit_points) {
      character.hit_points = (hitDie[charClass] || 8) + conMod;
    }
    if (!character.armor_class) {
      character.armor_class = 10 + mod(scores.dex || scores.DEX || 14);
    }
    
    return NextResponse.json({ character, mode, game_system_id });
  } catch (error) {
    console.error('Character generation error:', error);
    return NextResponse.json({ error: 'Failed to generate character' }, { status: 500 });
  }
}