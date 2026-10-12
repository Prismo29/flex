// Renders the FLEX icon (gold crown over a bold gold "F" on near-black) into PNGs
// using only Node built-ins: pixels are drawn procedurally into an RGBA buffer
// (4x4 supersampled for anti-aliasing) and encoded as PNG with zlib + CRC chunks.
//
// Usage: node scripts/make-icons.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- Shape definition (100x100 design space, same as src/app/icon.svg) ----
const CROWN = [
  [30, 22], [30, 10], [40, 17], [50, 6], [60, 17], [70, 10], [70, 22],
];
const RECTS = [
  [32, 28, 44, 84], // stem   (x0, y0, x1, y1)
  [32, 28, 70, 40], // top bar
  [32, 51, 62, 62], // middle bar
];
const CONTENT_CENTER = [50, 45];

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inShape(x, y) {
  for (const [x0, y0, x1, y1] of RECTS) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return true;
  return inPolygon(x, y, CROWN);
}

const BG = [0x0b, 0x0b, 0x0d];
const GOLD_STOPS = [
  [0, [0xf5, 0xd7, 0x7a]],
  [0.55, [0xd4, 0xaf, 0x37]],
  [1, [0xa8, 0x82, 0x1e]],
];

function gold(t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < GOLD_STOPS.length; i++) {
    const [t1, c1] = GOLD_STOPS[i];
    const [t0, c0] = GOLD_STOPS[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, n) => v + (c1[n] - v) * k);
    }
  }
  return GOLD_STOPS.at(-1)[1];
}

/**
 * @param {number} size  output px
 * @param {number} scale how large the glyph is drawn (1 = design size)
 * @param {number} radius background corner radius in design units (0 = full bleed)
 */
function render(size, scale, radius) {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let cover = 0;
      let bgCover = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // icon space 0..100
          const ix = ((pxi + (sx + 0.5) / SS) / size) * 100;
          const iy = ((py + (sy + 0.5) / SS) / size) * 100;
          // background (rounded rect)
          let inBg = true;
          if (radius > 0) {
            const cx = Math.min(Math.max(ix, radius), 100 - radius);
            const cy = Math.min(Math.max(iy, radius), 100 - radius);
            inBg = (ix - cx) ** 2 + (iy - cy) ** 2 <= radius * radius;
          }
          if (!inBg) continue;
          bgCover++;
          // map back into design space
          const dx = CONTENT_CENTER[0] + (ix - 50) / scale;
          const dy = CONTENT_CENTER[1] + (iy - 50) / scale;
          if (inShape(dx, dy)) cover++;
        }
      }
      const total = SS * SS;
      const a = cover / total;
      const iy = (py / size) * 100;
      const dy = CONTENT_CENTER[1] + (iy - 50) / scale;
      const g = gold((dy - 6) / 78);
      const o = (py * size + pxi) * 4;
      px[o] = Math.round(BG[0] + (g[0] - BG[0]) * (a / (bgCover / total || 1)));
      px[o + 1] = Math.round(BG[1] + (g[1] - BG[1]) * (a / (bgCover / total || 1)));
      px[o + 2] = Math.round(BG[2] + (g[2] - BG[2]) * (a / (bgCover / total || 1)));
      px[o + 3] = Math.round((bgCover / total) * 255);
    }
  }
  return px;
}

// ---- PNG encoding ----
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const OUTPUTS = [
  // Regular "any" icons: rounded tile, glyph fills most of it.
  { file: "public/icons/icon-192.png", size: 192, scale: 0.9, radius: 22 },
  { file: "public/icons/icon-512.png", size: 512, scale: 0.9, radius: 22 },
  // Maskable: full-bleed background, glyph inside the 80% safe-zone circle.
  { file: "public/icons/maskable-512.png", size: 512, scale: 0.62, radius: 0 },
  // Apple touch icon: iOS applies its own mask, so full bleed, no transparency.
  { file: "src/app/apple-icon.png", size: 180, scale: 0.8, radius: 0 },
];

for (const { file, size, scale, radius } of OUTPUTS) {
  const out = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, encodePng(size, render(size, scale, radius)));
  console.log(`wrote ${file} (${size}x${size})`);
}
