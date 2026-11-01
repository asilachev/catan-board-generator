# v1: the original single-file app

`index.html` is the first version of the board generator: one Russian-only HTML file with the rule
PDFs next to it. It is kept unchanged because it is the reference for the engine:

- `src/engine/v1.test.ts` loads this file, runs its generator (everything above the renderer) in a
  VM and checks that `src/engine/board.ts` deals exactly the same boards for every variant, code and
  token rule. Codes and links made with v1 therefore still open the same boards.
- Its Russian scenario texts are the source of `scenarios.*` in `src/ui/i18n/locales/ru.json`.

Don't edit it; a change here changes what "the same board" means.
