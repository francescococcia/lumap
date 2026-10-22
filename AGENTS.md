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


## Working in small chunks (every agent: Cursor, Codex, others)
- The build queue is knowledge/tasks.md. Do ONLY the task id you were given (or the first unticked one in your lane).
- Don't start the next task, refactor unrelated code, or expand scope. If a task looks bigger than about 20 minutes, split it into smaller cards and do only the first.
- Stay inside your lane's files. If you must touch another lane's files, say so in Notes.
- When done: tick the box, add one line under Notes, commit with the task id in the message, then stop and report in 3 lines.
- Codex works on its own branch 'codex' (or a separate worktree) and merges into build only when its lane is done.

