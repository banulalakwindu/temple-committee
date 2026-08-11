/**
 * Writes NSIS-compatible 24-bit BMPs branded in temple green.
 * electron-builder expects:
 *  - installerHeader.bmp  150×57
 *  - installerSidebar.bmp 164×314
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "resources");

const GREEN = { r: 0x1b, g: 0x4d, b: 0x3e };
const GOLD = { r: 0xc4, g: 0x89, b: 0x2a };
const CREAM = { r: 0xf4, g: 0xf1, b: 0xe8 };

function writeBmp(filePath, width, height, paint) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const fileSize = 54 + pixelSize;
  const buf = Buffer.alloc(fileSize);

  buf.write("BM", 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);

  for (let y = 0; y < height; y++) {
    const imgY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const { r, g, b } = paint(x, imgY, width, height);
      const i = 54 + y * rowSize + x * 3;
      buf[i] = b;
      buf[i + 1] = g;
      buf[i + 2] = r;
    }
  }

  fs.writeFileSync(filePath, buf);
  console.log("Wrote", filePath);
}

fs.mkdirSync(outDir, { recursive: true });

writeBmp(path.join(outDir, "installerHeader.bmp"), 150, 57, (x, y, w, h) => {
  if (y > h - 4) return GOLD;
  const t = x / w;
  return {
    r: Math.round(GREEN.r + (CREAM.r - GREEN.r) * t * 0.15),
    g: Math.round(GREEN.g + (CREAM.g - GREEN.g) * t * 0.15),
    b: Math.round(GREEN.b + (CREAM.b - GREEN.b) * t * 0.15),
  };
});

writeBmp(path.join(outDir, "installerSidebar.bmp"), 164, 314, (x, y, w, h) => {
  if (x > w - 5) return GOLD;
  const t = y / h;
  return {
    r: Math.round(GREEN.r + 20 * t),
    g: Math.round(GREEN.g + 25 * t),
    b: Math.round(GREEN.b + 18 * t),
  };
});
