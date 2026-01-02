import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@/core": resolve(__dirname, "./src/core"),
            "@/chart": resolve(__dirname, "./src/chart"),
            "@/components": resolve(__dirname, "./src/components"),
            "@/utils": resolve(__dirname, "./src/utils"),
            "@/types": resolve(__dirname, "./src/types"),
        },
    },
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "CopettiCharts",
            formats: ["es"],
            fileName: "index",
        },
        rollupOptions: {
            external: ["react", "react-dom"],
            output: {
                globals: {
                    react: "React",
                    "react-dom": "ReactDOM",
                },
            },
        },
        sourcemap: true,
        minify: "esbuild",
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
        },
    },
});
