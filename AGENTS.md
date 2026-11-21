# Project instructions

## Product and voice

- This project is a quiet personal journal called "BeautifulMess." Keep its language clear, gentle, and everyday.
- Preserve the paper-and-ink look, restrained colors, serif reading text, hairline borders, and simple links.
- In user-facing copy, do not use em dashes, emojis, decorative icons, or technical language unless asked.
- Keep public writing focused on the reader. Do not put setup, framework, or implementation details in the reader-facing README.

## Existing experience

- `/` is the journal index with filters for LinkedIn and spoken-word pieces.
- `/post/[slug]` displays a writing and links to neighboring pieces.
- `/write` is the password-protected writing area for composing, scheduling, and keeping drafts. Writing is currently stored in browser storage.
- Preserve legacy category values in stored data; new regular writing uses `prose`, and spoken-word pieces use `spoken_word`.

## Changes and validation

- Do not add integrations, environment variables, database scripts, or migrations unless the user explicitly asks for them.
- Never claim that a writing has been imported or saved unless it has actually been persisted.
- Use semantic, keyboard-accessible controls with clear labels and preserve the existing responsive layouts.
- For TypeScript changes, run `pnpm exec tsc --noEmit`. For visual or interactive changes, verify the affected page and state in the browser.
