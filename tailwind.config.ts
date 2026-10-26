import type { Config } from 'tailwindcss';

const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 이행 브리지: 라이트 시절 토큰 ink 를 다크 본문색(fg) 변수로 재정의. 파일별 치환이 끝나면 삭제.
        ink: 'rgb(var(--fg) / <alpha-value>)',
        bg: { DEFAULT: v('bg'), subtle: v('bg-subtle'), inset: v('bg-inset') },
        surface: { DEFAULT: v('surface'), raised: v('surface-raised') },
        border: { DEFAULT: v('border'), strong: v('border-strong') },
        fg: { DEFAULT: v('fg'), muted: v('fg-muted'), subtle: v('fg-subtle'), disabled: v('fg-disabled') },
        accent: { DEFAULT: v('accent'), hover: v('accent-hover'), fg: v('accent-fg'), soft: v('accent-soft') },
        'link-visited': v('link-visited'),
        success: { fg: v('success-fg'), bg: v('success-bg') },
        warn: { fg: v('warn-fg'), bg: v('warn-bg') },
        danger: { fg: v('danger-fg'), bg: v('danger-bg') },
        'tier-budget': { fg: v('tier-budget-fg'), bg: v('tier-budget-bg'), solid: v('tier-budget-solid') },
        'tier-mid': { fg: v('tier-mid-fg'), bg: v('tier-mid-bg'), solid: v('tier-mid-solid') },
        'tier-premium': { fg: v('tier-premium-fg'), bg: v('tier-premium-bg'), solid: v('tier-premium-solid') },
        // 이행 별칭: 4b 치환 후 삭제
        budget: '#2f9e44',
        mid: '#f08c00',
        premium: { DEFAULT: '#9c36b5', fg: v('premium-fg') },
      },
    },
  },
  plugins: [],
};
export default config;
