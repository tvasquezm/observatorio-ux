import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/theme.css', 'utf8');

function themeColors(dark: boolean) {
  const light: Record<string, string> = {};
  const override: Record<string, string> = {};
  for (const [, selector, block] of css.matchAll(/^:root(\[data-theme='dark'\])?\s*\{([^}]+)\}/gm)) {
    const colors = selector ? override : light;
    for (const [, name, value] of block.matchAll(/--(ink|surface|teal):\s*(#[\da-f]{6})\s*;/gi)) {
      colors[name] = value;
    }
  }
  return dark ? { ...light, ...override } : light;
}

function rgb(hex: string): number[] {
  return hex.slice(1).match(/../g)!.map(value => Number.parseInt(value, 16) / 255);
}

function luminance(color: number[]): number {
  const [r, g, b] = color.map(channel =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe.each([{ tema: 'claro', dark: false }, { tema: 'oscuro', dark: true }])('matriz en tema $tema', ({ dark }) => {
  it.each([0, 0.25, 0.5, 0.75, 1])('contraste de texto con intensidad %s', intensity => {
    const rule = css.match(/\.cs-matrix-cell\.heat\s*\{([^}]+)\}/)?.[1];
    const coefficient = rule?.match(/calc\(12% \+ var\(--cell-intensity\) \* (\d+)%\)/)?.[1];
    expect(coefficient).toBeDefined();
    const colors = themeColors(dark);
    const teal = rgb(colors.teal);
    const proportion = (12 + intensity * Number(coefficient)) / 100;
    const cell = rgb(colors.surface).map((channel, index) => channel * (1 - proportion) + teal[index] * proportion);
    const background = luminance(cell);
    const foreground = luminance(rgb(colors.ink));
    const ratio = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
