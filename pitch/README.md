# Pitch material

Finished files in this folder: `PayPerRead-Pitch.pdf` (deck as PDF), `PayPerRead-Pitch.pptx` (≈52 MB, animated, video embedded)
and `payperread-showcase.mp4` (≈50 MB). They are too big for GitHub's web upload (25 MB), so update them with git.
To rebuild either one, follow the steps below.

## Pitch deck

```bash
python3 -m venv .venv && .venv/bin/pip install python-pptx lxml pillow
.venv/bin/python pitch/build_deck.py PayPerRead-Pitch.pptx
```

- Text, order and speaker notes of all 15 slides are in `build_deck.py`.
- Screenshots are in `img/`. Retake them with `record/deckshots.mjs` (dev server on port 3000, all logged in as the demo accounts).
- Animations are written as PowerPoint XML in `add_builds()`: every slide auto-plays fade + "Ascend"; groups in `slide.wipes` wipe in from the left (the roadmap line).

## Showcase video (macOS)

1. Back up `data/` (the recording buys articles and changes accounts).
2. Build and start a production server: `npm run build && npx next start -p 3100`.
3. Create a Devnet wallet for the video as `pitch/record/video-wallet.json` (secret key as a JSON array, **git-ignored**) and fund it: `node pitch/record/fund.mjs in` (needs `PUBLISHER_SECRET_KEY` in `.env.local`).
4. `cd pitch/record && npm install && node video.mjs`: about 3 minutes, frames go to `frames/`.
5. `swiftc -O encode.swift -o encode && ./encode frames frames.json payperread-showcase.mp4`
6. Send the leftover SOL back (`node pitch/record/fund.mjs out`) and restore `data/`.

`video.mjs` hides the "Low balance" pop-up and retries filter-tab clicks (they sometimes don't react, see `docs/HANDOVER.md`).
