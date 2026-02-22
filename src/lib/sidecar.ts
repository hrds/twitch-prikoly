import { Command } from "@tauri-apps/plugin-shell";

const SIDECAR_HEALTH_URL = "http://127.0.0.1:3187/health";
const SIDECAR_HEALTH_TIMEOUT_MS = 10000;
const SIDECAR_HEALTH_POLL_MS = 250;
const SIDECAR_HEALTH_REQUEST: RequestInit = { cache: "no-store" };

const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let sidecarStartPromise: Promise<void> | null = null;

async function isSidecarHealthy(): Promise<boolean> {
  try {
    const response = await fetch(SIDECAR_HEALTH_URL, SIDECAR_HEALTH_REQUEST);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForSidecarHealth(): Promise<void> {
  const startAt = Date.now();

  while (Date.now() - startAt < SIDECAR_HEALTH_TIMEOUT_MS) {
    try {
      const response = await fetch(SIDECAR_HEALTH_URL, SIDECAR_HEALTH_REQUEST);
      if (response.ok) {
        return;
      }
    } catch {
      // Sidecar has not started serving yet.
    }

    await new Promise((resolve) => setTimeout(resolve, SIDECAR_HEALTH_POLL_MS));
  }

  throw new Error("Timed out waiting for sidecar health endpoint");
}

export async function ensureSidecarReady(): Promise<void> {
  if (!isTauriRuntime) {
    return;
  }

  if (await isSidecarHealthy()) {
    return;
  }

  if (sidecarStartPromise) {
    return sidecarStartPromise;
  }

  sidecarStartPromise = (async () => {
    const command = Command.sidecar("binaries/twitch-backend", ["--port", "3187"]);

    command.stdout.on("data", (line) => {
      console.info("[sidecar]", line);
    });

    command.stderr.on("data", (line) => {
      console.error("[sidecar]", line);
    });

    try {
      await command.spawn();
    } catch (error) {
      if (await isSidecarHealthy()) {
        return;
      }

      throw new Error(
        `Failed to spawn sidecar and no healthy instance detected. Verify compiled binary exists and shell spawn permissions are set. ${String(error)}`,
      );
    }

    await waitForSidecarHealth();
  })();

  try {
    await sidecarStartPromise;
  } catch (error) {
    sidecarStartPromise = null;
    throw error;
  }
}
