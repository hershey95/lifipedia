import { describe, expect, it } from 'vitest';
import { httpUrl } from '@/lib/api';

describe('httpUrl', () => {
  it('http(s) 주소만 통과', () => {
    expect(httpUrl.safeParse('https://example.com/a?b=1').success).toBe(true);
    expect(httpUrl.safeParse('http://example.com').success).toBe(true);
  });
  it('javascript:/data:/file:/ftp: 와 일반 문자열은 거부', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'ftp://x.com', 'example.com']) {
      expect(httpUrl.safeParse(bad).success).toBe(false);
    }
  });
});
