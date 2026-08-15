/**
 * Rasterises the launch artwork described in `src/lib/pwa/assets.ts`:
 *
 *   - `src/app/icon.svg`            the favicon and install icon
 *   - `public/pwa/icon-*.png`       the icons the manifest hands to Android
 *   - `public/pwa/splash-*.png`     the launch images iOS shows on start-up
 *
 * Run it after touching the logo or the device table:
 *
 *   yarn pwa:assets
 *
 * The output is committed — these are static assets, not a build step, and a
 * missing splash file is a white screen on someone's phone rather than a red
 * build. The images are flat colour on flat colour, so they are written as
 * palette PNGs: a few kilobytes each instead of a few hundred.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  iconSvg,
  splashSizes,
  splashSvg,
  splashUrl,
} from "../src/lib/pwa/assets.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "pwa");

/** Writes one SVG document out as a palette PNG of the given pixel size. */
async function png(svg, path) {
  const buffer = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  await writeFile(path, buffer);

  return buffer.length;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  await writeFile(join(root, "src", "app", "icon.svg"), `${iconSvg(512)}\n`);

  const icons = [
    ["icon-192.png", iconSvg(192)],
    ["icon-512.png", iconSvg(512)],
    ["icon-maskable-512.png", iconSvg(512, { maskable: true })],
  ];

  for (const [name, svg] of icons) {
    await png(svg, join(outDir, name));
  }

  const sizes = splashSizes();

  for (const size of sizes) {
    await png(
      splashSvg(size.width, size.height),
      join(root, "public", splashUrl(size)),
    );
  }

  console.log(
    `${icons.length} icons + ${sizes.length} launch images written to public/pwa/`,
  );
}

await main();
