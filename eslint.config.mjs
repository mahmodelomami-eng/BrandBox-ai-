import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/components/HomeExperience.jsx", "src/components/GlobalNavigation.jsx", "src/components/ImageStudioWorkspace.jsx", "src/app/admin/home-content/page.jsx"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["src/components/ImageStudioWorkspace.jsx"],
    rules: {
      // Legacy callbacks in the image studio predate React Compiler. Keep this
      // exception local until the studio lifecycle is refactored; do not weaken
      // compiler checks for the rest of the application.
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

export default eslintConfig;
