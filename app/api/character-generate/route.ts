import { NextRequest, NextResponse } from 'next/server';

// POST /api/character-generate - Generate a character
// Body: { mode: 'random' | 'guided' | 'manual', preferences: {...} }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, preferences } = body;
    
    // Build prompts based on mode
    let prompt = '';
    
    if (mode === 'random') {
      prompt = `Generate a complete D&D 5e character with all fields filled in randomly. Return as JSON with these fields:
- name: a creative name
- race: one of Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
- class: one of Fighter, Wizard, Rogue, Cleric, Paladin, Ranger, Bard, Barbarian, Druid, Monk, Sorcerer, Warlock
- background: one of Acolyte, Criminal, Sage, Soldier, Urchin, Noble, Entertainer, Folk Hero
- level: 1
- ability_scores: { STR: number, DEX: number, CON: number, INT: number, WIS: number, CHA: number } (roll 4d6 drop lowest for each)
- skills: array of 2-4 skill proficiencies appropriate to class
- hit_points: calculate from class hit die + CON mod
- armor_class: base 10 + DEX mod
- speed: base walking speed
- equipment: starting equipment for class
- personality_traits: 2-3 personality traits
- ideals: character ideal
- bonds: character bond  
- flaws: character flaw
- backstory: 2-3 sentence backstory

Output ONLY valid JSON, no explanation.`;

    } else if (mode === 'guided') {
      const prefs = preferences || {};
      prompt = `Generate a D&D 5e character based on these preferences:
${prefs.race ? `- Race: ${prefs.race}` : '- Race: any'}
${prefs.class ? `- Class: ${prefs.class}` : '- Class: any'}
${prefs.archetype ? `- Archetype: ${prefs.archetype}` : ''}
${prefs.combatStyle ? `- Combat style: ${prefs.combatStyle}` : ''}

Output ONLY valid JSON with all character fields.`;

    } else {
      // Manual mode
      return NextResponse.json({ 
        ready: true, 
        fields_needed: ['name', 'race', 'class', 'background', 'ability_scores']
      });
    }
    
    // Call AI
    const aiUrl = process.env.AI_BASE_URL || 'http://localhost:11434';
    const aiModel = process.env.AI_MODEL || 'llama3';
    
    const aiRes = await fetch(`${aiUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiModel,
        prompt,
        stream: false,
        options: { temperature: 0.8 }
      })
    });
    
    const aiData = await aiRes.json();
    
    // Parse JSON from response
    let character = null;
    try {
      const text = aiData.response || '';
      // Extract JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        character = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
    
    // Default if failed
    if (!character?.name) {
      character = {
        name: preferences?.name || 'Adventurer',
        race: preferences?.race || 'Human',
        class: preferences?.class || 'Fighter',
        background: preferences?.background || 'Soldier',
        level: 1,
        ability_scores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
        skills: ['Athletics'],
        hit_points: 10,
        armor_class: 12,
        speed: 30,
        equipment: ['Simple weapon'],
        personality_traits: ['Brave'],
        ideals: 'Justice',
        bonds: 'None',
        flaws: 'None',
        backstory: 'A wanderer seeking adventure.'
      };
    }
    
    // Fill in calculated fields
    const mod = (score: number) => Math.floor((score - 10) / 2);
    
    if (!character.hit_points && character.class) {
      const conMod = mod(character.ability_scores?.CON || 10);
      const hitDie: Record<string, number> = {
        'Fighter': 10, 'Wizard': 6, 'Rogue': 8, 'Cleric': 8, 'Paladin': 10,
        'Ranger': 10, 'Bard': 8, 'Barbarian': 12, 'Druid': 8, 'Monk': 8, 'Sorcerer': 6, 'Warlock': 8
      };
      character.hit_points = (hitDie[character.class] || 8) + conMod;
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