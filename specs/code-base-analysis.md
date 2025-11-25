# SyncSound Codebase Analysis

**Last Updated:** 2025-11-23
**Project Name:** SyncSound (Surroundsound)
**Total Lines of Code:** ~1,527 lines (excluding dependencies)

**Recent Changes:** Complete UI redesign implemented (Nov 23) with glassmorphism design, gradient backgrounds, and enhanced user experience. Line count increased from 1,330 to 1,527 lines.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Architecture Overview](#architecture-overview)
5. [Code Statistics](#code-statistics)
6. [Technology Stack](#technology-stack)

---

## Project Overview

**What is SyncSound?**

SyncSound is a web application that synchronizes music playback across multiple Spotify accounts and devices with millisecond accuracy. It allows friends to play the same song at the exact same time on their own devices, creating a "surround sound" effect using personal device speakers.

**Key Concept:** Each person uses their own Spotify Premium account, and the app coordinates playback timing across all devices using WebSocket communication.

---

## Directory Structure

```
surroundsound/
├── .claude/                  # Claude Code settings
├── .git/                     # Git version control
├── .next/                    # Next.js build output (auto-generated)
├── node_modules/             # External dependencies (auto-generated)
├── app/                      # Frontend pages (Next.js App Router)
│   ├── auth/                 # OAuth callback page
│   ├── room/[code]/          # Dynamic room pages
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout component
│   └── page.tsx              # Home/landing page
├── components/               # Reusable React components
├── contexts/                 # React Context providers (state management)
├── lib/                      # Utility functions and libraries
├── server.js                 # WebSocket server (Node.js backend)
└── [config files]            # TypeScript, Next.js, and deployment configs
```

### Directory Purposes Explained

| Directory | Purpose | For Beginners |
|-----------|---------|---------------|
| **app/** | Contains all the pages users see in their browser | Think of this as your website's "pages" folder |
| **components/** | Reusable UI pieces (like building blocks) | Like LEGO pieces you can use multiple times |
| **contexts/** | Manages app-wide data (like login status, socket connection) | Global storage that any page can access |
| **lib/** | Helper functions and utilities | Your toolbox of useful functions |
| **server.js** | The backend server that coordinates all devices | The "conductor" that keeps everyone in sync |
| **.next/** | Build output (ignore this) | Auto-generated, like compiled code |
| **node_modules/** | External libraries (ignore this) | Like importing other people's code |

---

## File-by-File Breakdown

### 🎨 Frontend Files (What Users See)

#### **app/page.tsx** (181 lines)
- **Role:** Landing page with "Login with Spotify" button
- **What it does:** First page users see; handles OAuth login flow
- **Key features:**
  - Login with Spotify button
  - Create room functionality
  - Join room functionality
  - Uses Spotify OAuth (PKCE flow)
- **Beginner explanation:** This is like your website's home page where users can log in

#### **app/auth/page.tsx** (54 lines)
- **Role:** OAuth callback handler
- **What it does:** Receives authorization code from Spotify after login
- **Key features:**
  - Exchanges authorization code for access token
  - Stores token in SpotifyContext
  - Redirects back to home page
- **Beginner explanation:** This is the "thank you for logging in" page that Spotify redirects to

#### **app/room/[code]/page.tsx** (727 lines) ⭐ **LARGEST FILE**
- **Role:** Main room interface where music playback happens
- **What it does:**
  - Displays current song playing
  - Shows countdown before playback starts
  - Shows real-time timestamp in milliseconds
  - Handles synchronized playback across all devices
  - Lets host search and select songs
- **Key features:**
  - Spotify Web Playback SDK integration
  - WebSocket communication for sync
  - Countdown display (2...1...)
  - Playback position tracking
  - Drift correction (re-syncing devices)
  - Safari autoplay handling
- **Beginner explanation:** This is the "main app" where all the magic happens - the room where everyone listens together

#### **app/layout.tsx** (24 lines)
- **Role:** Root layout that wraps all pages
- **What it does:** Provides consistent structure and context providers to entire app
- **Key features:**
  - Loads fonts
  - Wraps app in SpotifyContext and SocketContext
  - Sets up global metadata
- **Beginner explanation:** Like a frame that goes around every page in your app

#### **app/globals.css** (19 lines)
- **Role:** Global CSS styles
- **What it does:** Sets up Tailwind CSS utility classes
- **Beginner explanation:** The styling rules that apply to your whole website

---

### 🔌 Context Providers (State Management)

#### **contexts/SpotifyContext.tsx** (56 lines)
- **Role:** Manages Spotify authentication state
- **What it does:**
  - Stores access token
  - Provides authentication status
  - Makes auth info available to all components
- **Why it exists:** So any page can check "is the user logged in?"
- **Beginner explanation:** Like a global variable that remembers if you're logged into Spotify

#### **contexts/SocketContext.tsx** (52 lines)
- **Role:** Manages WebSocket connection
- **What it does:**
  - Connects to WebSocket server
  - Provides socket instance to all components
  - Shows connection status
- **Why it exists:** So all devices can talk to the server in real-time
- **Beginner explanation:** Like a phone line that keeps all devices connected

---

### 🧩 Reusable Components

#### **components/Providers.tsx** (15 lines)
- **Role:** Wrapper component that combines all context providers
- **What it does:** Makes code cleaner by grouping providers
- **Beginner explanation:** A helper that bundles all the "global stuff" together

---

### 🛠️ Utility Libraries

#### **lib/spotify.ts** (106 lines)
- **Role:** Spotify OAuth utilities
- **What it does:**
  - Generates authorization URL for login
  - Implements PKCE (Proof Key for Code Exchange) flow
  - Exchanges authorization codes for access tokens
  - Refreshes expired tokens
- **Key functions:**
  - `redirectToSpotifyAuthorize()` - Starts login flow
  - `getAccessToken()` - Gets token after login
  - `refreshAccessToken()` - Renews expired tokens
- **Beginner explanation:** Your Spotify login toolkit - handles all the "log in with Spotify" stuff

---

### 🖥️ Backend Files

#### **server.js** (188 lines) ⭐ **BACKEND SERVER**
- **Role:** Node.js WebSocket server
- **What it does:**
  - Runs the Next.js app
  - Manages WebSocket connections
  - Coordinates playback across all devices
  - Stores active rooms in memory
- **Key features:**
  - Room creation and joining
  - Broadcasting play/pause/seek commands
  - Position sync updates
  - Host-only controls
  - Member count tracking
- **Socket events:**
  - `create-room` - Host creates a room
  - `join-room` - Guest joins a room
  - `play-track` - Host plays a song (broadcasts to everyone)
  - `pause` - Host pauses
  - `resume` - Host resumes
  - `position-update` - Host sends position for drift correction
- **Beginner explanation:** This is the "brain" that keeps all devices synchronized - like a conductor leading an orchestra

---

### ⚙️ Configuration Files

#### **package.json** (32 lines)
- **Role:** Project dependencies and scripts
- **What it does:** Lists all external libraries and defines commands
- **Key scripts:**
  - `npm run dev` - Start development server
  - `npm run build` - Build for production
  - `npm start` - Run production server
- **Key dependencies:**
  - `next` - React framework
  - `socket.io` - WebSocket library (server + client)
  - `@spotify/web-api-ts-sdk` - Spotify API helper
  - `tailwindcss` - CSS styling
- **Beginner explanation:** Your project's shopping list and instruction manual

#### **tsconfig.json** (41 lines)
- **Role:** TypeScript configuration
- **What it does:** Tells TypeScript how to compile your code
- **Beginner explanation:** Settings for how TypeScript checks your code for errors

#### **next.config.ts** (7 lines)
- **Role:** Next.js configuration
- **What it does:** Configures Next.js framework settings
- **Beginner explanation:** Settings for how Next.js builds your website

#### **next-env.d.ts** (6 lines)
- **Role:** TypeScript definitions for Next.js
- **What it does:** Auto-generated type definitions
- **Beginner explanation:** Auto-generated, ignore this file

#### **.env.local** & **.env.example**
- **Role:** Environment variables (secrets and config)
- **What they contain:**
  - `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` - Your Spotify app ID
  - `NEXT_PUBLIC_REDIRECT_URI` - Where Spotify redirects after login
  - `NEXT_PUBLIC_APP_URL` - Your deployed app URL
- **Beginner explanation:** Like a settings file with passwords and API keys (never commit .env.local!)

#### **.gitignore**
- **Role:** Tells Git what files to ignore
- **What it does:** Prevents committing secrets, dependencies, and build files
- **Beginner explanation:** "Don't upload these files to GitHub" list

---

### 📄 Documentation Files

- **REMINDER.md** - Product requirements document (PRD)
- **QUICKSTART_OAUTH.md** - OAuth setup instructions
- **HOW_IT_WORKS.md** - Technical explanation
- **TESTING_GUIDE.md** - How to test the app
- **ANSWERS_TO_YOUR_QUESTIONS.md** - FAQ
- **instruciones.md** - This analysis request

---

## Architecture Overview

### 🏗️ High-Level Architecture

```
┌─────────────────┐
│   User Browser  │
│   (React App)   │
└────────┬────────┘
         │
         │ HTTP (Pages)
         ↓
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         │ WebSocket
         ↓
┌─────────────────┐      ┌──────────────────┐
│  Socket.io      │←────→│  Spotify Web     │
│  Server         │      │  Playback SDK    │
│  (server.js)    │      │  (in browser)    │
└─────────────────┘      └──────────────────┘
         │
         │ Broadcasts
         ↓
┌─────────────────┐
│  All Connected  │
│  Devices        │
└─────────────────┘
```

### How Data Flows

1. **User logs in** → OAuth flow (lib/spotify.ts) → Access token stored (SpotifyContext)
2. **User creates/joins room** → Socket.io connection (server.js) → Room data stored in memory
3. **Host selects song** → Sends to server → Server broadcasts to all devices
4. **All devices start countdown** → Wait until exact `startTime` → Play simultaneously
5. **Drift correction** → Host sends position every 1.5s → Guests re-sync if drift > 75ms

---

## Code Statistics

### Lines of Code by File

| File | Lines | Category | Complexity |
|------|-------|----------|------------|
| **app/room/[code]/page.tsx** | 727 | Frontend | ⭐⭐⭐⭐⭐ High |
| **server.js** | 188 | Backend | ⭐⭐⭐⭐ Medium-High |
| **app/page.tsx** | 181 | Frontend | ⭐⭐⭐ Medium |
| **lib/spotify.ts** | 106 | Utility | ⭐⭐⭐ Medium |
| **contexts/SpotifyContext.tsx** | 56 | State | ⭐⭐ Low-Medium |
| **app/auth/page.tsx** | 54 | Frontend | ⭐⭐ Low-Medium |
| **contexts/SocketContext.tsx** | 52 | State | ⭐⭐ Low-Medium |
| **app/layout.tsx** | 24 | Frontend | ⭐ Low |
| **app/globals.css** | 19 | Styles | ⭐ Low |
| **components/Providers.tsx** | 15 | Component | ⭐ Low |
| **Configuration files** | ~113 | Config | ⭐ Low |
| **TOTAL** | ~1,527 | - | - |

### Breakdown by Category

```
Frontend (React/Next.js):    ~1,100 lines (72%)
Backend (Node.js/Socket.io):   ~188 lines (12%)
Utilities/Libraries:           ~106 lines (7%)
State Management:              ~108 lines (7%)
Configuration:                 ~113 lines (7%)
Styling:                        ~19 lines (1%)
```

### File Type Distribution

```
TypeScript (.tsx):  ~1,047 lines (69%)
JavaScript (.js):     ~188 lines (12%)
TypeScript (.ts):     ~106 lines (7%)
Config (.json):       ~113 lines (7%)
CSS (.css):            ~19 lines (1%)
```

---

## Technology Stack

### Frontend Technologies

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **Next.js 16** | React framework | Server-side rendering, routing, modern features |
| **React 19** | UI library | Component-based UI, state management |
| **TypeScript** | Type-safe JavaScript | Catches errors before runtime |
| **Tailwind CSS 4** | Styling | Utility-first CSS, fast styling |
| **Socket.io Client** | WebSocket client | Real-time communication with server |
| **Spotify Web Playback SDK** | Music playback | Browser-based Spotify player |
| **@spotify/web-api-ts-sdk** | Spotify API | Search songs, control playback |

### Backend Technologies

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **Node.js** | JavaScript runtime | Run server-side JavaScript |
| **Socket.io Server** | WebSocket server | Real-time bidirectional communication |
| **Next.js API** | HTTP server | Serve React pages |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Git** | Version control |
| **npm** | Package manager |
| **Claude Code** | AI development assistant |

### Deployment

| Service | Purpose |
|---------|---------|
| **Render** | Cloud hosting (supports WebSocket) |
| **GitHub** | Code repository |

---

## Key Concepts for Beginners

### 1. **Frontend vs Backend**

- **Frontend** = What users see and interact with (the browser)
- **Backend** = The server that coordinates everything (server.js)
- In this app: Frontend runs in user's browser, backend runs on Render

### 2. **React Components**

- Components are reusable UI pieces
- Example: `<button>` could be a component you use everywhere
- Written as functions that return JSX (HTML-like syntax)

### 3. **TypeScript**

- JavaScript with type checking
- Example: `const name: string = "Russell"` - TypeScript knows `name` must be text
- Helps catch bugs before code runs

### 4. **WebSockets**

- Like a phone call that stays open (vs HTTP which is like sending letters)
- Allows server to send messages to clients instantly
- Critical for real-time sync

### 5. **Context (React)**

- Global state that any component can access
- Example: SpotifyContext stores login status
- Avoids passing data through many components

### 6. **OAuth**

- Secure way to log in with another service (Spotify)
- User gives permission, app gets access token
- Token proves "this user is logged in"

### 7. **API**

- Application Programming Interface
- Way for programs to talk to each other
- Example: Spotify API lets us search songs, control playback

---

## How the Sync Works (Simplified)

1. **Host clicks "Play"**
   - Calculates `startTime = now + 2 seconds`
   - Sends to server with song info

2. **Server broadcasts to everyone**
   - All devices receive: `{trackUri, startTime}`
   - Includes host's device

3. **All devices show countdown**
   - Calculate how long to wait: `waitTime = startTime - now`
   - Show "2...1..." countdown
   - Wait until EXACT `startTime`

4. **All devices start simultaneously**
   - At the exact millisecond of `startTime`, call Spotify API to play
   - Should be perfectly synchronized

5. **Drift correction (ongoing)**
   - Every 1.5 seconds, host sends current position
   - Guests check their position vs host
   - If drift > 75ms, seek to correct position
   - Prevents gradual desync over time

---

## Common Issues and Where to Look

| Problem | Where to Look | File |
|---------|---------------|------|
| Login not working | OAuth flow | lib/spotify.ts, app/auth/page.tsx |
| Can't create/join room | WebSocket connection | server.js, contexts/SocketContext.tsx |
| Song won't play | Playback logic | app/room/[code]/page.tsx (line 251+) |
| Devices out of sync | Countdown/drift correction | app/room/[code]/page.tsx (line 267-367) |
| Safari audio blocked | Autoplay handling | app/room/[code]/page.tsx (line 527-544) |
| Build errors | TypeScript/config | tsconfig.json, next.config.ts |

---

## Next Steps for Learning

### Beginner Track
1. Start with **app/page.tsx** - understand the home page
2. Read **lib/spotify.ts** - see how login works
3. Study **contexts/SpotifyContext.tsx** - learn about state management
4. Explore **server.js** - understand WebSocket basics

### Intermediate Track
1. Study **app/room/[code]/page.tsx** - understand the main app logic
2. Learn how WebSocket events work (create-room, play-track, etc.)
3. Understand the countdown and sync algorithm
4. Read about Spotify Web Playback SDK

### Advanced Track
1. Optimize drift correction algorithm
2. Add features (queue, volume control, etc.)
3. Implement token refresh logic
4. Add database for persistent rooms
5. Deploy with custom domain

---

## Glossary

- **WebSocket**: Two-way communication channel between browser and server
- **OAuth**: Authorization protocol for secure login
- **PKCE**: Proof Key for Code Exchange - secure OAuth for public apps
- **SDK**: Software Development Kit - pre-built tools from Spotify
- **API**: Application Programming Interface - way to interact with Spotify services
- **Drift**: When devices gradually get out of sync over time
- **Context**: React pattern for sharing state across components
- **Component**: Reusable piece of UI
- **Hook**: React function that adds functionality (useState, useEffect, etc.)
- **TypeScript**: JavaScript with type checking
- **Next.js**: React framework with routing and server features
- **Render**: Cloud platform for deploying apps
- **Socket.io**: Library for WebSocket communication
- **Tailwind**: Utility-first CSS framework

---

**Questions?** Check the other documentation files:
- QUICKSTART_OAUTH.md for setup
- HOW_IT_WORKS.md for technical details
- TESTING_GUIDE.md for testing instructions
