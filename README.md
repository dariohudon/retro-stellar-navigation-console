# Retro Stellar Navigation Console

A self-hosted mission-control style solar system dashboard built with Next.js, React, and NASA/JPL data sources.

This is not a traditional astronomy viewer. It is a cinematic Space Command Centre: tactical navigation, live planetary positions, Near-Earth Object tracking, sector mapping, and retro HUD visuals.

---

## Core Features

- 2D tactical solar system map
- Live planetary positioning via NASA/JPL Horizons
- Schematic and Live display modes
- Sector navigation:
  - Inner System
  - Asteroid Belt
  - Outer Planets
  - Kuiper Belt
  - Deep System
- Moons, dwarf planets, and trans-Neptunian objects
- Near-Earth Object Threat Console using NASA NeoWs
- Target Data panel with live/static/fallback status
- Retro white phosphor HUD with green active-state highlights
- Self-hosted deployment using PM2 + Cloudflare Tunnel

---

## Tech Stack

- Next.js
- React
- TypeScript
- SVG tactical map rendering
- NASA/JPL Horizons
- NASA NeoWs
- PM2
- Cloudflare Tunnel

---

## Live Data Sources

### Ephemeris

Planetary live-position data comes from:

- NASA/JPL Horizons

Used for:
- current planetary positions
- heliocentric/ecliptic coordinates
- live mode display

---

### Near-Earth Objects

NEO data comes from:

- NASA Near Earth Object Web Service (NeoWs)

Used for:
- close approach date
- miss distance
- velocity
- estimated diameter
- potentially hazardous flag

---

## Environment Variables

Create local environment file:

```bash
nano .env.local
