# Station Planner for X4: Foundations and Star Wars Interworlds

> Fair warning: vibe coded slop ahead.

A browser-based station planner for [**X4: Foundations**](https://www.egosoft.com/games/x4/info_en.php) (all DLCs) and the [**Star Wars Interworlds**](https://www.nexusmods.com/x4foundations/mods/349) mod. Design logistics networks by placing stations on a canvas, drilling into them to configure production modules, and connecting stations via resource flows. The focus is on balancing station I/O, sunlight modifiers, and habitat productivity boosts — not profit calculations (yet).

All data stays client-side in localStorage. Plans can be exported and imported as base64-encoded JSON.

**[Try it out](https://dwats.github.io/Station-Planner-For-X4-Foundations/)**

## How It Works

The planner uses a two-level canvas:

- **Sector view** — Place stations and sectors, connect them with resource flow edges.
- **Station view** — Double-click a station to drill in and configure its production modules.

## Tips and Tricks

- Click the **SWI** badge in the title bar to swap between the base game and SWI mod.
- **Undo/Redo:** `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`
- Double-click (or drag a connection from) an input or output ware on a production module to automatically add and wire up a matching module.
- Stations inherit the sunlight value of the sector they're placed in.

## Tech Stack

React 18, TypeScript, Vite, React Flow, Zustand, Tailwind CSS. Deployed to GitHub Pages.

## Development

```bash
npm install
npm run dev       # Start dev server
npm run build     # Production build (includes type checking)
npm run parse     # Regenerate gamedata.json from raw game data
```

## Contributing

Contributions and issues are welcome. No formal process yet — just open a PR or file an issue and I'll get to it when I can.
