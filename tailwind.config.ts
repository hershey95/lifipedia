import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12131a',
        paper: '#fbfbfd',
        accent: '#3b5bdb',
        budget: '#2f9e44',
        mid: '#f08c00',
        premium: '#9c36b5',
      },
    },
  },
  plugins: [],
};
export default config;
