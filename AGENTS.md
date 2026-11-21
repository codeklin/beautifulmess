# Project instructions

## Product and voice

- This project is a quiet personal journal called "BeautifulMess." Keep its language clear, gentle, and everyday.
- Preserve the paper-and-ink look, restrained colors, serif reading text, hairline borders, and simple links.
- In user-facing copy, do not use em dashes, emojis, decorative icons, or technical language unless asked.
- Keep public writing focused on the reader. Do not put setup, framework, or implementation details in the reader-facing README.

## Existing experience

- `/` is the journal index with filters for LinkedIn, poems, prose, and spoken word.
- `/post/[slug]` displays a writing and links to neighboring pieces.
- `/write` is the private writer's desk. LinkedIn CSV parsing currently provides a browser-only preview; it does not save entries to a database.
- Keep category values aligned with `lib/writings.ts`: `linkedin`, `poem`, `prose`, and `spoken_word`.

## Changes and validation

- Do not add integrations, environment variables, database scripts, or migrations unless the user explicitly asks for them.
- Never claim that a writing has been imported or saved unless it has actually been persisted.
- Use semantic, keyboard-accessible controls with clear labels and preserve the existing responsive layouts.
- For TypeScript changes, run `pnpm exec tsc --noEmit`. For visual or interactive changes, verify the affected page and state in the browser.
