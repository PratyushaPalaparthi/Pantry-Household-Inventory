/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind 4 moved its PostCSS plugin into a separate package.
    "@tailwindcss/postcss": {},
  },
};

export default config;
