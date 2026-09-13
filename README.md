# UK Railways 3D Map

A three.js 3D map of the UK railway network rendered with Vite + TypeScript.

- 89 cities + 339 waypoint stations
- 132 rail lines (main intercity + regional + London metro)
- 40+ motorways / A-roads (toggleable overlay)
- Live data from Huxley2 (National Rail Open Data proxy, CORS-enabled)
- Animated 3D trains moving along each line on a wall-clock-driven schedule
- Hover tooltips for cities, trains, and individual rail line tubes

## Run locally

```bash
npm install
npm run dev          # → http://localhost:5174
npm run build        # → dist/
npm run preview
```

## Files

- `src/main.ts` — orchestrator
- `src/scene/world.ts` — renderer / camera / OrbitControls
- `src/scene/land.ts` — extruded British Isles
- `src/scene/network.ts` — rail tubes (dashed) + road bars
- `src/scene/trains.ts` — animated 3D loco + carriages
- `src/scene/stations.ts` — 3D pillars + caps
- `src/livedata.ts` — Huxley2 live data fetch
- `src/labels.ts` — HTML overlay labels for cities / trains
- `src/data/*.ts` — cities, lines, motorways, operator liveries

## Live data

The app polls `https://huxley2.azurewebsites.net/departures/<CRS>/8` every minute
for 15 major terminus stations. If the API is down, the panel shows "Simulated"
and trains follow a generated timetable tied to wall-clock time.