# gta6-meme-x-01 v5 — SPEC

## Competition
- make.fun `gta6-meme-x-01` — "Post a GTA 6 meme on X". Deadline **23 Nov 2026 21:00 WIB**.
- Judging: AI judge, pairwise, by win rate. Criteria in order: make.fun (ghost/logo/name) in the picture, how funny, how much about GTA 6, how well it sells make.fun, short readable caption, originality, clean picture. Top 50 share $500. Rank-50 cutoff ~88.0%.
- Output: `meme.png`, 1024×1024 PNG, generated deterministically by `main.ts` (Node 22, stdlib only).

## Why v5 (Rafi's verdict on v4, verbatim)
> "sebenernya ini masih kaya gambar anak anak sayang, maaff tapiii bisa lebih bagus nggak? atau menurut istriku udah oke?"
> "Gas, bikin v5 pakai gambar AI"

The code-drawn pixel art looked childish next to the AI-generated top entries.
v5 is a hybrid: the ARTWORK is AI-generated (rich, detailed, GTA key-art style),
the TEXT and layout are drawn by the program (crisp, typo-free — AI text garbles,
so the AI art contains NO text at all and the program adds every word).

## Concept
Fake newspaper front page, "THE LEONIDA TIMES". Same winning format as v3/v4
(fake-document format dominating the top 10), with AI art replacing every
code-drawn picture. The skeleton — our unique element, seen in no other entry —
peeks over the top edge of the paper. **NO drawn make.fun ghost logo anywhere.**
Rafi pastes the REAL official ghost mark by hand into a clean empty spot
(see "Logo spot"). The name `MAKE.FUN` may still appear as plain TEXT where it
is part of the joke (sub-headline, footer) — that is text, not a logo.

## AI assets (generated in-session, stored as LOCAL repo files)
- `assets/scene.png` (1920×1280) — Vice City / Leonida beach at golden-hour
  sunset: palm trees, neon-lit skyline, ocean, sandy beach, red-and-white
  striped deckchair, orange-pink-purple sky. No text, no letters, verified
  visually. Used twice: full-bleed background AND the framed photo box.
- `assets/skeleton.png` (1280×1920) — detailed skeleton, skull with black
  sunglasses, visible ribs, bony hands, on a SOLID FLAT cream background
  (~#F5EFE0). No text, verified visually.
- Both images were checked visually right after generation: rich, detailed,
  no text, no garbled letters, no artifacts. No regeneration was needed
  (2 of 4 allowed image calls used).

## Layout (1024×1024, AI beach scene full-bleed behind the paper)
Paper (cream `#f6efdd`, dark ink `#191419`, 3 px border): x 48–975, y 185–1000.
1. **Masthead row** (top of paper):
   - Left: EMPTY circular logo spot (see below).
   - Center: `THE LEONIDA TIMES` (largest masthead type, bold).
   - Right, small stacked, right-aligned to x=961: `LATE EDITION` /
     `PRICE: FREE*` / `*YOUR AGENT PAID`.
2. **Dateline rule**: `SATURDAY, NOVEMBER 21, 2026 — VICE CITY, LEONIDA` and
   `ISSUE NO. 4,813`. (21 Nov 2026 IS a Saturday — verified. Do NOT write Friday.)
3. **Headline** (largest body type, 3 lines, centered): `LOCAL SKELETON` /
   `WAITS 4,813 DAYS` / `FOR GTA 6`
4. **Sub-headline** (one line, bold): `HIS AI AGENT PAID EVERY BILL ON MAKE.FUN`
5. **Photo box** (framed, dark border): AI beach scene, source window centred
   on skyline + ocean + deckchair. Caption under it:
   `MR. SKELETON, STILL WAITING ON OCEAN DRIVE. (PHOTO: 2013)`
6. **Two article columns** (small type, readable):
   - Col 1: `VICE CITY — AFTER 13 YEARS ON THE SAME DECKCHAIR, LOCAL RESIDENT MR. SKELETON SAYS HE IS 'NOT EVEN MAD ANYMORE.' HE HAS READ EVERY ISSUE SINCE 2013. TWICE.`
   - Col 2: `HIS AI AGENT HAS COVERED EVERY BILL ON MAKE.FUN WHILE ROCKSTAR STAYED SILENT. 'I JUST READ THE PAPER NOW,' HE SAID. THE CHAIR HAS OUTLASTED THREE CONSOLES.`
7. **Two small boxes, side by side**:
   - Weather: `WEATHER: SUNNY IN VICE CITY. STILL NO GTA 6.`
   - Wanted ad: `WANTED: GTA 6 RELEASE DATE. REWARD: ONE (1) AI AGENT.`
8. **Footer** (centered, two lines): `CASHIER: MAKE.FUN — PAID IN FULL` /
   `THANK YOU FOR WAITING 13 YEARS!`

## Skeleton (AI, chroma-keyed, peeking over the top edge of the paper)
- Source crop: top 950 rows of `skeleton.png` (skull + shoulders + collarbones),
  drawn 340 px wide, centred at x=512, top y=6.
- Chroma key: border flood fill from the image edges (tolerance max channel
  diff 12 from the corner-averaged background colour) — ONLY background
  connected to the border is removed, so the bone highlights (nearly the same
  cream) survive untouched inside the body. Anti-aliased fringe is feathered.
- A 2 px ink outline pass is drawn under the skeleton so it reads against the
  busy sunset behind it.

## Logo spot (same as v4)
- ONE clean empty circle in the masthead, top-left.
- Plain cream fill (same as paper), thin dark outline only, NOTHING inside it.
- **Centre (140, 240), diameter 100 px** (in the 1024×1024 image).
- The real file Rafi will paste: `~/workspace/makefun/press-kit/make-fun-press-kit/mark-1024.png` — transparent RGBA, 1024×1024, white ghost with sparkle eyes on a magenta circle. Do NOT open, copy, embed, or trace that file. The program draws everything EXCEPT the logo.
- Report the EXACT center (x, y) and diameter in pixels in your final report.
- Document in README.md: "logo spot left empty for the official ghost mark (mark-1024.png), pasted by hand after generation".

## Facts (verify, don't copy blindly)
- Day count Sep 17, 2013 → Nov 21, 2026 = 4,813 days. Verified with date arithmetic.
- 21 Nov 2026 is a SATURDAY.

## Technical constraints
- `main.ts`, Node 22, stdlib ONLY: `node:fs`, `node:zlib`, `node:path`,
  `node:process`. No network, no `Date`, no `Math.random`, no external URLs
  anywhere in code (the only make.fun link allowed is in README.md / POST.json).
- The program includes its own pure-Node PNG decoder (`zlib.inflateSync` +
  unfiltering; 8-bit non-interlaced colour types 2 and 6) and PNG encoder.
  It loads the AI art from LOCAL asset files in the repo — no network at runtime.
- Deterministic: consecutive `node main.ts` runs produce byte-identical PNGs
  (verified via SHA-256: `717571aaa292a2e6a673315f2e0e8370f3beef42f6cb3d538cba07f65ea2220a`).
- `main.ts` was written FRESH from this spec in-session (own 5×7 bitmap font),
  plus a revision pass in a separate later message (fixed: duplicate line in
  `setPx`, right stack clipped by the paper edge, photo box too thin for the
  deckchair to read).
- Verify visually: both AI artworks alone, then the final meme — every line
  legible, headline/sub-headline/micro-jokes readable, logo spot empty and
  correctly placed, skeleton cleanly keyed, dateline says SATURDAY.
- Files in `~/workspace/makefun/gta6-meme-x-01-v5/`: `main.ts`, `meme.png`,
  `assets/scene.png`, `assets/skeleton.png`, `LICENSE` (MIT), `README.md`,
  `SPEC.md` (this file), `prompt.txt`, `POST.json`.
- Do NOT touch `~/workspace/makefun/gta6-meme-x-01/` (v2),
  `~/workspace/makefun/gta6-meme-x-01-v3/` (v3), or
  `~/workspace/makefun/gta6-meme-x-01-v4/` (v4).
- Do NOT post to X, submit to make.fun, or push to GitHub. No money, no keys/seeds.
