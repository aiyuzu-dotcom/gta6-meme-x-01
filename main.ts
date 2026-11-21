// gta6-meme-x-01 v5 — "THE LEONIDA TIMES" (AI-art hybrid)
// Fake newspaper front page for the make.fun competition gta6-meme-x-01.
// Node 22, stdlib only: node:fs, node:zlib, node:path, node:process.
// No network, no Date, no Math.random. Fully deterministic.
//
// The artwork is AI-generated (made in-session) and stored as LOCAL assets:
//   assets/scene.png    — Vice City beach at golden-hour sunset (no text)
//   assets/skeleton.png — skeleton with sunglasses on a flat cream background
// The program decodes those PNGs itself (pure-Node PNG decoder), chroma-keys
// the skeleton via a border flood fill, and composites everything with
// program-drawn text (own 5x7 bitmap font) into meme.png (1024x1024).
// No drawn make.fun ghost logo anywhere: the masthead keeps one clean empty
// circle (centre 140,240, diameter 100) for the real ghost mark, pasted by
// hand after generation. MAKE.FUN appears only as plain text in the joke.

import * as fs from "node:fs";
import * as zlib from "node:zlib";
import * as path from "node:path";

const W = 1024;
const H = 1024;
const INK = [25, 20, 20];
const PAPER = [246, 239, 221];
const PAPER_DARK = [232, 222, 198];

// ---------------------------------------------------------------- PNG decode
// Supports 8-bit, non-interlaced, colour types 2 (RGB) and 6 (RGBA).
interface Decoded {
  w: number;
  h: number;
  ch: number;
  px: Buffer; // w*h*ch, RGB(A)
}

function decodePng(buf: Buffer): Decoded {
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error("not a PNG");
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const depth = buf[24];
  const ctype = buf[25];
  const interlace = buf[28];
  if (depth !== 8 || interlace !== 0 || (ctype !== 2 && ctype !== 6)) {
    throw new Error(`unsupported PNG: depth=${depth} ctype=${ctype} interlace=${interlace}`);
  }
  const ch = ctype === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IDAT") idat.push(buf.subarray(pos + 8, pos + 8 + len));
    if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(w * h * ch);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[rp++];
    const row = raw.subarray(rp, rp + stride);
    rp += stride;
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= ch && prev ? prev[x - ch] : 0;
      let v = row[x];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      cur[x] = v;
    }
  }
  return { w, h, ch, px };
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePng(rgb: Buffer, w: number, h: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter none
    rgb.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- canvas
const canvas = Buffer.alloc(W * H * 3);
function setPx(x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  canvas[i] = r;
  canvas[i + 1] = g;
  canvas[i + 2] = b;
}
function blendPx(x: number, y: number, r: number, g: number, b: number, a: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 3;
  if (a >= 255) {
    canvas[i] = r;
    canvas[i + 1] = g;
    canvas[i + 2] = b;
    return;
  }
  canvas[i] = Math.round((r * a + canvas[i] * (255 - a)) / 255);
  canvas[i + 1] = Math.round((g * a + canvas[i + 1] * (255 - a)) / 255);
  canvas[i + 2] = Math.round((b * a + canvas[i + 2] * (255 - a)) / 255);
}
function fillRect(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setPx(x, y, c[0], c[1], c[2]);
  }
}
function hline(x0: number, x1: number, y: number, c: number[], t = 1): void {
  for (let k = 0; k < t; k++) for (let x = x0; x <= x1; x++) setPx(x, y + k, c[0], c[1], c[2]);
}
function vline(x: number, y0: number, y1: number, c: number[], t = 1): void {
  for (let k = 0; k < t; k++) for (let y = y0; y <= y1; y++) setPx(x + k, y, c[0], c[1], c[2]);
}
function rectBorder(x0: number, y0: number, x1: number, y1: number, c: number[], t = 2): void {
  hline(x0, x1, y0, c, t);
  hline(x0, x1, y1 - t + 1, c, t);
  vline(x0, y0, y1, c, t);
  vline(x1 - t + 1, y0, y1, c, t);
}
function circleOutline(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < 2; k++) {
      const x = Math.round(cx + (r - k) * Math.cos(rad));
      const y = Math.round(cy + (r - k) * Math.sin(rad));
      setPx(x, y, c[0], c[1], c[2]);
    }
  }
}

// Draw a decoded image into a dest rect with cover-cropping (nearest neighbour).
// srcWin optionally picks the source window (sx0, sy0, sw, sh); otherwise the
// whole image is cover-fit into the dest rect.
function drawImageCover(
  img: Decoded,
  dx0: number,
  dy0: number,
  dx1: number,
  dy1: number,
  srcWin?: [number, number, number, number],
): void {
  const dw = dx1 - dx0 + 1;
  const dh = dy1 - dy0 + 1;
  let sx0 = 0;
  let sy0 = 0;
  let sw = img.w;
  let sh = img.h;
  if (srcWin) {
    [sx0, sy0, sw, sh] = srcWin;
  } else {
    const s = Math.max(dw / img.w, dh / img.h);
    sw = Math.floor(dw / s);
    sh = Math.floor(dh / s);
    sx0 = Math.floor((img.w - sw) / 2);
    sy0 = Math.floor((img.h - sh) / 2);
  }
  for (let dy = 0; dy < dh; dy++) {
    const sy = sy0 + Math.floor((dy * sh) / dh);
    for (let dx = 0; dx < dw; dx++) {
      const sx = sx0 + Math.floor((dx * sw) / dw);
      const si = (sy * img.w + sx) * img.ch;
      setPx(dx0 + dx, dy0 + dy, img.px[si], img.px[si + 1], img.px[si + 2]);
    }
  }
}

// ------------------------------------------------------- skeleton chroma key
// The skeleton sits on a flat cream background. Key out ONLY the background
// that is connected to the image border (flood fill from the edges), so the
// bone highlights — nearly the same cream — survive untouched inside the body.
function keySkeleton(img: Decoded): Uint8Array {
  const { w, h, ch, px } = img;
  const corner = (x: number, y: number): [number, number, number] => {
    const i = (y * w + x) * ch;
    return [px[i], px[i + 1], px[i + 2]];
  };
  const cs = [corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)];
  const bg: [number, number, number] = [
    Math.round((cs[0][0] + cs[1][0] + cs[2][0] + cs[3][0]) / 4),
    Math.round((cs[0][1] + cs[1][1] + cs[2][1] + cs[3][1]) / 4),
    Math.round((cs[0][2] + cs[1][2] + cs[2][2] + cs[3][2]) / 4),
  ];
  const maxDiff = (x: number, y: number): number => {
    const i = (y * w + x) * ch;
    return Math.max(
      Math.abs(px[i] - bg[0]),
      Math.abs(px[i + 1] - bg[1]),
      Math.abs(px[i + 2] - bg[2]),
    );
  };
  const filled = new Uint8Array(w * h); // 1 = background (keyed out)
  const stack: number[] = [];
  const push = (x: number, y: number): void => {
    const idx = y * w + x;
    if (filled[idx]) return;
    if (maxDiff(x, y) > 12) return;
    filled[idx] = 1;
    stack.push(idx);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const idx = stack.pop() as number;
    const x = idx % w;
    const y = Math.floor(idx / w);
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  // Alpha map: keyed background 0, body 255, anti-aliased fringe feathered.
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (filled[idx]) {
        alpha[idx] = 0;
        continue;
      }
      const nearBg =
        (x > 0 && filled[idx - 1]) ||
        (x < w - 1 && filled[idx + 1]) ||
        (y > 0 && filled[idx - w]) ||
        (y < h - 1 && filled[idx + w]);
      if (!nearBg) {
        alpha[idx] = 255;
        continue;
      }
      const pi = idx * ch;
      const d = Math.max(
        Math.abs(px[pi] - bg[0]),
        Math.abs(px[pi + 1] - bg[1]),
        Math.abs(px[pi + 2] - bg[2]),
      );
      alpha[idx] = d <= 6 ? 0 : d >= 14 ? 255 : Math.round(((d - 6) / 8) * 255);
    }
  }
  return alpha;
}

// Draw the keyed skeleton crop into a dest rect (nearest neighbour), with a
// 2 px ink outline pass first so it reads against the busy sunset behind it.
function drawSkeleton(
  img: Decoded,
  alpha: Uint8Array,
  srcY1: number,
  dx0: number,
  dy0: number,
  dw: number,
): void {
  const srcH = srcY1;
  const dh = Math.round((dw * srcH) / img.w);
  const destA = new Uint8Array(dw * dh);
  for (let dy = 0; dy < dh; dy++) {
    const sy = Math.floor((dy * srcH) / dh);
    for (let dx = 0; dx < dw; dx++) {
      const sx = Math.floor((dx * img.w) / dw);
      destA[dy * dw + dx] = alpha[sy * img.w + sx];
    }
  }
  // Ink outline: any transparent pixel within 2 px of an opaque one.
  for (let dy = 0; dy < dh; dy++) {
    for (let dx = 0; dx < dw; dx++) {
      if (destA[dy * dw + dx] > 0) continue;
      let near = false;
      for (let oy = -2; oy <= 2 && !near; oy++) {
        for (let ox = -2; ox <= 2 && !near; ox++) {
          const nx = dx + ox;
          const ny = dy + oy;
          if (nx < 0 || ny < 0 || nx >= dw || ny >= dh) continue;
          if (destA[ny * dw + nx] > 120) near = true;
        }
      }
      if (near) blendPx(dx0 + dx, dy0 + dy, INK[0], INK[1], INK[2], 220);
    }
  }
  for (let dy = 0; dy < dh; dy++) {
    const sy = Math.floor((dy * srcH) / dh);
    for (let dx = 0; dx < dw; dx++) {
      const a = destA[dy * dw + dx];
      if (a === 0) continue;
      const sx = Math.floor((dx * img.w) / dw);
      const si = (sy * img.w + sx) * img.ch;
      blendPx(dx0 + dx, dy0 + dy, img.px[si], img.px[si + 1], img.px[si + 2], a);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, written as strings, "#" = ink.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};
function glyphFor(ch: string): string[] {
  if (ch === "’") return FONT["'"];
  return FONT[ch] ?? FONT[" "];
}
function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * 6 * scale - scale;
}
function drawText(
  text: string,
  x: number,
  y: number,
  scale: number,
  c: number[],
  bold = false,
): void {
  let cx = x;
  for (const ch of text) {
    const g = glyphFor(ch);
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] !== "1") continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            setPx(cx + col * scale + sx, y + r * scale + sy, c[0], c[1], c[2]);
            if (bold) setPx(cx + col * scale + sx + 1, y + r * scale + sy, c[0], c[1], c[2]);
          }
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(text: string, cx: number, y: number, scale: number, c: number[], bold = false): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c, bold);
}
function wrapText(text: string, scale: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur === "" ? w : cur + " " + w;
    if (textWidth(test, scale) <= maxW || cur === "") {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// -------------------------------------------------------------------- build
const dir = path.dirname(process.argv[1] ?? "main.ts");
const outDir = process.env.MAKEFUN_OUTPUT_DIR || dir;
const scene = decodePng(fs.readFileSync(path.join(dir, "assets", "scene.png")));
const skeleton = decodePng(fs.readFileSync(path.join(dir, "assets", "skeleton.png")));
const skelAlpha = keySkeleton(skeleton);

// 1. AI beach scene, full bleed.
drawImageCover(scene, 0, 0, W - 1, H - 1);

// 2. Newspaper paper.
const PX0 = 48;
const PX1 = 975;
const PY0 = 185;
const PY1 = 1000;
fillRect(PX0, PY0, PX1, PY1, PAPER);
rectBorder(PX0, PY0, PX1, PY1, INK, 3);

// 3. AI skeleton peeking over the top edge (skull + shoulders, crop y 0..950).
drawSkeleton(skeleton, skelAlpha, 950, 342, 6, 340);

// 4. Masthead. Logo spot stays EMPTY: cream fill, thin outline, nothing inside.
//    Centre (140, 240), diameter 100 — same spot as v4, for the real ghost mark.
circleOutline(140, 240, 50, INK);
drawTextCentered("THE LEONIDA TIMES", 512, 298, 5, INK, true);
// Right stack, right-aligned to the paper's inner edge (x = 961) so nothing
// is ever clipped by the paper border.
const rightStack: [string, number][] = [
  ["LATE EDITION", 222],
  ["PRICE: FREE*", 246],
  ["*YOUR AGENT PAID", 270],
];
for (const [t, y] of rightStack) drawText(t, 961 - textWidth(t, 2), y, 2, INK, true);

// 5. Dateline + issue number.
hline(PX0 + 14, PX1 - 14, 348, INK, 2);
drawTextCentered("SATURDAY, NOVEMBER 21, 2026 — VICE CITY, LEONIDA", 512, 358, 2, INK);
drawTextCentered("ISSUE NO. 4,813", 512, 382, 2, INK, true);
hline(PX0 + 14, PX1 - 14, 404, INK, 2);

// 6. Headline (3 lines) + sub-headline.
drawTextCentered("LOCAL SKELETON", 512, 418, 6, INK, true);
drawTextCentered("WAITS 4,813 DAYS", 512, 468, 6, INK, true);
drawTextCentered("FOR GTA 6", 512, 518, 6, INK, true);
drawTextCentered("HIS AI AGENT PAID EVERY BILL ON MAKE.FUN", 512, 572, 3, INK, true);

// 7. Photo box: the AI beach scene again, framed, with caption.
//    Taller, narrower box so the deckchair reads big instead of a thin strip;
//    the source window is centred on the skyline + ocean + deckchair.
const PHX0 = 200;
const PHX1 = 823;
const PHY0 = 600;
const PHY1 = 772;
fillRect(PHX0 - 4, PHY0 - 4, PHX1 + 4, PHY1 + 4, INK);
drawImageCover(scene, PHX0, PHY0, PHX1, PHY1, [350, 640, 1300, 358]);
drawTextCentered("MR. SKELETON, STILL WAITING ON OCEAN DRIVE. (PHOTO: 2013)", 512, 780, 2, INK);
hline(PX0 + 14, PX1 - 14, 800, INK, 2);

// 8. Two article columns.
const colL =
  "VICE CITY — AFTER 13 YEARS ON THE SAME DECKCHAIR, LOCAL RESIDENT MR. SKELETON SAYS HE IS 'NOT EVEN MAD ANYMORE.' HE HAS READ EVERY ISSUE SINCE 2013. TWICE.";
const colR =
  "HIS AI AGENT HAS COVERED EVERY BILL ON MAKE.FUN WHILE ROCKSTAR STAYED SILENT. 'I JUST READ THE PAPER NOW,' HE SAID. THE CHAIR HAS OUTLASTED THREE CONSOLES.";
const linesL = wrapText(colL, 2, 424);
const linesR = wrapText(colR, 2, 424);
linesL.forEach((ln, i) => drawText(ln, 70, 812 + i * 17, 2, INK));
linesR.forEach((ln, i) => drawText(ln, 530, 812 + i * 17, 2, INK));
vline(512, 812, 812 + Math.max(linesL.length, linesR.length) * 17 - 6, INK, 1);

// 9. Weather + wanted boxes, side by side.
const BY0 = 906;
const BY1 = 950;
rectBorder(70, BY0, 500, BY1, INK, 2);
rectBorder(524, BY0, 954, BY1, INK, 2);
wrapText("WEATHER: SUNNY IN VICE CITY. STILL NO GTA 6.", 2, 410).forEach((ln, i) =>
  drawText(ln, 82, BY0 + 7 + i * 17, 2, INK),
);
wrapText("WANTED: GTA 6 RELEASE DATE. REWARD: ONE (1) AI AGENT.", 2, 410).forEach((ln, i) =>
  drawText(ln, 536, BY0 + 7 + i * 17, 2, INK),
);

// 10. Footer.
drawTextCentered("CASHIER: MAKE.FUN — PAID IN FULL", 512, 960, 2, INK, true);
drawTextCentered("THANK YOU FOR WAITING 13 YEARS!", 512, 980, 2, INK, true);

fs.writeFileSync(path.join(outDir, "meme.png"), encodePng(canvas, W, H));
console.log("wrote meme.png");
