import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:1420", // tauri dev (your case)
      "http://127.0.0.1:1420", // if you ever use this
      "tauri://localhost", // tauri prod (common)
      "https://tauri.localhost", // tauri prod (common)
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    // credentials: true, // enable ONLY if you need cookies/auth headers and then DON'T use '*' origin
  }),
);

function resolvePort(): number {
  const portArgIndex = Bun.argv.findIndex((arg) => arg === "--port");
  if (portArgIndex >= 0) {
    const maybePort = Number(Bun.argv[portArgIndex + 1]);
    if (Number.isFinite(maybePort) && maybePort >= 0) {
      return maybePort; // allow 0
    }
  }
  return Number(Bun.env.SIDECAR_PORT ?? "3187");
}

app.get("/health", (c) => {
  return c.json({ ok: true, runtime: "bun" });
});

app.get("/hello", (c) => {
  return c.json({ message: "Hello from Hono sidecar!" });
});

app.get("/", (c) => c.text("Twitch sidecar backend is running"));

const port = resolvePort();

export default {
  port,
  hostname: "127.0.0.1",
  fetch: app.fetch,
};
