// ESLint 9 flat config. Replaces .eslintrc.json, which ESLint 9 no longer reads
// by default, and replaces `next lint`, which Next 16 removed — package.json now
// invokes eslint directly.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "public/sw.js", "storage/**"],
  },
  {
    rules: {
      // Item photos are served by the authenticated /api/files route, which
      // next/image cannot optimise without extra loader configuration for a
      // route that requires a session. Plain <img> is deliberate here, so the
      // rule is off project-wide instead of disabled at each call site.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
