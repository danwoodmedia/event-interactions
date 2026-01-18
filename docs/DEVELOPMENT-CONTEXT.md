# Event Interactions - Development Context

## Project Overview

**Product:** Event Interactions - A real-time audience engagement platform for live events

**Purpose:** Enables polls, Q&A, emoji reactions, social pop-ups, quizzes, and more as professional broadcast overlays for livestreams and event screens.

**Target Users:**
- Event organizers (Admin)
- Event producers (content moderation, triggers)
- A/V technicians (display settings, output config)
- Audience members (participate via phone)

---

## Technical Decisions Made

| Decision | Choice |
|----------|--------|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Real-time | Socket.IO |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (magic link + OAuth) |
| Hosting | Vercel (frontend) + Railway (backend) |
| Cache/Queue | Redis |

---

## Current Project State

### Completed ✅

1. **Project Structure**
   - `/client` - React frontend (Vite)
   - `/server` - Node.js backend (Express + Socket.IO)
   - `/docs` - Documentation including PRD

2. **React Client**
   - Vite + React setup
   - Socket.IO client installed and configured
   - Supabase client configured (`/client/src/lib/supabase.js`)
   - Auth helpers created (`/client/src/lib/auth.js`)
   - Test UI with connection status, DB test, and auth
   - Located at `http://localhost:5173`

3. **Node.js Server**
   - Express server with Socket.IO
   - CORS configured for client
   - Health check endpoint at `/`
   - Database test endpoint at `/api/test-db`
   - Supabase client configured (`/server/lib/supabase.js`)
   - WebSocket connection handling
   - Located at `http://localhost:3001`

4. **Client-Server Connection**
   - WebSocket communication working
   - Test message round-trip verified

5. **Version Control**
   - Git initialized
   - GitHub repository created (private)
   - Initial commits pushed

6. **Supabase Setup**
   - Supabase project created
   - Database schema created with all tables:
     - organizations, users, org_memberships
     - events, displays
     - audience_sessions, reactions
     - polls, poll_options, poll_votes
     - questions (Q&A)
     - social_submissions, quizzes, quiz_questions, quiz_answers
   - Row Level Security enabled with service role policies
   - Auto-updating `updated_at` triggers configured
   - Schema file: `/docs/supabase-schema.sql`

7. **Authentication**
   - Supabase Auth configured
   - Magic link (email) sign-in working
   - Auth state management in React
   - Sign in/sign out flow implemented

8. **Display Page**
   - Route at `/display` and `/display/:displayId`
   - Transparent mode working (tested in vMix)
   - Chroma key mode working (green/custom color)
   - Test emoji animations (click to spawn)
   - URL parameters: `mode`, `chroma`, `hideUI`, `eventId`
   - Poll overlay with animated results bars
   - File: `/client/src/pages/Display.jsx`

9. **Emoji Reactions**
   - Audience page with emoji grid (`/audience/:eventId`)
   - Server-side queue system with rate limiting
   - Surge detection (20+ same emoji = special animation)
   - Display animations with spawn direction/position options
   - A/V Tech controls for emoji settings

10. **A/V Tech Panel**
    - Route at `/avtech/:eventId`
    - Live stats (reactions, queue, displays)
    - Quick actions (pause emojis, clear queue, test)
    - Collapsible emoji settings (size, speed, direction, position)
    - Poll control (send to display, show results, close, hide)
    - Display URLs for easy copy
    - File: `/client/src/pages/AVTech.jsx`

11. **Producer Panel**
    - Route at `/producer/:eventId`
    - Poll creation form (question, 2-6 options, timer, allow change)
    - Poll management (view status, results, delete)
    - Live stats display
    - Quick links to other panels
    - File: `/client/src/pages/Producer.jsx`

12. **Polls Feature**
    - Producer creates polls (status: ready)
    - A/V Tech sends poll to display (status: live)
    - Audience votes with smooth slide-in animation
    - Real-time results broadcast
    - A/V Tech can show/hide results on display
    - Optional auto-close timer
    - Animated result bars on display

### Not Started Yet ❌

- Q&A feature
- Admin panel
- Database persistence for polls (currently in-memory)

---

## MVP Scope (3 Months)

### Core Platform
- Authentication (magic link + OAuth)
- Organization/Event/User hierarchy
- Role-based permissions
- Real-time WebSocket infrastructure
- Audience join via link + QR code
- Display output (transparent + chroma)
- Multi-display support

### MVP Widgets
- 📊 Polls (multiple choice, live results, timed)
- 💬 Q&A (submit, moderate, upvote, feature)
- 😀 Emoji Reactions (with queue system and surge animations)
- ⏱️ Countdown/Timer

### Control Interfaces
- Producer Panel (moderation, triggers)
- A/V Tech Panel (display settings, output config)
- Admin Panel (event setup, user management)
- Demo Mode (simulated audience for testing)

---

## Key Architecture Concepts

### Emoji Queue System
- Server-side queue prevents display overload
- Max emojis on screen configurable (default 30)
- Surge detection: 20+ same emoji triggers special animation
- User cooldown: invisible rate limiting (configurable)

### Display Output Modes
- **Transparent:** CSS `background: transparent` for OBS/vMix browser source
- **Chroma:** Solid green/blue for hardware switchers
- **NDI:** Phase 2 - native alpha channel output

### User Roles
```
Owner → Admin → Producer / A/V Tech → Audience
```

### Data Retention
- Per-event customers: 90 days
- Subscription customers: Forever

---

## Next Steps (In Order)

1. ~~**Set up Supabase**~~ ✅ DONE

2. ~~**Create Display Page**~~ ✅ DONE

3. ~~**Build Emoji Reactions**~~ ✅ DONE
   - Audience UI (emoji grid)
   - Server queue system
   - Display animations
   - A/V tech controls

4. ~~**Add Polls**~~ ✅ DONE
   - Producer creates polls
   - A/V Tech controls display
   - Audience votes
   - Animated results on display

5. **Add Q&A**

6. **Build Admin Panel**

---

## File Locations

```
C:\Projects\event-interactions\
├── client\
│   ├── src\
│   │   ├── App.jsx              # Main React component
│   │   ├── main.jsx             # Entry point with routes
│   │   ├── pages\
│   │   │   ├── Display.jsx      # Broadcast overlay output
│   │   │   ├── Audience.jsx     # Audience participation page
│   │   │   ├── Audience.css
│   │   │   ├── AVTech.jsx       # A/V Tech control panel
│   │   │   ├── AVTech.css
│   │   │   ├── Producer.jsx     # Producer content panel
│   │   │   └── Producer.css
│   │   └── lib\
│   │       ├── supabase.js      # Supabase client
│   │       └── auth.js          # Auth helper functions
│   ├── .env                     # Client env vars (VITE_SUPABASE_*)
│   ├── package.json
│   └── vite.config.js
├── server\
│   ├── index.js                 # Server entry point (emoji queue, poll handlers)
│   ├── lib\
│   │   └── supabase.js          # Supabase client (service role)
│   ├── .env                     # Server env vars (SUPABASE_*)
│   └── package.json
├── docs\
│   ├── PRD.md                   # Full product requirements
│   ├── DEVELOPMENT-CONTEXT.md   # This file
│   └── supabase-schema.sql      # Database schema
└── .gitignore
```

## URL Reference

| URL | Purpose |
|-----|---------|
| `/producer/:eventId` | Producer content panel (create polls) |
| `/avtech/:eventId` | A/V Tech display settings (send polls, emoji settings) |
| `/audience/:eventId` | Audience participation page (vote, send emojis) |
| `/display?eventId=X` | Broadcast overlay output (transparent/chroma) |

---

## Commands Reference

### Start Development

Terminal 1 (Server):
```bash
cd C:\Projects\event-interactions\server
npm run dev
```

Terminal 2 (Client):
```bash
cd C:\Projects\event-interactions\client
npm run dev
```

### Git Workflow

Save progress:
```bash
cd C:\Projects\event-interactions
git add .
git commit -m "Description of changes"
git push
```

Get latest (when switching computers):
```bash
git pull
```

---

## Pricing Tiers (For Reference)

| Tier | Price | Audience Limit |
|------|-------|----------------|
| Per-event (small) | $79 | 100 |
| Per-event (medium) | $199 | 500 |
| Per-event (large) | $399 | 1,000 |
| Starter subscription | $99/mo | 250 |
| Pro subscription | $249/mo | 1,000 |
| Enterprise | $599+/mo | Unlimited |

---

## Important Notes

- Full PRD is in `/docs/PRD.md` - read this for complete feature specs
- Always walk through steps one at a time (learning as building)
- Test each feature before moving to the next
- Commit frequently to GitHub