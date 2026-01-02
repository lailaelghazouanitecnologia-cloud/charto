/**
 * Simple Bun development server.
 */

const PORT = 3000;

Bun.serve({
    port: PORT,
    async fetch(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const path = url.pathname;

        // Serve index.html for root.
        if (path === "/" || path === "/index.html") {
            const file = Bun.file("./public/index.html");
            return new Response(file, {
                headers: { "Content-Type": "text/html" },
            });
        }

        // Build and serve app.js.
        if (path === "/app.js") {
            const result = await Bun.build({
                entrypoints: ["./src/app.ts"],
                minify: false,
            });

            if (result.success && result.outputs[0] !== undefined) {
                const text = await result.outputs[0].text();
                return new Response(text, {
                    headers: { "Content-Type": "application/javascript" },
                });
            }

            return new Response("Build failed", { status: 500 });
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server running at http://localhost:${PORT}`);
