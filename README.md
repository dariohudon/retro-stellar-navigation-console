# Retro Stellar Navigation Console

A self-hosted mission-control style solar system dashboard built with Next.js, React, and NASA/JPL live astronomy data.

This is not a traditional astronomy viewer.

It is a cinematic **Space Command Centre** — built for tactical navigation, live planetary positioning, Near-Earth Object tracking, sector mapping, and retro HUD visualization.

The goal is:

**NASA + sci-fi cinema + tactical systems design**

—not—

generic astronomy dashboard software

Retro Stellar is designed to feel like a real navigation console: part observatory, part mission control, part orbital intelligence system.

---

## Core Features

- 2D tactical solar system map
- Optional 3D orbital visualization mode
- Live planetary positioning via NASA/JPL Horizons
- Schematic + Live display modes
- Sector navigation:
  - Inner System
  - Asteroid Belt
  - Outer Planets
  - Kuiper Belt
  - Deep System
- Moons, dwarf planets, and trans-Neptunian objects
- Live secondary body tracking (Pluto + Ceres)
- Near-Earth Object Threat Console using NASA NeoWs
- Target Data panel with LIVE / CACHE / FALLBACK visibility
- Tactical object selection + target lock system
- Retro white phosphor HUD with green active-state highlights
- Self-hosted deployment using PM2 + Cloudflare Tunnel

---

## Interface Preview

### Tactical Navigation Console

![Retro Stellar Navigation Console Screenshot 1](https://i.imgur.com/kygXqnn.png)

### 3D View

![Retro Stellar Navigation Console Screenshot 2](https://i.imgur.com/82HL44T.png)

### NEO Threat Console

![Retro Stellar Navigation Console Screenshot 3](https://i.imgur.com/jzD20at.jpg)

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

## Live Data Architecture

### Lane 1 — Planetary Ephemeris

**Endpoint:** `/api/ephemeris`

Provides live positioning for the 8 major planets:

- Mercury
- Venus
- Earth
- Mars
- Jupiter
- Saturn
- Uranus
- Neptune

Data includes:

- heliocentric X / Y / Z coordinates
- distance from the Sun (AU)
- live angular position (`angleDeg`)
- timestamp
- source attribution
- cache/fallback state
- reference frame metadata

Reference frame:

**ECL J2000 (heliocentric ecliptic)**

This replaced the earlier default ICRF frame and corrected orbital accuracy for true heliocentric ecliptic positioning.

Examples:

- Earth correctly resolves near Z ≈ 0 AU
- planetary angles reflect true heliocentric ecliptic longitude

---

### Lane 2 — Near-Earth Objects (NEO)

**Endpoint:** `/api/neo`

Uses NASA Near Earth Object Web Service (NeoWs) for:

- close approach date
- miss distance
- velocity
- estimated diameter
- potentially hazardous flag
- closest-pass summaries

Important rule:

NASA NeoWs does **not** provide exact cinematic trajectories.

Allowed:

- encounter rings
- schematic approach vectors
- closest-pass indicators
- Earth proximity visuals

Forbidden:

- fake exact trajectories
- exaggerated threat implications
- false scientific claims

All vectors remain labeled:

**SCHEMATIC APPROACH VECTOR**

---

### Lane 2.5 — Live Secondary Bodies

**Endpoint:** `/api/ephemeris/extended`

Provides live JPL Horizons positioning for:

### Dwarf Planets

- Pluto
- Ceres

### Major Moons

- Io
- Europa
- Ganymede
- Callisto
- Titan
- Triton

### Parentless Bodies

Pluto and Ceres use:

- live JPL angular position
- schematic orbit radius

This preserves real directional accuracy while keeping the tactical map intentionally not-to-scale and visually readable.

### Moons

Moons remain visually schematic on the main orbital map.

Reason:

Heliocentric moon positions from JPL are nearly coincident with their parent planets and would visually stack directly on top of their parent worlds.

Instead:

- moons retain schematic placement
- live ephemeris supports detail panels
- future mission layers may expand this further

---

## Data Integrity Rules

The project never presents schematic visuals as scientific truth.

Required visible labels include:

- LIVE DATA
- SCHEMATIC
- CACHE
- FALLBACK
- NASA/JPL Horizons

Core architectural rule:

**Never imply precision where precision does not exist.**

---

## Environment Variables

Create a local environment file:

```bash
nano .env.local
