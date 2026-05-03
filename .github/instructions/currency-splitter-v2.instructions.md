---
name: currency-splitter-v2
description: "Use when helping debug or build the FFXI Dynamis Currency Distributor v2 app. Always reference file names and line numbers; verify script load order, Supabase, dark theme, and localStorage fallback."
applyTo:
  - "**/*.{html,js,css}"
---

# Dynamis Currency Distributor v2 — Guidance

Use this instruction whenever you are helping with the `currency-splitter-v2` app.

## Key checks

- Reference exact file names and line numbers in every fix or diagnostic.
- Always verify script loading order first:
  - `index.html`, `dashboard.html`, `login.html`, and `manage.html` must load `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` before `auth.js`, then `db.js`, then any page-specific script.
- Test the Supabase connection in `auth.js` and `db.js` before changing logic.
- Keep the UI consistent with the dark theme defined in `styles.css`.
- Always preserve or fallback to `localStorage` when Supabase is unavailable.

## Debug / build priorities

1. Check `index.html` script order and the related `auth.js` / `db.js` imports.
2. Inspect Supabase initialization in `auth.js` and query usage in `db.js`.
3. Verify session and history persistence via `localStorage` first, then Supabase sync.
4. Preserve the existing dark theme palettes and components in `styles.css`.

## When fixing issues

- Prefer small, targeted changes and mention the impacted files and line ranges.
- If Supabase fails, add a graceful fallback path using `localStorage` rather than removing persistence.
- Keep authentication and run history behavior stable across `index.html`, `dashboard.html`, `login.html`, and `manage.html`.
- Do not introduce a light-UI change unless the user requests it explicitly.

## Useful references

- `index.html` — main app entry and script loading
- `auth.js` — Supabase auth, localStorage user session handling
- `db.js` — Supabase data operations, fallback logic
- `script.js` — run history, localStorage persistence, UI behavior
- `styles.css` — dark theme palette and visual consistency
