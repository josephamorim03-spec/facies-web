import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "out/**", "node_modules/**", ".tmp*/**", "pytest*/**", "playwright-report/**", "test-results/**"],
  },
];

export default config;
