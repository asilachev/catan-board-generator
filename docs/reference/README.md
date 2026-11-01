# Reference rulebooks

The rulebooks the board data was checked against (see [`../rules.md`](../rules.md) → Sources):

| File | Book |
| --- | --- |
| `catan-rules-ru.pdf` | CATAN base game, Hobby World (Russian), version 1.1 |
| `catan-seafarers-rules-ru-2025.pdf` | CATAN – Seafarers («Мореходы»), Hobby World (Russian), 2025, version 1.0 |

They belong to their publishers, so they are **not committed** (`docs/reference/*.pdf` is in
`.gitignore`). `npm run reference` downloads them from the repository's `reference-docs` release
(needs `gh` auth). The app itself links CATAN GmbH's official rules page instead.
