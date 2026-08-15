import { describe, expect, it } from "vitest";

import type { AppleDevice } from "./assets";
import {
  APPLE_DEVICES,
  appleStartupImages,
  iconSvg,
  LOGO_BACKDROP,
  LOGO_INK,
  splashSizes,
  splashSvg,
  splashUrl,
} from "./assets";

const phone: AppleDevice = {
  name: "Téléphone",
  width: 400,
  height: 800,
  ratio: 3,
};

/** Same screen as `phone`, under another name — the case the dedup is for. */
const twin: AppleDevice = { ...phone, name: "Le même en vert" };

describe("iconSvg", () => {
  it("draws the die on the whole square, over nothing", () => {
    const svg = iconSvg(192);

    expect(svg).toContain('width="192" height="192"');
    expect(svg).toContain('fill="transparent"');
    expect(svg).toContain(`fill="${LOGO_INK}"`);
    expect(svg.match(/<circle/g)).toHaveLength(5);
  });

  it("pulls a maskable icon inside its safe area, and fills what it leaves", () => {
    const svg = iconSvg(512, { maskable: true });

    // A launcher crops this to a circle or a squircle: the tile is inset so no
    // pip is cut off, and the colour behind it covers the corners it vacates.
    expect(svg).toContain("translate(51.2 51.2) scale(0.8)");
    expect(svg).toContain(
      `<rect width="512" height="512" fill="${LOGO_INK}"/>`,
    );
  });
});

describe("splashSvg", () => {
  it("centres a die of a third of the short side on the backdrop", () => {
    const svg = splashSvg(1179, 2556);

    expect(svg).toContain('width="1179" height="2556"');
    expect(svg).toContain(`fill="${LOGO_BACKDROP}"`);
    // 1179 / 3 = 393, so (1179 - 393) / 2 across and (2556 - 393) / 2 down.
    expect(svg).toContain("translate(393 1081.5)");
  });

  it("measures the die against the short side in landscape too", () => {
    expect(splashSvg(2556, 1179)).toContain("scale(0.7676)");
  });
});

describe("splashUrl", () => {
  it("files an image under its pixel size", () => {
    expect(splashUrl({ width: 828, height: 1792 })).toBe(
      "/pwa/splash-828x1792.png",
    );
  });
});

describe("splashSizes", () => {
  it("asks for both orientations of a screen", () => {
    expect(splashSizes([phone])).toEqual([
      { width: 1200, height: 2400 },
      { width: 2400, height: 1200 },
    ]);
  });

  it("asks for a shared screen once", () => {
    expect(splashSizes([phone, twin])).toHaveLength(2);
  });

  it("covers the real table", () => {
    expect(splashSizes()).toHaveLength(APPLE_DEVICES.length * 2);
  });
});

describe("appleStartupImages", () => {
  it("names the screen in the media query, and the way it is held", () => {
    const [portrait, landscape] = appleStartupImages([phone]);

    expect(portrait.media).toBe(
      "(device-width: 400px) and (device-height: 800px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    );
    expect(portrait.url).toBe("/pwa/splash-1200x2400.png");

    // The device keeps its portrait dimensions when turned: only `orientation`
    // says which way up it is, and the image is the one that swaps round.
    expect(landscape.media).toContain("(device-width: 400px)");
    expect(landscape.media).toContain("(orientation: landscape)");
    expect(landscape.url).toBe("/pwa/splash-2400x1200.png");
  });

  it("points every link at an image the generator writes", () => {
    // The one thing that must never drift: iOS ignores a launch image whose
    // size doesn't match the screen exactly, and shows a white screen instead.
    const written = new Set(splashSizes().map(splashUrl));
    const linked = appleStartupImages();

    expect(linked).toHaveLength(APPLE_DEVICES.length * 2);
    expect(linked.filter(image => !written.has(image.url))).toEqual([]);
  });
});
