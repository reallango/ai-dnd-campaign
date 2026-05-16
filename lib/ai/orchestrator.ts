// Multi-Agent Orchestrator for AI D&D campaigns
// DM agent classifies player actions and routes to appropriate specialist agents

import { resolveAgent, routeTask } from './router';
import { buildContext, formatGameContext } from './context';
import { OllamaClient } from './ollama-client';
import db from '@/lib/db';


// Classification result from DM
interface ActionClassification {
  primary_agent: 'narrator' | 'combat' | 'npc' | 'dm';
  reasoning: string;
  context_hint: string;
}


// DM classification system prompt — this is SEPARATE from the DM's creative prompt
const CLASSIFICATION_PROMPT = `You are the Dungeon Master routing system. Analyze the player's action and determine which specialist agent should handle the response.


You MUST respond with ONLY valid JSON, no other text:
{
  "primary_agent": "narrator|combat|npc|dm",
  "reasoning": "brief explanation of why this agent",
  "context_hint": "relevant context or instructions for the chosen agent"
}


Agent specialties:
- "narrator": Scene descriptions, exploration, atmosphere, lore, environmental storytelling, travel, discovering locations, examining objects, general adventure progression
- "combat": Combat encounters, attacks, defense, initiative, damage, tactical situations, fleeing from enemies, using weapons or combat spells
- "npc": NPC dialogue, conversations with characters, merchants/shopping, quest givers, persuasion/deception/intimidation directed at NPCs
- "dm": General game management, rules questions, complex multi-type situations that don't clearly fit one agent, or when multiple agents would be needed


When uncertain, default to "dm". Respond with ONLY the JSON object.`;


/**
 * Main orchestration function — replaces direct routeTask calls for game actions
 */
export async function orchestrate(
  userPrompt: string,
  gameContext?: { campaignId: number; sessionId?: number; gameSystemId?: number },
  maxTokens?: number
): Promise<{ content: string; model: string; instance: string; agent: string; classification?: ActionClassification }> {
  
  // Step 1: Check if DM agent is configured
  const dmAgent = resolveAgent('dm');
  
  if (!dmAgent) {
    // No DM configured — fall back to any available agent
    console.log('[Orchestrator] No DM agent configured, falling back to narrator');
    const result = await routeTask('narrator', userPrompt, gameContext, undefined, maxTokens);
    return { ...result, agent: 'narrator' };
  }
  
  // Step 2: Call DM for classification
  let classification: ActionClassification;
  try {
    classification = await classifyAction(userPrompt, gameContext);
    console.log(`[Orchestrator] DM classified action as: ${classification.primary_agent} — ${classification.reasoning}`);
  } catch (error) {
    console.error('[Orchestrator] Classification failed, DM handling directly:', error);
    // Classification failed — let DM handle the whole thing with its creative prompt
    const result = await routeTask('dm', userPrompt, gameContext, undefined, maxTokens);
    return { ...result, agent: 'dm' };
  }
  
  // Step 3: Route to the primary agent
  const targetRole = classification.primary_agent;
  
  // Build an enhanced prompt that includes the DM's context hint
  const enhancedPrompt = classification.context_hint 
    ? `[DM Context: ${classification.context_hint}]\n\n${userPrompt}`
    : userPrompt;
  
  let result;
  try {
    // Try the classified agent first
    result = await routeTask(targetRole, enhancedPrompt, gameContext, undefined, maxTokens);
  } catch (error) {
    console.error(`[Orchestrator] Agent ${targetRole} failed, falling back to DM:`, error);
    // If the target agent fails, DM handles it
    result = await routeTask('dm', enhancedPrompt, gameContext, undefined, maxTokens);
    return { ...result, agent: 'dm', classification };
  }
  
  // Step 4: Fire-and-forget state update (don't await, don't block response)
  updateStateAsync(userPrompt, result.content, gameContext).catch(err => {
    console.error('[Orchestrator] State update failed (non-blocking):', err);
  });
  
  return { ...result, agent: targetRole, classification };
}


/**
 * Call DM agent with classification prompt to determine routing
 */
async function classifyAction(
  userPrompt: string,
  gameContext?: { campaignId: number; sessionId?: number }
): Promise<ActionClassification> {
  const dmAgent = resolveAgent('dm');
  if (!dmAgent) throw new Error('DM agent not configured');
  
  const client = new OllamaClient(dmAgent.instance.base_url);
  
  // Build context string
  let contextString = '';
  if (gameContext?.campaignId) {
    const context = buildContext(gameContext.campaignId, gameContext.sessionId);
    if (context) {
      contextString = `\n\nCurrent game state:\n${formatGameContext(context)}`;
    }
  }
  
  const classificationSystemPrompt = CLASSIFICATION_PROMPT + contextString;
  
  // Use DM's model but with low temperature for reliable JSON output
  const response = await client.generateText(
    dmAgent.model.model_tag,
    userPrompt,
    classificationSystemPrompt,
    {
      temperature: 0.1,      // Low temp for deterministic classification
      top_p: 0.5,
      top_k: 20,
      repeat_penalty: 1.0,
      num_ctx: dmAgent.parameters.num_ctx
    },
    256,                      // Small max_tokens — classification is short
    dmAgent.parameters.keep_alive
  );
  
  return parseClassification(response);
}


/**
 * Parse DM's classification JSON response
 */
function parseClassification(rawResponse: string): ActionClassification {
  // Try to extract JSON from the response (model might include extra text)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in DM classification response: ${rawResponse.substring(0, 200)}`);
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate the primary_agent field
  const validAgents = ['narrator', 'combat', 'npc', 'dm'];
  if (!parsed.primary_agent || !validAgents.includes(parsed.primary_agent)) {
    console.warn(`[Orchestrator] Invalid agent "${parsed.primary_agent}", defaulting to dm`);
    parsed.primary_agent = 'dm';
  }
  
  return {
    primary_agent: parsed.primary_agent,
    reasoning: parsed.reasoning || '',
    context_hint: parsed.context_hint || ''
  };
}


/**
 * Fire-and-forget state update after each action
 * Calls the State Manager agent to update game state JSON
 */
async function updateStateAsync(
  userAction: string,
  aiResponse: string,
  gameContext?: { campaignId: number; sessionId?: number }
): Promise<void> {
  // Only run if state agent is configured
  const stateAgent = resolveAgent('state');
  if (!stateAgent) return;
  
  const statePrompt = `Update the game state based on this turn.


Player action: ${userAction}


AI response: ${aiResponse}


Return a JSON object with any state changes (inventory changes, HP changes, location changes, quest updates, NPC attitude changes). Only include fields that changed. If nothing changed, return {"no_changes": true}.`;
  
  try {
    const result = await routeTask('state', statePrompt, gameContext, {
      temperature: 0.1
    }, 1024);
    
    // Log the state update for debugging
    console.log(`[Orchestrator] State update from ${result.model}: ${result.content.substring(0, 200)}`);
    
    // Note: In a future iteration, parse the JSON and actually persist state changes to the database
  } catch (error) {
    console.error('[Orchestrator] State update failed:', error);
  }
}