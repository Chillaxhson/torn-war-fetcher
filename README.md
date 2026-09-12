# Torn War & Elimination Target Fetcher

A fast, tactical, real-time target fetcher and battle assistant for Torn City. Built with TypeScript, Lit Web Components, and Node.js.

## Features

- **Revamped Tactical Dark UI**: Clean, responsive layout with high-contrast status colors, pulsating alerts, and audio alarms.
- **Dual-Mode Tabs**:
  - **War Targets**: Track opposing faction members in real-time. Highlights attackable members (`Okay`), hospital exit countdowns, traveling/abroad destinations, and active status (`Online` / `Idle` / `Offline`).
  - **Elimination Targets**: Built specifically for the annual **Torn Elimination** event. Scoped directly to the opposing faction so you can hunt enemy elimination teams within that faction!
- **Fair Fight (FF) Filtering**:
  - Automatically calculates Fair Fight ratio (`1 + 2.67 * sqrt(Target_BS / Your_BS)`) for each target.
  - Difficulty bands: **Easy** (FF &le; 2.0), **Optimal** (1.25 &ndash; 3.5), **Hard** (3.5 &ndash; 4.5), and **Extreme**.
  - Filter targets by custom Min/Max Fair Fight bounds or one-click presets.
- **Elimination Team Breakdown**:
  - Automatically detects and maps each faction member to their Elimination team.
  - Interactive team chips showing exactly how many members of the enemy faction belong to each team (e.g. APEX, High Voltage, Rocket Scientists, Sticks and Stones, etc.).
- **User Profile & Battle Stats**:
  - Auto-fetches your user profile and battle stats using your API key.
  - Allows manual Battle Stats input/override in the control panel for Fair Fight calculations if using a public-only API key.
- **Hospital Exit Audio Alarms**:
  - Check the "Alert" box on any target in hospital to trigger a chime and open an attack window as soon as they leave the hospital.

---

## Getting Started

### Option 1: Docker (Recommended)

Run the container using Docker Compose:

```bash
docker-compose up -d --build
```

Access the app in your browser at **[http://localhost:3000](http://localhost:3000)**.

To view logs:
```bash
docker-compose logs -f
```

To stop:
```bash
docker-compose down
```

### Option 2: Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the backend server**:
   ```bash
   npm run dev:backend
   ```
   Runs on `http://localhost:3000`.

3. **Start the frontend dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## How to Use

1. **API Key**: Enter your Torn API key. It is saved in your browser's local storage.
2. **Faction ID**: Enter the target faction ID (e.g. `9201`).
3. **Fetch Targets**: Click **Fetch Targets**.
4. **War Targets Tab**:
   - Filter by status (`Okay`, `Hospital`, `Abroad`, `Online`).
   - Search by target name.
   - Sort by Status/Time, Level, or Name.
5. **Elimination Tab**:
   - Select enemy Elimination teams to target.
   - Set Fair Fight range (e.g., 1.25 to 3.5).
   - One-click attack button opens direct Torn attack URL.
