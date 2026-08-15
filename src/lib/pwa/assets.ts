/**
 * The launch artwork, as data rather than as drawings.
 *
 * `scripts/generate-pwa-assets.mjs` turns what is here into the PNG files under
 * `public/pwa/`, and `src/app/layout.tsx` turns the very same table into the
 * `<link rel="apple-touch-startup-image">` list pointing at them. Reading both
 * sides off one table is the point: iOS matches a launch image by *exact* pixel
 * size, so a link to a file nobody generated shows a white screen instead.
 */

/** The dice is drawn on a 512×512 grid, whatever size it ends up rendered at. */
export const LOGO_GRID = 512;

/** Indigo 600 — the tile, and the accent colour of the whole application. */
export const LOGO_INK = "#4f46e5";

/** Slate 900 — the manifest's `background_color`, so the OS splash matches. */
export const LOGO_BACKDROP = "#0f172a";

/** Corner radius of the tile, on the 512 grid. */
export const LOGO_CORNER = 112;

export const LOGO_PIP_RADIUS = 34;

/** The five pips of a die's five face, on the 512 grid. */
export const LOGO_PIPS: readonly { cx: number; cy: number }[] = [
  { cx: 160, cy: 160 },
  { cx: 352, cy: 160 },
  { cx: 256, cy: 256 },
  { cx: 160, cy: 352 },
  { cx: 352, cy: 352 },
];

/**
 * Four decimals is finer than any of these canvases can show, and keeps a
 * `51.199999999999996` out of a file somebody may one day open.
 */
function trim(value: number): number {
  return Number(value.toFixed(4));
}

/**
 * A dice tile of `tile` pixels, centred on a `width`×`height` canvas painted
 * `background`, as a standalone SVG document.
 */
function canvas({
  width,
  height,
  background,
  tile,
  corner,
}: {
  width: number;
  height: number;
  background: string;
  tile: number;
  corner: number;
}): string {
  const scale = trim(tile / LOGO_GRID);
  const x = trim((width - tile) / 2);
  const y = trim((height - tile) / 2);
  const pips = LOGO_PIPS.map(
    pip => `<circle cx="${pip.cx}" cy="${pip.cy}" r="${LOGO_PIP_RADIUS}"/>`,
  ).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${background}"/>`,
    `<g transform="translate(${x} ${y}) scale(${scale})">`,
    `<rect width="${LOGO_GRID}" height="${LOGO_GRID}" rx="${corner}" fill="${LOGO_INK}"/>`,
    `<g fill="#ffffff">${pips}</g>`,
    "</g></svg>",
  ].join("");
}

/**
 * The application icon as a square SVG document.
 *
 * A maskable one is cropped to whatever shape the launcher fancies — a circle,
 * a squircle — so its tile bleeds past every edge and the pips are pulled well
 * inside the safe area instead of losing a corner.
 */
export function iconSvg(
  size: number,
  { maskable = false }: { maskable?: boolean } = {},
): string {
  if (maskable) {
    return canvas({
      width: size,
      height: size,
      background: LOGO_INK,
      tile: size * 0.8,
      corner: LOGO_CORNER,
    });
  }

  return canvas({
    width: size,
    height: size,
    background: "transparent",
    tile: size,
    corner: LOGO_CORNER,
  });
}

/** The launch image for one screen size, in device pixels. */
export function splashSvg(width: number, height: number): string {
  // A third of the short side: readable on a phone held at arm's length, and
  // still not a poster on an iPad in landscape.
  return canvas({
    width,
    height,
    background: LOGO_BACKDROP,
    tile: Math.round(Math.min(width, height) / 3),
    corner: LOGO_CORNER,
  });
}

export interface AppleDevice {
  /** Only there so the table can be read back by a human. */
  name: string;
  /** `device-width` in CSS pixels, as reported in portrait. */
  width: number;
  /** `device-height` in CSS pixels, as reported in portrait. */
  height: number;
  /** `-webkit-device-pixel-ratio`. */
  ratio: number;
}

/**
 * Every screen we hand a launch image to. iOS ignores an image whose pixel size
 * doesn't match the device exactly, and falls back to a blank white screen —
 * which is the very thing this whole file exists to remove.
 */
export const APPLE_DEVICES: readonly AppleDevice[] = [
  { name: "iPhone SE (2ᵉ, 3ᵉ), 8", width: 375, height: 667, ratio: 2 },
  {
    name: "iPhone X, XS, 11 Pro, 12/13 mini",
    width: 375,
    height: 812,
    ratio: 3,
  },
  { name: "iPhone XR, 11", width: 414, height: 896, ratio: 2 },
  { name: "iPhone XS Max, 11 Pro Max", width: 414, height: 896, ratio: 3 },
  { name: "iPhone 12, 13, 14", width: 390, height: 844, ratio: 3 },
  { name: "iPhone 12/13 Pro Max, 14 Plus", width: 428, height: 926, ratio: 3 },
  { name: "iPhone 14 Pro, 15, 16", width: 393, height: 852, ratio: 3 },
  {
    name: "iPhone 14 Pro Max, 15 Plus, 16 Plus",
    width: 430,
    height: 932,
    ratio: 3,
  },
  { name: "iPhone 16 Pro", width: 402, height: 874, ratio: 3 },
  { name: "iPhone 16 Pro Max", width: 440, height: 956, ratio: 3 },
  { name: 'iPad mini, iPad 9,7"', width: 768, height: 1024, ratio: 2 },
  { name: 'iPad 10,2"', width: 810, height: 1080, ratio: 2 },
  { name: 'iPad Air 10,9"', width: 820, height: 1180, ratio: 2 },
  { name: 'iPad Pro 11", iPad Air 11"', width: 834, height: 1194, ratio: 2 },
  { name: 'iPad Pro 12,9", 13"', width: 1024, height: 1366, ratio: 2 },
];

export interface SplashSize {
  width: number;
  height: number;
}

export interface SplashImage {
  url: string;
  media: string;
}

/** Where the launch image of that pixel size is served from. */
export function splashUrl({ width, height }: SplashSize): string {
  return `/pwa/splash-${width}x${height}.png`;
}

/**
 * Every distinct file to generate, both orientations, without the duplicates
 * two devices sharing a screen would otherwise produce.
 */
export function splashSizes(
  devices: readonly AppleDevice[] = APPLE_DEVICES,
): SplashSize[] {
  const sizes = new Map<string, SplashSize>();

  for (const device of devices) {
    const short = device.width * device.ratio;
    const long = device.height * device.ratio;

    for (const size of [
      { width: short, height: long },
      { width: long, height: short },
    ]) {
      sizes.set(`${size.width}x${size.height}`, size);
    }
  }

  return [...sizes.values()];
}

/**
 * The `apple-touch-startup-image` entries, one per device and orientation.
 *
 * The media query carries the device's *portrait* dimensions in both cases —
 * `device-width` and `device-height` don't swap round when the screen turns,
 * only `orientation` says which way up it is.
 */
export function appleStartupImages(
  devices: readonly AppleDevice[] = APPLE_DEVICES,
): SplashImage[] {
  return devices.flatMap(device => {
    const screen = `(device-width: ${device.width}px) and (device-height: ${device.height}px) and (-webkit-device-pixel-ratio: ${device.ratio})`;
    const short = device.width * device.ratio;
    const long = device.height * device.ratio;

    return [
      {
        url: splashUrl({ width: short, height: long }),
        media: `${screen} and (orientation: portrait)`,
      },
      {
        url: splashUrl({ width: long, height: short }),
        media: `${screen} and (orientation: landscape)`,
      },
    ];
  });
}
