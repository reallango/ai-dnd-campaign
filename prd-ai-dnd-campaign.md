# PRD: AI D&D Campaign Manager

## Introduction

A comprehensive AI-driven D&D campaign management system that allows a DM (Dungeon Master) to run immersive, AI-narrated tabletop RPG sessions for 1-10 players. The system features a main DM interface for campaign control and a player portal for participants to join via campaign code, create/load characters, roll dice, and make choices.

## Goals

- Enable single DM to run AI-assisted D&D campaigns for 1-10 players
- Provide immersive, atmospheric interface with maps and world information
- Support both real-time (live) and async (play-by-post style) sessions
- Allow players to join via campaign code from any device (mobile + laptop)
- Support character creation via AI questionnaire or loading saved characters
- Roll dice from player devices with results visible to DM
- Allow players to make choices that AI incorporates into narrative
- Work on self-hosted infrastructure with AI options (local + cloud)
- MVP-first approach with phased feature rollout

## User Stories

### US-001: Campaign Creation
**Description:** As a DM, I want to create a new campaign and get a shareable campaign code so that players can join my session.

**Acceptance Criteria:**
- [ ] DM can create new campaign with name and optional description
- [ ] System generates unique 6-character campaign code (alphanumeric)
- [ ] Campaign code displayed prominently for DM to share
- [ ] Campaign stored persistently for DM to return to

### US-002: Player Join via Campaign Code
**Description:** As a player, I want to join an existing campaign using a code so that I can participate in the session.

**Acceptance Criteria:**
- [ ] Player can enter campaign code on landing page
- [ ] Valid code grants access to player portal
- [ ] Invalid code shows clear error message
- [ ] Player can view campaign info before joining

### US-003: Character Selection/Creation
**Description:** As a player, I want to either select a previously saved character or answer AI questions to create a new one for this campaign.

**Acceptance Criteria:**
- [ ] Player sees options: "Load Saved Character" or "Create New Character"
- [ ] LoadSaved shows list of player's saved characters with preview
- [ ] CreateNew: AI asks questions about character concept, race, class, background
- [ ] AI guides character creation process with interactive questionnaire
- [ ] Final character sheet displayed for player confirmation
- [ ] Character saved for future use

### US-004: DM Main Interface - Campaign Dashboard
**Description:** As a DM, I want a main campaign dashboard showing world state, maps, and quick actions.

**Acceptance Criteria:**
- [ ] Dashboard shows campaign name, current session info
- [ ] Display area for maps/images (upload or URL)
- [ ] Quick action buttons: "Start Session", "Manage Players", "Combat Tracker", "NPC Generator", "World Builder"
- [ ] Recent activity log showing AI Narrations and player actions
- [ ] Campaign state persisted

### US-005: AI Narrative Flow
**Description:** As a DM, I want AI to narrate the story and present choices to players.

**Acceptance Criteria:**
- [ ] DM can initiate AI narration (describe scene, location, event)
- [ ] AI generates narrative text with appropriate D&D tone
- [ ] AI presents 2-4 choice options for players
- [ ] Each player can see choices on their device and select one
- [ ] DM sees all player choices
- [ ] AI incorporates choices into continuation of story

### US-006: Player Portal - View and Choose
**Description:** As a player, I want to see the current situation and make my choice.

**Acceptance Criteria:**
- [ ] Player sees current scene/narrative description
- [ ] Character name and basic stats displayed
- [ ] Choice options presented clearly
- [ ] Player selects one option
- [ ] Selection sent to DM/system
- [ ] Player sees confirmation of choice made

### US-007: Dice Rolling
**Description:** As a player (or DM), I want to roll dice for various actions.

**Acceptance Criteria:**
- [ ] Dice menu: d4, d6, d8, d10, d12, d20, d100 (percentile)
- [ ] Roll any combination (e.g., 2d6+3)
- [ ] Roll history shows recent rolls
- [ ] Results displayed to all participants (DM sees all, player sees own)
- [ ] Roll reason/label optional

### US-008: Real-Time Session Mode
**Description:** As a DM, I want to run a live session where AI narrates and players respond in real-time.

**Acceptance Criteria:**
- [ ] "Start Live Session" button
- [ ] All connected players shown
- [ ] DM controls pacing ("Next Beat", "Wait for Players")
- [ ] Players see updates in real-time
- [ ] Timer option for choice deadlines
- [ ] Session log of all narrations and choices

### US-009: Async Session Mode
**Description:** As a DM, I want to run an async session where players respond on their own time.

**Acceptance Criteria:**
- [ ] "Start Async Session" mode
- [ ] DM posts scene/choices
- [ ] Players notified (if configured)
- [ ] Players respond within deadline (or unlimited)
- [ ] DM can check responses and continue
- [ ] No real-time waiting

### US-010: Combat Tracker (Future Phase)
**Description:** As a DM, I want to track combat initiative, HP, and turn order.

**Acceptance Criteria:**
- [ ] Add combatants (players + NPCs/monsters)
- [ ] Initiative roll (auto or manual)
- [ ] Turn order displayed
- [ ] Track HP, conditions (poisoned, stunned, etc.)
- [ ] Current turn highlighted
- [ ] Combat log

### US-011: NPC Generator (Future Phase)
**Description:** As a DM, I want AI to generate NPCs with backstories and voices.

**Acceptance Criteria:**
- [ ] Describe NPC concept (appearance, role, personality)
- [ ] AI generates: name, appearance, backstory, voice/quotes
- [ ] NPC added to campaign bestiary
- [ ] Retrieve and refine NPCs

### US-012: World Builder (Future Phase)
**Description:** As a DM, I want to build and store world lore, locations, and factions.

**Acceptance Criteria:**
- [ ] Add locations with descriptions
- [ ] Add factions with goals and members
- [ ] World timeline/history entries
- [ ] Link related entries
- [ ] Reference during AI narration

### US-013: Mobile Responsiveness
**Description:** The system must work on mobile devices.

**Acceptance Criteria:**
- [ ] Main interface usable on tablets (portrait and landscape)
- [ ] Player portal fully functional on smartphones
- [ ] Touch-friendly buttons and inputs
- [ ] Readable text without horizontal scroll
- [ ] Works on laptops without issues

## Functional Requirements

### FR-1: Campaign Management
- FR-1.1: Create campaign with unique code
- FR-1.2: Load existing campaign
- FR-1.3: Delete/archive campaign
- FR-1.4: List all campaigns for DM

### FR-2: Player Management
- FR-2.1: Join campaign via code
- FR-2.2: View player list
- FR-2.3: Remove player from campaign
- FR-2.4: Track connected/disconnected status

### FR-3: Character System
- FR-3.1: Save character to player profile
- FR-3.2: Load saved character
- FR-3.3: AI-assisted character creation
- FR-3.4: Display character sheet

### FR-4: AI Integration
- FR-4.1: Connect to local AI (Ollama)
- FR-4.2: Connect to cloud AI (OpenAI compatible API)
- FR-4.3: Route different tasks to different models
- FR-4.4: Configurable AI settings

### FR-5: Narrative Engine
- FR-5.1: Generate scene descriptions
- FR-5.2: Generate choice options
- FR-5.3: Incorporate player choices into story
- FR-5.4: Maintain narrative consistency

### FR-6: Dice System
- FR-6.1: Roll standard dice (d4, d6, d8, d10, d12, d20, d100)
- FR-6.2: Support dice notation (2d6+3)
- FR-6.3: Roll history
- FR-6.4: Anonymous rolls option

### FR-7: Session Modes
- FR-7.1: Live real-time mode
- FR-7.2: Async mode
- FR-7.3: Switch between modes

### FR-8: Data Persistence
- FR-8.1: Save campaign state
- FR-8.2: Save character sheets
- FR-8.3: Save world/lore entries
- FR-8.4: Export/import campaign

## Technical Architecture

### Stack
- **Frontend:** Next.js with React
- **Styling:** CSS with D&D immersive theme
- **Backend:** Next.js API routes
- **Database:** SQLite (self-hosted, file-based)
- **State:** In-memory + persisted to SQLite

### AI Options
- **Local:** Ollama (localhost:11434)
- **Cloud:** OpenAI API, Anthropic API, local alternative
- **Configuration:** Set via environment variables

### File Structure
```
/workspace/project/
├── app/
│   ├── page.tsx              # Landing - create/join campaign
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── api/                  # API routes
│   │   ├── campaigns/        # Campaign CRUD
│   │   ├── players/          # Player management
│   │   ├── characters/       # Character management
│   │   ├── dice/             # Dice rolling
│   │   └── ai/               # AI narrative
│   ├── dm/                   # DM dashboard
│   │   └── [campaignId]/     # Campaign management
│   └── player/               # Player portal
│       └── [campaignId]/    # Player view
├── components/                # React components
├── lib/                      # Utilities
├── prisma/                   # Database (if using ORM)
└── public/                   # Static assets
```

## Phase Breakdown

### Phase 1 - MVP (This Implementation)
- Campaign creation with code
- Player join via code
- Basic character selection/creation
- DM dashboard with narrative
- Player portal with choices
- Dice rolling
- SQLite persistence
- Mobile responsive

### Phase 2 - Combat & NPCs
- Combat tracker
- NPC generator
- Initiative tracking

### Phase 3 - World Building
- Location builder
- Faction management
- Lore entries
- World map integration

## Out of Scope (Non-Goals)

- No built-in video/voice chat (use external tools)
- No character art generation (use external tools)
- No rules engine/damage calculation automation
- No dice statistics/tracking beyond history
- No full VTT (virtual table) features

## Success Metrics

- DM can create campaign and get code in under 30 seconds
- Players can join and see character options in under 60 seconds
- AI narrative responds within 5 seconds (local) or 15 seconds (cloud)
- Dice rolls display immediately
- Works on mobile Safari and Chrome without issues
- 1-10 players supported without performance degradation