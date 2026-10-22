# Agent instructions

Before planning or writing code, read everything in `knowledge/`, especially `idea.md` and `judging.md`.

- Optimise for a working, reliable 3-minute live demo by code freeze. Cut anything not in the demo.
- Prefer Supabase for backend (auth, Postgres, realtime, vector search) and Cognee for community memory where it fits.
- Keep commits small and descriptive: "how much Grok Bot and Cursor architected it" is a judging criterion, so the history is evidence.
- Never commit secrets. Keys go in `.env` (gitignored); document required vars in `.env.example`.

## UI and build rules (Francesco, 22 Oct)
- Light theme only. No dark colours or dark mode. Match docs/lumap-mockup.jpg.
- Build UI from component libraries: shadcn/ui as the base, Magic UI or Aceternity UI for showy pieces, Framer Motion (motion) for animation, lucide-react for icons. Don't hand-roll components that a library already provides.
- Do not write or run tests. Verify by looking at the running app.

