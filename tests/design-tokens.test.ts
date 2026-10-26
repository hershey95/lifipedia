import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app/globals.css', 'utf8');
const tw = readFileSync('tailwind.config.ts', 'utf8');

/** 선택자 블록(`:root,\n[data-theme="dark"]` 등) 안의 `--name: value;` 선언을 모은다. */
function vars(selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start));
  return new Map([...body.matchAll(/^\s*--([\w-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
}

const dark = vars('[data-theme="dark"]');
const light = vars('[data-theme="light"]');
const used = [...tw.matchAll(/v\('([\w-]+)'\)/g)].map((m) => m[1]);

describe('design tokens', () => {
  it('tailwind 가 참조하는 모든 변수가 다크 블록에 있다', () => {
    expect(used.length).toBeGreaterThan(20);
    expect(used.filter((n) => !dark.has(n))).toEqual([]);
  });

  it('색 변수는 RGB 세 채널(0~255)이거나 다른 변수 참조다', () => {
    for (const [name, val] of dark) {
      if (name === 'max-width' || val.startsWith('var(')) continue;
      const ch = val.split(/\s+/).map(Number);
      expect(ch, name).toHaveLength(3);
      expect(ch.every((n) => Number.isInteger(n) && n >= 0 && n <= 255), name).toBe(true);
    }
  });

  it('라이트 블록은 다크에 없는 변수를 만들지 않는다', () => {
    expect([...light.keys()].filter((n) => !dark.has(n))).toEqual([]);
  });

  it('라이트 전환 시 본문 대비가 뒤집힌다 (fg 가 bg 보다 어두움)', () => {
    const lum = (v: string) => v.split(/\s+/).map(Number).reduce((a, b) => a + b, 0);
    expect(lum(light.get('fg')!)).toBeLessThan(lum(light.get('bg')!));
    expect(lum(dark.get('fg')!)).toBeGreaterThan(lum(dark.get('bg')!));
  });

  it('prefers-color-scheme 자동 적용은 아직 없다 (4c 가드 통과 전)', () => {
    expect(css).not.toContain('prefers-color-scheme');
  });
});
