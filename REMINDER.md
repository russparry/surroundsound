Please turn off all psychofanticism

Product Requirements Document (PRD)

Product Name: SyncSound (working title)
Author: Russell Parry
Date: 2025-11-05

1. Purpose / Problem Statement

Currently, if multiple people want to play the same song on different devices to create a shared listening experience, they must manually press play at the exact same time. This is difficult, prone to timing errors, and prevents a true “surround sound” effect using personal device speakers.

Goal: Build a web-based system that synchronizes music playback across multiple Spotify accounts and devices with millisecond accuracy, without requiring any hardware changes.

Why This Idea Works:

✅ Each friend has their own Spotify account → bypasses the single-device limitation.

✅ Programmatic control → the Spotify Web Playback SDK allows seeking to exact positions and triggering play simultaneously.

✅ Network sync → WebSockets can coordinate playback across devices in real time.

✅ Web-based → no app installation needed; users just open a URL.

This is a brilliant, feasible solution to a real problem that requires no hardware changes.

2. Use Case / Scenario

Scenario: Five friends want to play the same song simultaneously across their phones to simulate a surround sound experience.

Problem Today: Users have to press play manually on each device, often causing delays and desynchronized playback.

Solution: SyncSound allows all devices to play a selected track at the same time and track position, periodically correcting for drift.

3. Features / Functional Requirements
Feature	Description	Priority
Listening Room Creation	Host creates a room and receives a unique room code	High
Room Join	Friends join the room using the code and authenticate via Spotify OAuth	High
Song Selection	Host selects a song to play	High
Synchronized Playback	Playback starts at the exact same time and track position on all devices	High
Drift Correction	Devices periodically re-sync every 2 seconds to account for latency/drift	High
Manual Offset Adjustment	Optional feature for devices with inherent audio delay (e.g., Bluetooth)	Medium
Network Countdown	Countdown before playback to minimize initial latency	Medium
Playback Control	Host can pause/skip/seek; commands are broadcast to all devices	High
Premium Requirement UI	Clear indication that Spotify Premium is required for playback	Medium
4. Technical Architecture
[Host Device]
      ↓ (controls playback commands)
[Vercel Backend + WebSocket Server]
      ↓ (broadcasts playback commands)
[Friend Device 1] [Friend Device 2] ... [Friend Device N]


Sync Algorithm (Simplified):

setInterval(() => {
    const drift = Math.abs(myPosition - hostPosition);
    if (drift > 100) {  // milliseconds
        player.seek(hostPosition);
    }
}, 2000);

5. User Flow

Host Device: Create a listening room → receives room code.

Friend Devices: Enter room code → authenticate with Spotify.

Host Device: Selects a song.

Host Device: Presses “Play” → WebSocket sends {action: 'play', trackId: 'xyz', position: 0} to all devices.

All Devices: Play track at exact position, periodically check and correct drift.

Host Controls: Can pause, skip, or seek; updates propagate to all devices.

6. Technical Stack

Frontend: Next.js + React

Real-Time Sync: Pusher Channels (free tier), Ably, or Socket.io

Backend: Vercel serverless functions

Authentication: Spotify OAuth

Deployment: Vercel

7. Challenges & Solutions
Challenge	Solution
Network latency	Use countdown before playback (3…2…1…Play!)
Audio drift over time	Periodic re-sync every 2-5 seconds
Different device latencies	Manual offset adjustment per device
All users require Spotify Premium	Display clear requirement in UI
Bluetooth speaker delay	Detect and warn about Bluetooth or allow custom offset
8. Success Metrics

Technical: Playback drift ≤ 100ms after sync correction.

User: 90% of users report a “surround sound-like” experience in testing.

Adoption: At least 5 devices reliably connected in a single room without errors.



Other previous prompts:

 What You Want (The Right Approach)

  - Host: Uses YOUR Spotify Premium account + YOUR token
  - Guest 1: Uses THEIR Spotify Premium account + THEIR token
  - Guest 2: Uses THEIR Spotify Premium account + THEIR token
  - When guest joins: Their Spotify player automatically syncs to play the same song at the same timestamp as the host

here is the web playback sdk website with how to and instructions: https://developer.spotify.com/documentation/web-playback-sdk. 
here is the spotify web api with instructions: https://developer.spotify.com/documentation/web-api
