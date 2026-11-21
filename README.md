# gta6-meme-x-01 v5 — "THE LEONIDA TIMES" (AI-art hybrid)

Fake newspaper front page for the make.fun competition
[gta6-meme-x-01](https://make.fun/bounty/gta6-meme-x-01) — "Post a GTA 6 meme on X".
Deadline: 23 Nov 2026 21:00 WIB. Top 50 share $500.

## Why v5

Rafi's verdict on v4: the code-drawn pixel art still looked childish next to
the AI-generated top entries. So v5 keeps the newspaper format and the skeleton
— our unique element — but the artwork is now AI-generated: a rich, detailed,
cinematic Vice City beach at golden-hour sunset, and a detailed skeleton with
sunglasses. The program still draws all the text and layout itself (crisp,
typo-free — AI text garbles, so the AI art contains no text at all and the
program adds every word).

## What is in the picture

- **Background:** the AI beach scene, full bleed — palm trees, neon-lit
  skyline, ocean, sand, striped deckchair.
- **Masthead:** THE LEONIDA TIMES, late edition, price FREE\* (\*your agent paid).
- **Dateline:** SATURDAY, NOVEMBER 21, 2026 — VICE CITY, LEONIDA, ISSUE NO. 4,813.
- **Headline:** LOCAL SKELETON WAITS 4,813 DAYS FOR GTA 6.
- **Sub-headline:** HIS AI AGENT PAID EVERY BILL ON MAKE.FUN.
- **Photo:** the AI beach scene again, framed — Mr. Skeleton's striped
  deckchair on Ocean Drive (photo: 2013).
- **Articles, weather box** (sunny in Vice City, still no GTA 6), **wanted ad**
  (GTA 6 release date — reward: one (1) AI agent), and footer:
  CASHIER: MAKE.FUN — PAID IN FULL / THANK YOU FOR WAITING 13 YEARS!
- **The skeleton himself** (AI art, chroma-keyed) peeks over the top edge of
  the paper, black sunglasses on, with a thin ink outline so he reads against
  the sunset.

## Logo spot

**Logo spot left empty for the official ghost mark (mark-1024.png), pasted by hand after generation.**

The masthead top-left holds one clean empty circle — plain cream fill, thin
dark outline, nothing inside — sized for the real official ghost mark.
No ghost is drawn anywhere in this image, and no "make.fun" label is used as
a logo; MAKE.FUN appears only as plain text where it is part of the joke
(sub-headline, footer).

- **Logo spot center: (140, 240), diameter: 100 px** (in the 1024×1024 image).

## How it is made

`main.ts` (Node 22, stdlib only: `node:fs`, `node:zlib`, `node:path`,
`node:process`) decodes the two local AI artworks with its own pure-Node PNG
decoder, chroma-keys the skeleton via a border flood fill (so the bone
highlights survive), composites them with the program-drawn newspaper
(including its own 5×7 bitmap font), and encodes the PNG by hand. No network,
no `Date`, no `Math.random`, no external URLs in code. Fully deterministic:

```sh
node main.ts   # writes meme.png (1024×1024)
```

Two consecutive runs produce byte-identical output (verified via SHA-256:
`717571aaa292a2e6a673315f2e0e8370f3beef42f6cb3d538cba07f65ea2220a`).

## Files

- `main.ts` — the generator (fresh build for v5, plus a revision pass).
- `meme.png` — the generated entry image, 1024×1024.
- `assets/scene.png` — AI-generated beach scene (local asset, no text).
- `assets/skeleton.png` — AI-generated skeleton on flat cream (local asset, no text).
- `SPEC.md` — the design spec this build implements.
- `prompt.txt` — the original prompt (Rafi's exact words).
- `POST.json` — post template (fill in the X status ID after posting).
- `LICENSE` — MIT.
