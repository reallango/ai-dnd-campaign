'use client';

import { useState, useEffect } from 'react';
import SchemaField from './character/SchemaField';

interface CharacterWizardProps {
  gameSystemId: number;
  gameSystemName: string;
  characterSchema: { sections: any[] };
  systemConfig: any;
  mode: 'manual' | 'guided' | 'ai_guided' | 'ai_built';
  campaignId?: number;
  onComplete: (character: any) => void;
}

export default function CharacterWizard({
  gameSystemId,
  gameSystemName,
  characterSchema,
  systemConfig,
  mode,
  campaignId,
  onComplete
}: CharacterWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [characterData, setCharacterData] = useState<any>({});
  const [aiSections, setAiSections] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const sections = characterSchema?.sections || [];
  const currentSection = sections[currentStep];
  const totalSteps = mode === 'ai_built' ? 1 : sections.length + 1; // +1 for review

  // Get ability scores config
  const abilityScores = systemConfig?.ability_scores || [
    { key: 'str', name: 'Strength' },
    { key: 'dex', name: 'Dexterity' },
    { key: 'con', name: 'Constitution' },
    { key: 'int', name: 'Intelligence' },
    { key: 'wis', name: 'Wisdom' },
    { key: 'cha', name: 'Charisma' }
  ];

  const statGenMethods = systemConfig?.stat_generation_methods || [
    { key: '4d6_drop_lowest', name: 'Roll 4d6, Drop Lowest', type: 'roll', dice: '4d6', keep: 'highest3' },
    { key: 'standard_array', name: 'Standard Array', type: 'fixed', values: [15, 14, 13, 12, 10, 8] },
    { key: 'point_buy', name: 'Point Buy', type: 'point_buy', total_points: 27 }
  ];

  // AI Guided mode: check which sections to auto-generate
  if (mode === 'ai_guided' && currentStep === 0 && sections.length > 0) {
    return (
      <AIguidedSetup
        sections={sections}
        aiSections={aiSections}
        setAiSections={setAiSections}
        onContinue={() => setCurrentStep(1)}
      />
    );
  }

  // AI Built mode: single screen with AI generation
  if (mode === 'ai_built') {
    return (
      <AIBuiltMode
        gameSystemId={gameSystemId}
        characterData={characterData}
        setCharacterData={setCharacterData}
        generating={generating}
        setGenerating={setGenerating}
        saving={saving}
        setSaving={setSaving}
        onComplete={onComplete}
        abilityScores={abilityScores}
      />
    );
  }

  // Review screen (final step)
  if (currentStep >= sections.length) {
    return (
      <ReviewScreen
        characterData={characterData}
        gameSystemName={gameSystemName}
        onBack={() => setCurrentStep(currentStep - 1)}
        onComplete={onComplete}
        saving={saving}
        setSaving={setSaving}
        gameSystemId={gameSystemId}
      />
    );
  }

  // Regular step (manual/guided)
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>Step {currentStep + 1} of {sections.length + 1}</span>
          <span>{currentSection?.name || 'Review'}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-600 transition-all"
            style={{ width: `${((currentStep + 1) / (sections.length + 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Guided mode instructions */}
      {mode === 'guided' && currentSection?.description && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
          <p className="text-slate-300 text-sm">{currentSection.description}</p>
        </div>
      )}

      {/* Section title */}
      <h3 className="text-xl font-semibold text-white mb-4">
        {currentSection?.name || 'Character Details'}
      </h3>

      {/* Ability scores special handling */}
      {currentSection?.fields?.some((f: any) => f.type === 'ability_score') ? (
        <AbilityScoreSection
          field={currentSection.fields.find((f: any) => f.type === 'ability_score')}
          values={characterData.ability_scores || {}}
          onChange={(vals: any) => setCharacterData({ ...characterData, ability_scores: vals })}
          abilityScores={abilityScores}
          methods={statGenMethods}
          gameSystemId={gameSystemId}
        />
      ) : (
        /* Regular fields */
        currentSection?.fields?.map((field: any) => (
          <SchemaField
            key={field.name}
            field={field}
            value={characterData[field.name]}
            onChange={(val) => setCharacterData({ ...characterData, [field.name]: val })}
            gameSystemId={gameSystemId}
          />
        ))
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            // For AI guided, generate AI sections after user completes their sections
            if (mode === 'ai_guided' && currentStep === sections.length - 1) {
              // TODO: Implement AI generation
              setCurrentStep(currentStep + 1);
            } else {
              setCurrentStep(currentStep + 1);
            }
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {mode === 'ai_guided' && currentStep === sections.length - 1 ? 'Generate with AI' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// AI Guided initial selection screen
function AIguidedSetup({ 
  sections, 
  aiSections, 
  setAiSections, 
  onContinue 
}: { 
  sections: any[]; 
  aiSections: string[]; 
  setAiSections: (s: string[]) => void;
  onContinue: () => void;
}) {
  const toggleSection = (name: string) => {
    if (aiSections.includes(name)) {
      setAiSections(aiSections.filter(s => s !== name));
    } else {
      setAiSections([...aiSections, name]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-white mb-4">AI-Assisted Creation</h3>
      <p className="text-slate-400 mb-4">
        Select which sections you want the AI to generate for you. Unchecked sections will be created by you.
      </p>
      
      <div className="space-y-2 mb-6">
        {sections.map((section: any) => (
          <label key={section.name} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={aiSections.includes(section.name)}
              onChange={() => toggleSection(section.name)}
              className="w-5 h-5"
            />
            <div>
              <span className="text-white">{section.name}</span>
              {section.description && (
                <p className="text-slate-500 text-sm">{section.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
      
      <button
        onClick={onContinue}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Continue
      </button>
    </div>
  );
}

// AI Built mode - single screen with AI generation
function AIBuiltMode({
  gameSystemId,
  characterData,
  setCharacterData,
  generating,
  setGenerating,
  saving,
  setSaving,
  onComplete,
  abilityScores
}: any) {
  const [preferences, setPreferences] = useState({
    name: '',
    race: '',
    class: '',
    level: 1,
    concept: ''
  });

  const generateCharacter = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/character-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ai_built',
          game_system_id: gameSystemId,
          preferences
        })
      });
      const data = await res.json();
      if (data.character) {
        setCharacterData(data.character);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterData.basics?.name || preferences.name || 'Unnamed Character',
          game_system_id: gameSystemId,
          creation_mode: 'ai_built',
          character_data: characterData
        })
      });
      const data = await res.json();
      if (data.character) {
        onComplete(data.character);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-white mb-4">Quick Character Creation</h3>
      
      {/* Basic inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-slate-300 text-sm mb-1">Character Name</label>
          <input
            type="text"
            value={preferences.name}
            onChange={(e) => setPreferences({ ...preferences, name: e.target.value })}
            placeholder="Enter name..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm mb-1">Race (optional)</label>
            <input
              type="text"
              value={preferences.race}
              onChange={(e) => setPreferences({ ...preferences, race: e.target.value })}
              placeholder="e.g. Human, Elf"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-1">Class (optional)</label>
            <input
              type="text"
              value={preferences.class}
              onChange={(e) => setPreferences({ ...preferences, class: e.target.value })}
              placeholder="e.g. Fighter, Wizard"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1">Level</label>
          <input
            type="number"
            min="1"
            max="20"
            value={preferences.level}
            onChange={(e) => setPreferences({ ...preferences, level: parseInt(e.target.value) || 1 })}
            className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1">Character Concept (optional)</label>
          <textarea
            value={preferences.concept}
            onChange={(e) => setPreferences({ ...preferences, concept: e.target.value })}
            placeholder="A grizzled veteran who..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
      </div>

      <button
        onClick={generateCharacter}
        disabled={generating || !preferences.name}
        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 mb-4"
      >
        {generating ? 'Generating...' : 'Generate Character'}
      </button>

      {/* Generated character display */}
      {characterData.basics && (
        <div className="p-4 bg-slate-700/50 rounded-lg mb-4">
          <h4 className="text-white font-semibold mb-2">{characterData.basics.name}</h4>
          <p className="text-slate-400 text-sm">
            {characterData.basics.race} {characterData.basics.class} Level {characterData.basics.level}
          </p>
          {characterData.backstory && (
            <p className="text-slate-500 text-sm mt-2">{characterData.backstory}</p>
          )}
        </div>
      )}

      {characterData.basics && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Character'}
        </button>
      )}
    </div>
  );
}

// Ability score section with generator
function AbilityScoreSection({ field, values, onChange, abilityScores, methods, gameSystemId }: any) {
  const AbilityScoreGenerator = require('./character/AbilityScoreGenerator').default;
  return (
    <AbilityScoreGenerator
      abilityScores={abilityScores}
      methods={methods}
      values={values}
      onChange={onChange}
      gameSystemId={gameSystemId}
    />
  );
}

// Review screen
function ReviewScreen({ characterData, gameSystemName, onBack, onComplete, saving, setSaving, gameSystemId }: any) {
  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterData.basics?.name || 'Unnamed Character',
          game_system_id: gameSystemId,
          creation_mode: 'manual',
          character_data: characterData
        })
      });
      const data = await res.json();
      if (data.character) {
        onComplete(data.character);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-white mb-4">Review Character</h3>
      
      <div className="p-4 bg-slate-700/50 rounded-lg mb-6">
        <h4 className="text-white font-semibold text-lg">{characterData.basics?.name || 'Unnamed'}</h4>
        <p className="text-slate-400">
          {characterData.basics?.race} {characterData.basics?.class} • Level {characterData.basics?.level} • {gameSystemName}
        </p>
        
        {characterData.ability_scores && (
          <div className="mt-4">
            <h5 className="text-slate-300 text-sm mb-2">Ability Scores</h5>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(characterData.ability_scores).map(([key, val]: [string, any]) => (
                <div key={key} className="text-center p-2 bg-slate-800 rounded">
                  <span className="text-slate-400 uppercase text-xs">{key}</span>
                  <div className="text-white font-bold">{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Character'}
        </button>
      </div>
    </div>
  );
}