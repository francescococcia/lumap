# Agent instructions

Event: **Encode London Hackathon 2026**. Before planning or writing code, read:
- `knowledge/encode-london.md`: the plan, the build order (cards E1–E8, M1, D1), the demo script, the checklists
- `knowledge/sponsors-fit.md`: bounties, criteria, credits, gates
- `knowledge/event.md`: schedule, checkpoints, judges

## Deadlines (Sunday times are GMT; clocks go back at 02:00 Sun)
- Feature freeze **Sun 10:30** · video by 11:30 · submit **Sun 12:00** (no late entries)
- After the freeze: only fixes to the demo path.

## Build rules
- Optimise for a working, reliable 3-minute live demo on real inputs. Cut anything not in the demo script.
- Encode features must be new code written after Fri 23 Oct 17:00 BST. Don't present pre-Encode code as Encode work.
- Supabase stays the backend for venues, auth and vouching. New Encode data goes to the access store chosen in E1 (Atlas or Supabase).
- Honesty: every AI access claim carries `{value, confidence, evidence, source}`; unclear input means "not sure". Never say a venue is "accessible" or "free".
- Privacy: blur faces/plates and strip EXIF before upload; don't store user locations; email only to the demo inbox, never to real venue contacts.
- Keep commits small and descriptive, with the card id (e.g. `E3: access read`).
- Never commit secrets. Keys go in `.env` (gitignored); document new vars in `.env.example`.

## Gemini API (when a card uses Gemini)
- SDK: `@google/genai@latest` (or `google-genai>=2.3.0` in Python). Use the Interactions API, `client.interactions.create`.
- `gemini-4-argon`: use `thinking_level`, not `thinking_budget`; no `temperature`, `top_p`, `top_k` or explicit `cached_content`; use `background=True` beyond 65,536 tokens.
- Companion models allowed, e.g. `gemini-3.8-flash` for fast reads.
- Skills: `npx skills add google-gemini/gemini-skills --skill gemini-api-dev`.
- Key: `GEMINI_API_KEY` in `.env`, server routes only.

## UI rules (Francesco)
- Light theme only. No dark colours or dark mode. Match `docs/lumap-mockup.jpg` (off-white #FAFAF7, white cards, violet #7C5CFF accent, mint/amber pin states).
- Build UI from component libraries: shadcn/ui as the base, Magic UI or Aceternity UI for showy pieces, Framer Motion (`motion`) for animation, lucide-react for icons. Don't hand-roll components that a library already provides.
- Do not write or run tests. Verify by looking at the running app.

## Working in small chunks (every agent: Cursor, Codex, others)
- The build queue is the build order table in `knowledge/encode-london.md` §3. Do ONLY the card id you were given (or the first unticked one).
- Don't start the next card, refactor unrelated code, or expand scope. If a card looks bigger than its timebox, split it and do only the first part.
- 15-min debug cap per bug, then use the card's fallback.
- When done: tick the card, commit with the card id, then stop and report in 3 lines.
