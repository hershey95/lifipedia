import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 이행 브리지: 라이트 시절 토큰 ink 를 다크 본문색(fg) 변수로 재정의. 파일별 치환이 끝나면 삭제.
        ink: 'rgb(var(--fg) / <alpha-value>)',
        accent: { DEFAULT: '#3b5bdb', fg: 'rgb(var(--accent-fg) / <alpha-value>)' },
        budget: '#2f9e44',
        mid: '#f08c00',
        premium: { DEFAULT: '#9c36b5', fg: 'rgb(var(--premium-fg) / <alpha-value>)' },
      },
    },
  },
  plugins: [],
};
export default config;
