import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

// POST /api/character-generate - Generate a character
// Body: { mode: 'random' | 'guided' | 'manual', preferences: {...} }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, preferences } = body;
    
    let prompt = '';
    let system = 'You are a D&D 5e character creation assistant. Generate complete characters in valid JSON format. Always respond with valid JSON only, no explanations.';
    
    if (mode === 'random') {
      prompt = `Generate a complete D&D 5e character with all fields. Return as JSON:
{
  "name": "creative name",
  "race": "Human",
  "class": "Fighter",
  "background": "Soldier",
  "level": 1,
  "ability_scores": {"STR":15,"DEX":14,"CON":13,"INT":12,"WIS":10,"CHA":8},
  "skills": ["Athletics"],
  "hit_points": 10,
  "armor_class": 12,
  "personality_traits": ["Brave"],
  "ideals": "Justice",
  "bonds": "None",
  "flaws": "None",
  "backstory": "2-3 sentence backstory"
}`;

    } else if (mode === 'guided') {
      const prefs = preferences || {};
      prompt = `Generate a D&D 5e character.
${prefs.race ? `Race: ${prefs.race}` : 'Any race'}
${prefs.class ? `Class: ${prefs.class}` : 'Any class'}
${prefs.archetype || prefs.combatStyle || prefs.backstory || ''}

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
      system,
      maxTokens: 600,
      temperature: 0.8,
    });
    
    const text = response.content || '';
    
    // Parse JSON
    let character = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        character = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
    
    // Default
    if (!character?.name) {
      character = {
        name: preferences?.name || 'Adventurer',
        race: preferences?.race || 'Human',
        class: preferences?.class || 'Fighter',
        background: 'Soldier',
        level: 1,
        ability_scores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
        skills: ['Athletics'],
        hit_points: 10,
        armor_class: 12,
        personality_traits: ['Brave'],
        ideals: 'Justice',
        bonds: 'None',
        flaws: 'None',
        backstory: 'A wanderer seeking adventure.'
      };
    }
    
    // Calc fields
    const mod = (score: number) => Math.floor((score - 10) / 2);
    const hitDie: Record<string, number> = {
      'Fighter': 10, 'Wizard': 6, 'Rogue': 8, 'Cleric': 8, 'Paladin': 10,
      'Ranger': 10, 'Bard': 8, 'Barbarian': 12, 'Druid': 8, 'Monk': 8, 'Sorcerer': 6, 'Warlock': 8
    };
    
    if (!character.hit_points) {
      character.hit_points = (hitDie[character.class] || 8) + mod(character.ability_scores?.CON || 10);
    }
    if (!character.armor_class) {
      character.armor_class = 10 + mod(character.ability_scores?.DEX || 14);
    }
    
    return NextResponse.json({ character, mode });
  } catch (error) {
    console.error('Character generation error:', error);
    return NextResponse.json({ error: 'Failed to generate character' }, { status: 500 });
  }
}