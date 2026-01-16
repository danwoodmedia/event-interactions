# Event Interactions
# Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Draft  
**Author:** [Your Name]

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [User Personas & Roles](#4-user-personas--roles)
5. [Feature Specifications](#5-feature-specifications)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Models](#7-data-models)
8. [User Flows](#8-user-flows)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Security & Privacy](#10-security--privacy)
11. [Accessibility](#11-accessibility)
12. [Localization](#12-localization)
13. [Analytics & Metrics](#13-analytics--metrics)
14. [Pricing & Packaging](#14-pricing--packaging)
15. [Development Phases](#15-development-phases)
16. [Success Criteria](#16-success-criteria)
17. [Open Questions](#17-open-questions)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

Event Interactions is a modular, broadcast-ready audience engagement platform that enables real-time participation at live events — polls, Q&A, emoji reactions, social pop-ups, quizzes, and more — all appearing as professional overlays on livestreams and event screens.

### 1.2 Core Value Proposition

- **For audiences:** Familiar, intuitive participation through mobile devices
- **For producers:** Full content moderation and engagement control
- **For A/V technicians:** Broadcast-ready output with professional controls
- **For event organizers:** Measurable engagement and memorable moments

### 1.3 Key Differentiators

1. **Visual broadcast integration** — Transparent overlays, not bar charts on slides
2. **A/V tech-friendly** — Purpose-built controls for video professionals
3. **Modular widget system** — Mix and match engagement types per event
4. **Scalable performance** — Queue system handles 1,000+ concurrent users
5. **Multi-display support** — Different outputs for different screens/streams

### 1.4 Target Launch

- **MVP:** 3 months from development start
- **Fast Follow:** Months 4–5
- **Phase 2:** Months 6–12

---

## 2. Problem Statement

### 2.1 Current State

Professional events (corporate town halls, conferences, hybrid meetings, concerts) lack engaging real-time audience participation tools. Existing solutions like Slido and Mentimeter:

- Display results as static charts on presentation slides
- Lack visual spectacle suitable for broadcast
- Don't integrate with professional video workflows
- Offer no controls for A/V technicians
- Feel disconnected from the live event experience

### 2.2 User Pain Points

| User | Pain Point |
|------|------------|
| **Audience** | Passive experience; no visible impact of participation |
| **Event Organizer** | Can't measure or demonstrate engagement visually |
| **Producer** | Limited moderation; can't control what appears on screen |
| **A/V Technician** | No broadcast-ready output; clunky integration with video systems |

### 2.3 Market Gap

Consumer livestream platforms (TikTok, Instagram, YouTube) have set audience expectations for real-time visual engagement. Professional events have not kept pace. There is no product that combines:

- Consumer-style visual engagement
- Broadcast-quality output
- Professional moderation workflow
- A/V technician controls

---

## 3. Solution Overview

### 3.1 Product Concept

Event Interactions is a **widget-based overlay platform**. The core platform handles:

- Audience authentication and session management
- Real-time communication infrastructure
- Content moderation workflow
- Display rendering and output
- Analytics and data persistence

**Widgets** are modular engagement types that plug into the platform:

- Polls
- Q&A
- Emoji Reactions
- Social Pop-ups
- Quiz/Leaderboard
- Countdown/Timer
- Live Captions
- (Future: Word Cloud, Decision Trees, Threshold Triggers, etc.)

### 3.2 System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EVENT INTERACTIONS PLATFORM                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AUDIENCE INTERFACE          CONTROL INTERFACES                     │
│  ┌─────────────────┐        ┌─────────────────┐                    │
│  │ Mobile-optimized│        │ Producer Panel  │                    │
│  │ Web app         │        │ A/V Tech Panel  │                    │
│  │ Widget UIs      │        │ Admin Panel     │                    │
│  └─────────────────┘        └─────────────────┘                    │
│           │                          │                              │
│           └──────────┬───────────────┘                              │
│                      ▼                                              │
│           ┌─────────────────┐                                      │
│           │  CORE PLATFORM  │                                      │
│           │  • WebSocket    │                                      │
│           │  • Auth         │                                      │
│           │  • Queue System │                                      │
│           │  • Moderation   │                                      │
│           └────────┬────────┘                                      │
│                    ▼                                                │
│           ┌─────────────────┐                                      │
│           │ DISPLAY ENGINE  │                                      │
│           │ • Widget render │                                      │
│           │ • Canvas mgmt   │                                      │
│           │ • Output modes  │                                      │
│           └────────┬────────┘                                      │
│                    ▼                                                │
│        ┌──────────────────────┐                                    │
│        │   OUTPUT OPTIONS     │                                    │
│        │ • Transparent (CSS)  │                                    │
│        │ • Chroma (green/blue)│                                    │
│        │ • NDI (Phase 2)      │                                    │
│        └──────────────────────┘                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Output Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Transparent** | CSS `background: transparent` | OBS/vMix browser source (recommended) |
| **Chroma** | Solid green or blue background | Hardware switchers, legacy setups |
| **NDI** | Network Device Interface with alpha | Professional broadcast (Phase 2) |

---

## 4. User Personas & Roles

### 4.1 Role Hierarchy

```
OWNER (Platform level)
└── Creates organizations, manages platform billing

ADMIN (Organization level)
├── Creates and configures events
├── Manages team members and permissions
├── Views analytics across all events
└── Configures organization branding (Enterprise)

PRODUCER (Event level)
├── Moderates audience content (Q&A, social pop-ups)
├── Triggers polls, features questions
├── Controls what content appears on display
└── Views real-time engagement metrics

A/V TECH (Event level)
├── Configures display output settings
├── Controls widget positioning and sizing
├── Manages multi-display setup
├── Can view (not control) Producer functions
└── Monitors system performance

AUDIENCE (Event level)
├── Joins via link or QR code
├── Participates through widget interfaces
├── Optional: provides nickname/email
└── No persistent account required
```

### 4.2 Persona Details

#### 4.2.1 Event Organizer (Admin)

**Name:** Sarah  
**Role:** Corporate Communications Manager  
**Context:** Runs quarterly town halls for 500+ employees globally

**Goals:**
- Increase engagement metrics for leadership visibility
- Create memorable moments that employees talk about
- Capture feedback and sentiment data

**Frustrations:**
- Current tools feel disconnected from the broadcast
- Results appear as boring charts, not visual spectacle
- Can't demonstrate ROI of event technology

**Needs from Event Interactions:**
- Easy event setup
- Post-event analytics and reports
- Visual engagement that impresses leadership

---

#### 4.2.2 Event Producer

**Name:** Mike  
**Role:** Freelance Event Producer  
**Context:** Produces 2–3 events per week for various corporate clients

**Goals:**
- Deliver polished, professional events
- Maintain full control over what appears on screen
- Avoid embarrassing content slipping through

**Frustrations:**
- No time to learn complex tools
- Worried about inappropriate content on livestream
- Needs to react quickly during live events

**Needs from Event Interactions:**
- Simple, intuitive moderation interface
- Quick approval/rejection workflow
- Real-time preview of what's on screen

---

#### 4.2.3 A/V Technician

**Name:** James  
**Role:** Senior Video Engineer at production company  
**Context:** Operates vMix/OBS at live events, manages multi-camera setups

**Goals:**
- Clean integration with existing video workflow
- Control over visual appearance
- Reliability during live broadcast

**Frustrations:**
- Most event software ignores A/V needs
- Chroma keying is finicky, causes artifacts
- No control over sizing, positioning, animation

**Needs from Event Interactions:**
- Transparent output that composites cleanly
- Fine-grained control over display settings
- System performance visibility
- Quick setup and validation

---

#### 4.2.4 Audience Member

**Name:** Various  
**Role:** Event attendee (in-person or virtual)  
**Context:** Watching company event, conference session, or livestream

**Goals:**
- Feel connected to the event
- Have their voice heard
- Easy, familiar interaction

**Frustrations:**
- Apps are confusing or slow
- Don't know if their participation mattered
- Phone connection is unreliable

**Needs from Event Interactions:**
- Instant join (no account creation)
- Familiar interaction patterns
- Works on poor connections
- Visual confirmation of participation

---

## 5. Feature Specifications

### 5.1 MVP Features (3-Month Target)

#### 5.1.1 Core Platform

##### Authentication & Authorization

| Requirement | Details |
|-------------|---------|
| **Magic Link** | Primary login method; email link valid for 15 minutes |
| **OAuth** | Google and Microsoft sign-in options |
| **Session Management** | JWT tokens, 7-day refresh |
| **Role-Based Access** | Permissions enforced at API level |
| **Audience Sessions** | Anonymous by default, optional nickname/email |

##### Organization & Event Management

| Entity | Attributes |
|--------|------------|
| **Organization** | Name, billing info, branding (Enterprise), subscription tier |
| **Event** | Name, date, status (draft/live/ended), settings, widgets enabled |
| **User** | Email, name, role per organization |
| **Display** | Name, output mode, widget layout, resolution |

##### Real-Time Infrastructure

| Requirement | Details |
|-------------|---------|
| **Protocol** | WebSocket via Socket.IO |
| **Latency Target** | <1 second end-to-end |
| **Reconnection** | Auto-reconnect with exponential backoff |
| **Fallback** | HTTP long-polling if WebSocket fails |
| **Scaling** | Redis pub/sub for multi-server (when needed) |

##### Display Output

| Requirement | Details |
|-------------|---------|
| **Transparent Mode** | CSS `background: transparent`, works in OBS/vMix browser source |
| **Chroma Mode** | Configurable color (#00FF00 green, #0000FF blue, custom) |
| **Resolution** | 1920×1080 default, configurable (4K, custom) |
| **Multi-Display** | Multiple independent display instances per event |
| **Widget Canvas** | Widgets positioned on canvas, configurable per display |

---

#### 5.1.2 Widgets

##### 📊 Polls

**Audience Interface:**
- Display question and 2–6 answer options
- Single-select (radio buttons)
- Tap to vote, visual confirmation
- Can change vote until poll closes (configurable)

**Producer Controls:**
- Create poll (question + options)
- Open/close poll manually or with timer
- Show/hide results on display
- Reset poll
- Multiple polls per event

**Display Output:**
- Question text
- Options with animated vote bars
- Vote count or percentage (configurable)
- Animation when votes come in

**A/V Tech Controls:**
- Position on canvas
- Size scaling
- Color scheme
- Animation style
- Duration on screen

---

##### 💬 Q&A

**Audience Interface:**
- Text input to submit question
- View submitted questions (optional)
- Upvote others' questions (optional)
- Character limit (configurable, default 280)

**Producer Controls:**
- View queue of submitted questions
- Approve/reject each question
- Feature approved question on display
- Mark question as answered
- Sort by: newest, most upvotes
- Bulk actions (reject all, etc.)

**Moderation Workflow:**
```
Submitted → Pending Review → Approved → Featured → Answered
                          ↘ Rejected (hidden)
```

**Display Output:**
- Featured question with submitter name (if provided)
- Animation in/out
- Optional: queue count ("47 questions submitted")

**A/V Tech Controls:**
- Position on canvas
- Size and font scaling
- Display duration
- Animation style
- Max characters shown

---

##### 😀 Emoji Reactions

**Audience Interface:**
- Grid of emoji (3×3 default, configurable)
- Tap to send
- Visual confirmation (brief highlight)
- Invisible cooldown (no error message)

**Queue System:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    EMOJI QUEUE ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User taps emoji → Server queue → Rate-limited output → Display │
│                                                                  │
│  Queue Logic:                                                   │
│  • Max on screen: configurable (default 30)                     │
│  • When slot available: release next from queue                 │
│  • Surge detection: 20+ same emoji triggers special animation   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Surge Mechanic:**

| Threshold | Effect |
|-----------|--------|
| 20+ same emoji | 1.5× size, burst animation |
| 50+ same emoji | 2× size, particle effects |
| 100+ same emoji | 3× size, screen-wide explosion |

**Producer Controls:**
- Enable/disable reactions
- Select emoji pack
- View reaction counts in real-time

**A/V Tech Controls:**
- Max emojis on screen (5–100)
- Animation duration (1–8 seconds)
- Spawn rate when queued (20–200ms)
- User cooldown (100ms–10s)
- Position zone (left, right, full width)
- Emoji size (50%–200%)
- Surge animation enable/disable
- Surge thresholds

**Emoji Packs:**
- Default: 😀 😂 😮 🔥 ❤️ 👏 🎉 👍 😢
- Professional: 👍 👏 💡 ✅ ❓ 🎯 📈 ⭐ 🏆
- Fun: 🎉 🥳 🤩 🚀 💯 🙌 😍 🔥 ⚡
- Custom: Admin uploads (Enterprise)

---

##### ⏱️ Countdown / Timer

**Producer Controls:**
- Create countdown (target time or duration)
- Create timer (count up)
- Start/pause/reset
- Trigger actions on complete (optional webhook - Phase 2)

**Display Output:**
- Large format time display (HH:MM:SS or MM:SS)
- Visual style options (digital, analog, minimal)
- Optional: progress bar
- Animation on completion

**A/V Tech Controls:**
- Position on canvas
- Size scaling
- Color scheme
- Display format (show hours, show seconds, etc.)

---

#### 5.1.3 Control Interfaces

##### Producer Panel

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  EVENT INTERACTIONS - Producer Panel                [Event Name] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LIVE PREVIEW                                            │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │                                                      │ │   │
│  │ │    [Real-time preview of display output]            │ │   │
│  │ │                                                      │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │ Display: [Main Stage ▼]  Audience: 247 connected       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   WIDGETS    │ │  MODERATION  │ │   METRICS    │            │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤            │
│  │ □ Reactions  │ │ Q&A Queue:   │ │ Total:  847  │            │
│  │ ☑ Q&A        │ │ ┌──────────┐ │ │ 🔥 234       │            │
│  │ □ Poll 1     │ │ │ Question │ │ │ ❤️ 189       │            │
│  │ ☑ Timer      │ │ │ [✓] [✗]  │ │ │ 👏 156       │            │
│  │              │ │ └──────────┘ │ │ Polls: 3     │            │
│  │ [+ Add]      │ │ [Approve All]│ │ Q&A: 47      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                                           │   │
│  │ [🚨 Clear All Displays] [⏸️ Pause Reactions] [📊 Poll] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Live preview of selected display
- Widget enable/disable toggles
- Moderation queue with quick approve/reject
- Real-time engagement metrics
- Panic button (clear all displays instantly)

---

##### A/V Tech Panel

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  EVENT INTERACTIONS - A/V Tech Panel                [Event Name] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────────────────────────┐   │
│  │ DISPLAYS        │ │ DISPLAY SETTINGS: Main Stage        │   │
│  ├─────────────────┤ ├─────────────────────────────────────┤   │
│  │ ● Main Stage    │ │                                      │   │
│  │ ○ Breakout 1    │ │ Output Mode:  [Transparent ▼]       │   │
│  │ ○ Livestream    │ │ Resolution:   [1920×1080 ▼]         │   │
│  │                 │ │ Chroma Color: [#00FF00   ]          │   │
│  │ [+ Add Display] │ │                                      │   │
│  └─────────────────┘ │ WIDGET LAYOUT                        │   │
│                      │ ┌─────────────────────────────────┐  │   │
│  ┌─────────────────┐ │ │                                 │  │   │
│  │ SYSTEM STATUS   │ │ │  [Drag widgets to position]    │  │   │
│  ├─────────────────┤ │ │                                 │  │   │
│  │ Audience: 247   │ │ │  ┌─────┐           ┌─────┐    │  │   │
│  │ Queue: 12       │ │ │  │Poll │           │Timer│    │  │   │
│  │ Latency: 84ms   │ │ │  └─────┘           └─────┘    │  │   │
│  │ Status: ● Live  │ │ │                                 │  │   │
│  └─────────────────┘ │ │      [Reactions Zone]           │  │   │
│                      │ └─────────────────────────────────┘  │   │
│  ┌─────────────────┐ │                                      │   │
│  │ PERFORMANCE     │ │ [Save Layout] [Reset] [Test Mode]   │   │
│  ├─────────────────┤ └─────────────────────────────────────┘   │
│  │ Emoji Queue: 12 │                                           │
│  │ ████░░░░░░ 40%  │ ┌─────────────────────────────────────┐   │
│  │                 │ │ EMOJI REACTIONS SETTINGS             │   │
│  │ CPU: 23%        │ ├─────────────────────────────────────┤   │
│  │ Memory: 156MB   │ │ Max on screen:     [====|===] 30    │   │
│  └─────────────────┘ │ Emoji size:        [===|====] 100%  │   │
│                      │ Animation duration:[====|===] 3.0s  │   │
│                      │ User cooldown:     [==|=====] 500ms │   │
│                      │ Surge animations:  [☑]              │   │
│                      │ Position zone:     [Full Width ▼]   │   │
│                      └─────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Multi-display management
- Output mode configuration
- Visual widget layout editor (drag and drop)
- Per-widget settings
- System performance monitoring
- Test mode (simulated audience)

---

##### Admin Panel

**Sections:**

1. **Event Management**
   - Create/edit/delete events
   - Event settings and widget selection
   - Join link and QR code generation

2. **Team Management**
   - Invite users by email
   - Assign roles (Admin, Producer, Tech)
   - Remove access

3. **Analytics**
   - Per-event engagement reports
   - Aggregate organization metrics
   - Export data (CSV)

4. **Settings**
   - Organization profile
   - Default event settings
   - Data retention preferences
   - Branding (Enterprise)

---

#### 5.1.4 Demo Mode

**Purpose:** Enable testing, A/V setup validation, and sales demos without requiring a real audience.

**Functionality:**
- Toggle on/off in A/V Tech panel
- Simulates audience activity:
  - Random emoji reactions (configurable rate)
  - Fake poll votes (distributed across options)
  - Sample Q&A submissions
- Clearly labeled "DEMO MODE" on control interfaces
- Does not affect analytics

---

### 5.2 Fast Follow Features (Months 4–5)

#### 5.2.1 🐦 Social Pop-ups

**Audience Interface:**
- Text input to submit comment/message
- Character limit (280 default)
- Optional: attach image (moderated)

**Producer Controls:**
- View submission queue
- Approve/reject each submission
- Feature approved content on display
- Set display duration
- Style templates (tweet-style, quote-style, minimal)

**Display Output:**
- Animated pop-up with user content
- Submitter name/nickname
- Configurable position and animation

---

#### 5.2.2 🏆 Quiz / Leaderboard

**Audience Interface:**
- Question displayed with answer options
- Timed response (countdown visible)
- Immediate feedback (correct/incorrect)
- Running score visible
- Leaderboard position

**Producer Controls:**
- Create quiz (multiple questions)
- Configure timing per question
- Start/pause/end quiz
- Show leaderboard on display
- Export final results

**Display Output:**
- Current question with countdown
- Live leaderboard (top 5/10)
- Celebration animation for winners

**Scoring:**
- Points for correct answer
- Bonus points for speed
- Configurable point values

---

#### 5.2.3 📝 Live Captions (Integration)

**V1 Approach:** Accept captions from external services (CART, AI transcription)

**Input Methods:**
- WebSocket endpoint for caption stream
- Webhook for caption events
- Manual text entry (producer)

**Display Output:**
- Caption text area (configurable position)
- Configurable font size for readability
- Background options for visibility
- Rolling text or replace mode

**A/V Tech Controls:**
- Position and size
- Font and background styling
- Max lines displayed
- Caption delay adjustment

---

### 5.3 Phase 2 Features (Months 6–12)

| Feature | Description |
|---------|-------------|
| **Decision Trees** | Branching audience choices; majority vote determines path |
| **Threshold Triggers** | Actions triggered when engagement hits targets |
| **Word Cloud** | Real-time word aggregation from audience input |
| **Lower Thirds** | Speaker names, titles, custom info cards |
| **NDI Desktop App** | Native alpha channel output for broadcast |
| **Built-in Captions** | Speech-to-text via Deepgram/Whisper |
| **AI Sentiment** | Summarize audience mood from engagement patterns |
| **Stripe Billing** | Self-serve subscription management |
| **White Label** | Custom branding, remove Event Interactions branding |
| **API Access** | Public API for integrations |

---

## 6. Technical Architecture

### 6.1 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React | Large ecosystem, component-based, Claude Code proficiency |
| **Backend** | Node.js | JavaScript full-stack, excellent real-time support |
| **Real-time** | Socket.IO | WebSocket with automatic fallback, rooms/namespaces |
| **Database** | PostgreSQL | Relational data, complex queries, reliable |
| **Cache/Queue** | Redis | Real-time state, pub/sub, queue management |
| **Auth** | Supabase Auth | Magic link + OAuth, managed service |
| **Hosting** | Vercel (frontend), Railway (backend) | Managed, auto-scaling, developer-friendly |
| **CDN** | Cloudflare | Performance, DDoS protection |

### 6.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CLIENTS                                                           │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│   │ Audience │ │ Producer │ │ A/V Tech │ │ Display  │             │
│   │  (React) │ │  (React) │ │  (React) │ │  (React) │             │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘             │
│        │            │            │            │                     │
│        └────────────┴────────────┴────────────┘                     │
│                          │                                          │
│                          ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                     CLOUDFLARE CDN                           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│           ┌──────────────┴──────────────┐                          │
│           ▼                              ▼                          │
│   ┌───────────────┐              ┌───────────────┐                 │
│   │    VERCEL     │              │    RAILWAY    │                 │
│   │   (Frontend)  │              │   (Backend)   │                 │
│   │               │              │               │                 │
│   │  Static React │              │  Node.js API  │                 │
│   │  assets       │              │  Socket.IO    │                 │
│   └───────────────┘              └───────┬───────┘                 │
│                                          │                          │
│                          ┌───────────────┼───────────────┐         │
│                          ▼               ▼               ▼         │
│                   ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│                   │ SUPABASE │    │  REDIS   │    │ SUPABASE │    │
│                   │   Auth   │    │  Cache   │    │ Postgres │    │
│                   │          │    │  Queue   │    │          │    │
│                   │ • Magic  │    │  Pub/Sub │    │ • Events │    │
│                   │   link   │    │          │    │ • Users  │    │
│                   │ • OAuth  │    │ • Session│    │ • Data   │    │
│                   │ • JWT    │    │ • Emoji Q│    │ • Analytc│    │
│                   └──────────┘    └──────────┘    └──────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Real-Time Communication

**Socket.IO Namespaces:**

| Namespace | Purpose | Clients |
|-----------|---------|---------|
| `/audience` | Audience interactions | Audience members |
| `/control` | Producer/Tech commands | Producer, A/V Tech |
| `/display` | Display output stream | Display pages |

**Room Structure:**
```
/audience
  └── event:{eventId}
        └── All audience members for this event

/control
  └── event:{eventId}
        └── Producers and Techs for this event

/display
  └── display:{displayId}
        └── Display page for this specific display
```

**Event Types:**

| Event | Direction | Payload |
|-------|-----------|---------|
| `reaction:send` | Audience → Server | `{ emoji, sessionId }` |
| `reaction:display` | Server → Display | `{ emoji, position, size }` |
| `reaction:surge` | Server → Display | `{ emoji, count, tier }` |
| `poll:vote` | Audience → Server | `{ pollId, optionId }` |
| `poll:results` | Server → Display | `{ pollId, results[] }` |
| `qa:submit` | Audience → Server | `{ text, name? }` |
| `qa:feature` | Control → Display | `{ questionId }` |
| `widget:update` | Control → Display | `{ widgetId, settings }` |

### 6.4 Queue System (Emoji Reactions)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       EMOJI QUEUE FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. RECEIVE                                                         │
│     │                                                               │
│     │  Audience taps emoji                                          │
│     │  Server checks cooldown (Redis)                               │
│     │  If allowed: add to queue                                     │
│     │  If cooldown: ignore silently                                 │
│     ▼                                                               │
│  2. QUEUE (Redis List)                                              │
│     │                                                               │
│     │  LPUSH emoji to event queue                                   │
│     │  Track emoji type counts                                      │
│     │  Check surge thresholds                                       │
│     ▼                                                               │
│  3. PROCESS (Worker loop)                                           │
│     │                                                               │
│     │  Check: current on screen < max?                              │
│     │  If yes: RPOP from queue, emit to display                     │
│     │  If surge threshold met: emit surge event                     │
│     │  Sleep for spawn_rate milliseconds                            │
│     ▼                                                               │
│  4. DISPLAY                                                         │
│     │                                                               │
│     │  Receive emoji event                                          │
│     │  Render with animation                                        │
│     │  On animation complete: decrement on_screen count             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Redis Data Structures                                        │   │
│  │                                                              │   │
│  │ emoji:queue:{eventId}         List of pending emoji          │   │
│  │ emoji:onscreen:{eventId}      Count of currently displayed   │   │
│  │ emoji:counts:{eventId}        Hash of emoji type counts      │   │
│  │ emoji:cooldown:{eventId}:{sessionId}  Cooldown timestamp     │   │
│  │ emoji:surge:{eventId}         Pending surge (type + count)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.5 Graceful Degradation

| Failure | Behavior |
|---------|----------|
| WebSocket disconnect | Auto-reconnect; audience sees brief "reconnecting" |
| Redis unavailable | Fall back to in-memory queue (single server only) |
| Database unavailable | Cache reads from Redis; queue writes for retry |
| Display loses connection | Freezes on last state; reconnects automatically |
| Server restart | Clients reconnect; queue persists in Redis |

---

## 7. Data Models

### 7.1 Entity Relationship

```
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA MODEL OVERVIEW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Organization ─────┬───── User (many-to-many via OrgMembership)     │
│       │            │                                                 │
│       │            └───── Role (Admin, Producer, Tech)              │
│       │                                                              │
│       └───── Event ─────┬───── Display                              │
│                         │                                            │
│                         ├───── Poll ───── PollOption ───── Vote     │
│                         │                                            │
│                         ├───── Question (Q&A)                       │
│                         │                                            │
│                         ├───── SocialSubmission                     │
│                         │                                            │
│                         ├───── Quiz ───── QuizQuestion              │
│                         │                                            │
│                         └───── AudienceSession ───── Reaction       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Core Tables

#### Organizations

```sql
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  data_retention_days INTEGER DEFAULT 90,
  branding_config JSONB,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Users

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  avatar_url      VARCHAR(500),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Organization Memberships

```sql
CREATE TABLE org_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  role            VARCHAR(50) NOT NULL, -- 'admin', 'producer', 'tech'
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

#### Events

```sql
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE,
  status          VARCHAR(50) DEFAULT 'draft', -- 'draft', 'live', 'ended'
  scheduled_start TIMESTAMP,
  scheduled_end   TIMESTAMP,
  settings        JSONB DEFAULT '{}',
  widgets_enabled JSONB DEFAULT '["reactions", "polls", "qa"]',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Displays

```sql
CREATE TABLE displays (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  output_mode     VARCHAR(50) DEFAULT 'transparent', -- 'transparent', 'chroma'
  chroma_color    VARCHAR(7) DEFAULT '#00FF00',
  resolution      VARCHAR(20) DEFAULT '1920x1080',
  widget_layout   JSONB DEFAULT '{}',
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Audience Sessions

```sql
CREATE TABLE audience_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  session_token   VARCHAR(255) UNIQUE NOT NULL,
  nickname        VARCHAR(100),
  email           VARCHAR(255),
  ip_address      INET,
  user_agent      TEXT,
  connected_at    TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Reactions (for analytics, not real-time)

```sql
CREATE TABLE reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES audience_sessions(id) ON DELETE SET NULL,
  emoji           VARCHAR(10) NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_reactions_event_created ON reactions(event_id, created_at);
CREATE INDEX idx_reactions_event_emoji ON reactions(event_id, emoji);
```

#### Polls

```sql
CREATE TABLE polls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  status          VARCHAR(50) DEFAULT 'draft', -- 'draft', 'open', 'closed'
  allow_change    BOOLEAN DEFAULT false,
  show_results    BOOLEAN DEFAULT false,
  duration_seconds INTEGER,
  opened_at       TIMESTAMP,
  closed_at       TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE poll_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         UUID REFERENCES polls(id) ON DELETE CASCADE,
  text            VARCHAR(255) NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE poll_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id       UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES audience_sessions(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(poll_id, session_id) -- One vote per session per poll
);
```

#### Questions (Q&A)

```sql
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES audience_sessions(id) ON DELETE SET NULL,
  text            TEXT NOT NULL,
  submitter_name  VARCHAR(100),
  status          VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'featured', 'answered'
  upvotes         INTEGER DEFAULT 0,
  featured_at     TIMESTAMP,
  answered_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 8. User Flows

### 8.1 Audience Join Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AUDIENCE JOIN FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. ENTRY POINT                                                     │
│     │                                                               │
│     ├── Scan QR code (camera app → browser)                        │
│     │                                                               │
│     └── Type URL (eventinteractions.com/join/ABC123)               │
│                                                                      │
│  2. JOIN PAGE                                                       │
│     │                                                               │
│     │  ┌─────────────────────────────────────┐                     │
│     │  │                                      │                     │
│     │  │   Welcome to [Event Name]           │                     │
│     │  │                                      │                     │
│     │  │   Nickname (optional): [________]   │                     │
│     │  │   Email (optional): [___________]   │ ← If enabled        │
│     │  │                                      │                     │
│     │  │   [    Join Event    ]              │                     │
│     │  │                                      │                     │
│     │  └─────────────────────────────────────┘                     │
│     │                                                               │
│     │  • Validates event exists and is live                        │
│     │  • Creates audience session                                  │
│     │  • Stores session token in localStorage                      │
│     ▼                                                               │
│  3. PARTICIPATION                                                   │
│     │                                                               │
│     │  ┌─────────────────────────────────────┐                     │
│     │  │  [Active widget tabs at top]        │                     │
│     │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │                     │
│     │  │  │ 😀 │ │ 📊 │ │ ❓ │ │ 🏆 │       │                     │
│     │  │  └────┘ └────┘ └────┘ └────┘       │                     │
│     │  │                                      │                     │
│     │  │  [Widget-specific interface]        │                     │
│     │  │                                      │                     │
│     │  └─────────────────────────────────────┘                     │
│     │                                                               │
│     │  • Only shows widgets enabled for event                      │
│     │  • Real-time updates via WebSocket                           │
│     │  • Works offline briefly (queues actions)                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Producer Moderation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Q&A MODERATION FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AUDIENCE                    PRODUCER                   DISPLAY     │
│                                                                      │
│  ┌──────────┐                                                       │
│  │ Submits  │                                                       │
│  │ question │                                                       │
│  └────┬─────┘                                                       │
│       │                                                             │
│       │ WebSocket                                                   │
│       ▼                                                             │
│                              ┌──────────┐                           │
│                              │ Question │                           │
│                              │ appears  │                           │
│                              │ in queue │                           │
│                              └────┬─────┘                           │
│                                   │                                 │
│                         ┌────────┴────────┐                        │
│                         ▼                  ▼                        │
│                   ┌──────────┐       ┌──────────┐                  │
│                   │ APPROVE  │       │  REJECT  │                  │
│                   └────┬─────┘       └──────────┘                  │
│                        │                                            │
│                        │ Moves to "approved" list                   │
│                        ▼                                            │
│                   ┌──────────┐                                      │
│                   │ FEATURE  │                                      │
│                   │ (click)  │                                      │
│                   └────┬─────┘                                      │
│                        │                                            │
│                        │ WebSocket                                  │
│                        ▼                                            │
│                                            ┌──────────────────────┐ │
│                                            │ Question appears     │ │
│                                            │ on display with      │ │
│                                            │ animation            │ │
│                                            └──────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 A/V Tech Setup Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     A/V TECH SETUP FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Access Tech Panel                                               │
│     │                                                               │
│     │  Login → Select Organization → Select Event → Tech Panel     │
│     ▼                                                               │
│  2. Configure Display                                               │
│     │                                                               │
│     │  a. Create display (or select existing)                      │
│     │  b. Set output mode (Transparent recommended)                │
│     │  c. Set resolution to match video system                     │
│     │  d. Copy display URL                                         │
│     ▼                                                               │
│  3. Add to Video System                                             │
│     │                                                               │
│     │  vMix: Add Browser Input → paste URL → set size              │
│     │  OBS: Add Browser Source → paste URL → set dimensions        │
│     │                                                               │
│     │  ⚠️ For transparent: check "Enable transparency" in OBS      │
│     │                      vMix handles automatically              │
│     ▼                                                               │
│  4. Validate with Test Mode                                         │
│     │                                                               │
│     │  a. Enable "Test Mode" in Tech Panel                         │
│     │  b. Verify emoji appear and animate correctly                │
│     │  c. Verify positioning matches expectations                  │
│     │  d. Adjust settings as needed                                │
│     │  e. Disable Test Mode                                        │
│     ▼                                                               │
│  5. Go Live                                                         │
│                                                                      │
│     Event starts → Real audience joins → Monitor performance        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. UI/UX Requirements

### 9.1 Design Principles

| Principle | Application |
|-----------|-------------|
| **Familiar patterns** | Use interaction patterns audiences know from social platforms |
| **Mobile-first** | Audience interface designed for phone use |
| **Glanceable controls** | Producer/Tech can understand state instantly |
| **Accessible** | WCAG 2.1 AA compliance minimum |
| **Performance** | <3 second load, <1 second interaction response |

### 9.2 Audience Interface Requirements

- **Load time:** <3 seconds on 3G connection
- **Touch targets:** Minimum 44×44px
- **Feedback:** Visual confirmation within 100ms of tap
- **Offline tolerance:** Queue actions for 30 seconds of disconnect
- **Orientation:** Portrait-optimized, landscape acceptable
- **Font size:** Minimum 16px for body text

### 9.3 Producer Interface Requirements

- **Real-time updates:** All queues update without page refresh
- **Keyboard shortcuts:** Common actions (approve, reject, feature)
- **Bulk actions:** Select multiple items for batch operations
- **Undo:** 5-second undo window for destructive actions
- **Mobile support:** Usable on tablet (not optimized for phone)

### 9.4 A/V Tech Interface Requirements

- **Precision controls:** Sliders with numeric input option
- **Visual preview:** Real-time representation of display output
- **Performance visibility:** Always show system status
- **Quick actions:** One-click test mode, reset to defaults
- **Multi-monitor:** Works well with Tech on separate screen from display

### 9.5 Display Output Requirements

- **Transparency:** True CSS transparency, no baked alpha
- **Performance:** 60fps animation target
- **Resolution:** Crisp at 1080p, support up to 4K
- **No UI chrome:** No scrollbars, no selection highlights
- **Cursor:** Hidden on display page

---

## 10. Security & Privacy

### 10.1 Authentication Security

| Measure | Implementation |
|---------|----------------|
| **Password policy** | N/A (passwordless by default) |
| **Magic link expiry** | 15 minutes |
| **Session tokens** | JWT with 7-day refresh |
| **OAuth** | Standard OAuth 2.0 flow |
| **Rate limiting** | 5 login attempts per IP per minute |

### 10.2 Data Security

| Measure | Implementation |
|---------|----------------|
| **Encryption in transit** | TLS 1.3 required |
| **Encryption at rest** | AES-256 for database |
| **API authentication** | JWT Bearer tokens |
| **Input validation** | Server-side validation on all inputs |
| **XSS prevention** | Content Security Policy, output encoding |
| **SQL injection** | Parameterized queries only |

### 10.3 Audience Data

| Data Point | Stored | Purpose |
|------------|--------|---------|
| **Session token** | Yes | Identify returning participants |
| **IP address** | Yes (hashed) | Rate limiting, abuse prevention |
| **Nickname** | If provided | Display with Q&A, leaderboard |
| **Email** | If provided + enabled | Post-event follow-up (opt-in) |
| **Reactions** | Aggregated | Analytics only |
| **User agent** | Yes | Debugging, analytics |

### 10.4 Content Moderation

| Risk | Mitigation |
|------|------------|
| **Inappropriate content** | All user text requires approval before display |
| **Profanity** | Automatic flagging (not rejection) of flagged words |
| **Spam** | Rate limiting per session |
| **Abuse** | Session blocking, IP blocking if needed |

### 10.5 GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Consent** | Cookie consent banner; clear data usage explanation |
| **Data access** | Admin can export all org data |
| **Data deletion** | Admin can delete event data; auto-delete per retention policy |
| **Data portability** | Export to CSV/JSON |
| **Privacy policy** | Clear policy linked from all pages |

### 10.6 Data Retention

| Tier | Retention |
|------|-----------|
| **Per-event customers** | 90 days after event ends |
| **Subscription customers** | Until cancelled + 90 days |
| **Enterprise** | Configurable, default indefinite |

---

## 11. Accessibility

### 11.1 Standards

- **Target:** WCAG 2.1 Level AA
- **Testing:** Automated (axe) + manual screen reader testing

### 11.2 Audience Interface

| Requirement | Implementation |
|-------------|----------------|
| **Color contrast** | 4.5:1 minimum for text |
| **Focus indicators** | Visible focus rings on all interactive elements |
| **Touch targets** | 44×44px minimum |
| **Screen reader** | All actions announced; live regions for updates |
| **Motion** | Respect `prefers-reduced-motion` |
| **Text scaling** | Supports up to 200% zoom |

### 11.3 Control Interfaces

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard navigation** | Full keyboard access, logical tab order |
| **Screen reader** | Labels for all controls, status announcements |
| **Color independence** | Don't rely on color alone for information |

### 11.4 Display Output

| Requirement | Implementation |
|-------------|----------------|
| **Live captions** | Dedicated caption widget |
| **High contrast** | Option for high-contrast emoji/text backgrounds |
| **Reduced motion** | Option to disable animations |

---

## 12. Localization

### 12.1 Supported Languages (V1)

- English (default)
- French
- Spanish
- German

### 12.2 Implementation

| Component | Approach |
|-----------|----------|
| **UI strings** | i18n library (react-i18next) |
| **Date/time** | User locale formatting |
| **Numbers** | User locale formatting |
| **RTL** | CSS logical properties (future support) |

### 12.3 Content

- **Widget content** (poll questions, etc.) in event's chosen language
- **System messages** in audience's browser language
- **Admin interface** in user's chosen language

---

## 13. Analytics & Metrics

### 13.1 Real-Time Metrics (Producer Dashboard)

| Metric | Description |
|--------|-------------|
| **Connected audience** | Current WebSocket connections |
| **Reactions per minute** | Rolling 60-second count |
| **Reaction breakdown** | Count per emoji type |
| **Poll participation** | Votes / connected audience |
| **Q&A volume** | Submitted, pending, approved, featured |
| **Queue depth** | Emoji queue length |

### 13.2 Post-Event Analytics

| Metric | Description |
|--------|-------------|
| **Peak audience** | Maximum concurrent connections |
| **Total reactions** | Sum of all emoji reactions |
| **Reaction timeline** | Reactions over time (line chart) |
| **Poll results** | Final vote distribution per poll |
| **Q&A stats** | Total submitted, approved, featured |
| **Engagement rate** | (Participants who interacted / Total joined) |
| **Top moments** | Timestamps of surge events |

### 13.3 Export

- **Format:** CSV, JSON
- **Scope:** Per-event or date range
- **Contents:** Aggregated data only (no PII unless opted-in)

---

## 14. Pricing & Packaging

### 14.1 Tiers

#### Free Trial
- **Access:** 2-day trial per request
- **Limits:** 50 audience, core widgets
- **Branding:** "Powered by Event Interactions" watermark
- **Purpose:** Demo and evaluation

#### Per-Event Pricing

| Audience Size | Price |
|---------------|-------|
| Up to 100 | $79/event |
| Up to 500 | $199/event |
| Up to 1,000 | $399/event |
| 1,000+ | Custom quote |

#### Subscription Pricing

| Tier | Monthly Price | Audience Limit | Features |
|------|---------------|----------------|----------|
| **Starter** | $99 | 250/event | Core widgets, 2 team members |
| **Pro** | $249 | 1,000/event | All widgets, 10 team members, multi-display |
| **Enterprise** | $599+ | Unlimited | Custom branding, NDI, API, priority support |

### 14.2 Feature Matrix

| Feature | Trial | Starter | Pro | Enterprise |
|---------|-------|---------|-----|------------|
| Emoji Reactions | ✓ | ✓ | ✓ | ✓ |
| Polls | ✓ | ✓ | ✓ | ✓ |
| Q&A | ✓ | ✓ | ✓ | ✓ |
| Timer | ✓ | ✓ | ✓ | ✓ |
| Social Pop-ups | – | – | ✓ | ✓ |
| Quiz/Leaderboard | – | – | ✓ | ✓ |
| Live Captions | – | – | ✓ | ✓ |
| Multi-display | – | – | ✓ | ✓ |
| Custom emoji packs | – | – | – | ✓ |
| NDI output | – | – | – | ✓ |
| White label | – | – | – | ✓ |
| API access | – | – | – | ✓ |
| Priority support | – | – | – | ✓ |
| Data retention | 7 days | 90 days | 90 days | Custom |

---

## 15. Development Phases

### 15.1 MVP (Weeks 1–12)

#### Weeks 1–3: Foundation
- [ ] Project setup (React, Node.js, Socket.IO)
- [ ] Database schema and migrations
- [ ] Authentication (Supabase Auth)
- [ ] Organization and event CRUD
- [ ] Basic role-based access control

#### Weeks 4–5: Real-Time Infrastructure
- [ ] WebSocket server setup
- [ ] Room management per event
- [ ] Display page with transparent output
- [ ] Basic canvas rendering

#### Weeks 6–7: Emoji Reactions
- [ ] Audience emoji grid UI
- [ ] Server queue system (Redis)
- [ ] Display animation rendering
- [ ] Surge detection and animation
- [ ] A/V tech controls (size, position, cooldown)

#### Weeks 8–9: Polls & Q&A
- [ ] Poll creation and management
- [ ] Audience voting interface
- [ ] Poll results display
- [ ] Q&A submission and moderation
- [ ] Featured question display

#### Week 10: Timer & Multi-Display
- [ ] Countdown/timer widget
- [ ] Multi-display management
- [ ] Per-display settings and layout

#### Weeks 11–12: Control Panels & Polish
- [ ] Producer panel (complete)
- [ ] A/V Tech panel (complete)
- [ ] Admin panel (basic)
- [ ] Demo mode
- [ ] Testing and bug fixes

### 15.2 Fast Follow (Weeks 13–20)

#### Weeks 13–14: Social Pop-ups
- [ ] Submission interface
- [ ] Moderation workflow
- [ ] Display rendering

#### Weeks 15–16: Quiz/Leaderboard
- [ ] Quiz creation and management
- [ ] Timed question interface
- [ ] Scoring system
- [ ] Leaderboard display

#### Weeks 17–18: Live Captions
- [ ] Caption input endpoints
- [ ] Caption display widget
- [ ] Styling controls

#### Weeks 19–20: Analytics & Refinement
- [ ] Post-event analytics dashboard
- [ ] Data export
- [ ] Performance optimization
- [ ] User feedback incorporation

### 15.3 Phase 2 (Weeks 21–48)

- Decision Trees
- Threshold Triggers
- Word Cloud
- Lower Thirds
- NDI Desktop App
- Built-in speech-to-text
- AI sentiment features
- Stripe billing
- White label
- API access

---

## 16. Success Criteria

### 16.1 MVP Success Metrics

| Metric | Target |
|--------|--------|
| **Events run** | 10+ events using the platform |
| **Audience scale tested** | 500+ concurrent users |
| **Display reliability** | No visible errors during live events |
| **Latency** | <1 second reaction to display |
| **Critical bugs** | Zero critical bugs in production |

### 16.2 Business Success Metrics (Year 1)

| Metric | Target |
|--------|--------|
| **Paying customers** | 25+ |
| **ARR** | $12,000+ |
| **Customer satisfaction** | 8+ NPS |
| **Churn** | <5% monthly |

### 16.3 Technical Success Metrics

| Metric | Target |
|--------|--------|
| **Uptime** | 99.9% during events |
| **Page load (audience)** | <3 seconds on 3G |
| **WebSocket reconnection** | <5 seconds |
| **Animation framerate** | 60fps on modern hardware |

---

## 17. Open Questions

### 17.1 Product Questions

| Question | Status | Notes |
|----------|--------|-------|
| Custom emoji upload format? | Open | PNG, SVG, both? Size limits? |
| Quiz question types beyond multiple choice? | Open | True/false, ranking, open text? |
| Caption display modes? | Open | Rolling, replace, karaoke-style? |

### 17.2 Technical Questions

| Question | Status | Notes |
|----------|--------|-------|
| Redis hosting provider? | Open | Upstash, Redis Cloud, Railway Redis? |
| CDN for audience assets? | Open | Cloudflare, Vercel Edge? |
| Error monitoring tool? | Deferred | Sentry, LogRocket - add when customers |

### 17.3 Business Questions

| Question | Status | Notes |
|----------|--------|-------|
| Trial request workflow? | Open | Form? Email? Calendar booking? |
| Enterprise custom pricing? | Open | Base + per-seat? Base + usage? |
| Refund policy? | Open | Per-event refund if technical failure? |

---

## 18. Appendices

### 18.1 Glossary

| Term | Definition |
|------|------------|
| **Widget** | A modular engagement feature (polls, Q&A, reactions, etc.) |
| **Display** | An output destination configured for broadcast overlay |
| **Surge** | A spike in emoji reactions that triggers special animation |
| **Feature** (verb) | To show a selected Q&A question on display |
| **NDI** | Network Device Interface, a video-over-IP protocol |
| **Chroma key** | Using a solid color background for video compositing |

### 18.2 Competitive Reference

| Product | URL | Notes |
|---------|-----|-------|
| Slido | slido.com | Market leader, owned by Cisco |
| Mentimeter | mentimeter.com | Education-focused |
| Pigeonhole Live | pigeonholelive.com | Event-focused |
| Kahoot | kahoot.com | Quiz/game-focused |

### 18.3 Technical Reference

| Resource | URL |
|----------|-----|
| Socket.IO Docs | socket.io/docs |
| Supabase Auth | supabase.com/docs/auth |
| React | react.dev |
| Redis Commands | redis.io/commands |

### 18.4 Design Reference

| Inspiration | Aspect |
|-------------|--------|
| TikTok Live | Emoji reaction flow and animation |
| Instagram Stories | Poll UX and visual design |
| Kahoot | Quiz countdown and leaderboard energy |
| Zoom Reactions | Reaction button layout |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | [Your Name] | Initial PRD |

---

*This document is a living specification. Update as decisions are made and requirements evolve.*