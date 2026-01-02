import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist", "node_modules"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2024,
            globals: globals.browser,
            parserOptions: {
                project: ["./tsconfig.json"],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            // React rules.
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

            // TypeScript strict rules.
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/strict-boolean-expressions": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/prefer-readonly": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",

            // Code style rules following the guide.
            "no-magic-numbers": [
                "error",
                {
                    ignore: [-1, 0, 1, 2],
                    ignoreArrayIndexes: true,
                    enforceConst: true,
                },
            ],
            "max-depth": ["error", 3],
            "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
            curly: ["error", "all"],
            eqeqeq: ["error", "always"],
            "no-var": "error",
            "prefer-const": "error",
            "no-nested-ternary": "error",
            "no-else-return": "error",
            "default-case": "error",
            "default-case-last": "error",
        },
    },
);
