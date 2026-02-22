import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

type BunTarget =
  | "bun-darwin-arm64"
  | "bun-darwin-x64"
  | "bun-linux-arm64"
  | "bun-linux-x64"
  | "bun-linux-x64-baseline"
  | "bun-linux-x64-modern"
  | "bun-linux-x64-musl"
  | "bun-linux-arm64-musl"
  | "bun-windows-x64"
  | "bun-windows-x64-baseline"
  | "bun-windows-x64-modern";

type TargetSpec = {
  tauriTriple: string;
  extension: "" | ".exe";
};

const TARGET_SPECS: Record<BunTarget, TargetSpec> = {
  "bun-darwin-arm64": { tauriTriple: "aarch64-apple-darwin", extension: "" },
  "bun-darwin-x64": { tauriTriple: "x86_64-apple-darwin", extension: "" },
  "bun-linux-arm64": { tauriTriple: "aarch64-unknown-linux-gnu", extension: "" },
  "bun-linux-x64": { tauriTriple: "x86_64-unknown-linux-gnu", extension: "" },
  "bun-linux-x64-baseline": {
    tauriTriple: "x86_64-unknown-linux-gnu",
    extension: "",
  },
  "bun-linux-x64-modern": {
    tauriTriple: "x86_64-unknown-linux-gnu",
    extension: "",
  },
  "bun-linux-x64-musl": { tauriTriple: "x86_64-unknown-linux-musl", extension: "" },
  "bun-linux-arm64-musl": {
    tauriTriple: "aarch64-unknown-linux-musl",
    extension: "",
  },
  "bun-windows-x64": { tauriTriple: "x86_64-pc-windows-msvc", extension: ".exe" },
  "bun-windows-x64-baseline": {
    tauriTriple: "x86_64-pc-windows-msvc",
    extension: ".exe",
  },
  "bun-windows-x64-modern": {
    tauriTriple: "x86_64-pc-windows-msvc",
    extension: ".exe",
  },
};

const DEFAULT_MATRIX_TARGETS: BunTarget[] = [
  "bun-darwin-arm64",
  "bun-darwin-x64",
  "bun-linux-x64",
  "bun-windows-x64",
];

const HOST_TARGETS: Record<string, Record<string, BunTarget>> = {
  darwin: {
    arm64: "bun-darwin-arm64",
    x64: "bun-darwin-x64",
  },
  linux: {
    arm64: "bun-linux-arm64",
    x64: "bun-linux-x64",
  },
  win32: {
    x64: "bun-windows-x64",
  },
};

function isBunTarget(value: string): value is BunTarget {
  return value in TARGET_SPECS;
}

function parseTargetsFromArgs(): BunTarget[] {
  const args = Bun.argv.slice(2);
  const explicitTargets: BunTarget[] = [];
  let matrixMode = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--matrix") {
      matrixMode = true;
      continue;
    }

    if (arg === "--target") {
      const next = args[i + 1];
      if (!next) {
        throw new Error("--target requires a value");
      }

      for (const candidate of next.split(",").map((item) => item.trim())) {
        if (!candidate) {
          continue;
        }

        if (!isBunTarget(candidate)) {
          throw new Error(`Unsupported Bun target: ${candidate}`);
        }

        explicitTargets.push(candidate);
      }

      i += 1;
      continue;
    }
  }

  if (explicitTargets.length > 0) {
    return Array.from(new Set(explicitTargets));
  }

  if (matrixMode) {
    return DEFAULT_MATRIX_TARGETS;
  }

  const platformTargets = HOST_TARGETS[process.platform];
  if (!platformTargets) {
    throw new Error(`Unsupported host platform: ${process.platform}`);
  }

  const hostTarget = platformTargets[process.arch];
  if (!hostTarget) {
    throw new Error(
      `Unsupported host architecture/platform: ${process.arch}/${process.platform}`,
    );
  }

  return [hostTarget];
}

async function buildTarget(target: BunTarget, binariesDir: string): Promise<void> {
  const spec = TARGET_SPECS[target];
  const outputPath = resolve(
    binariesDir,
    `twitch-backend-${spec.tauriTriple}${spec.extension}`,
  );

  const processHandle = Bun.spawn(
    [
      "bun",
      "build",
      "--compile",
      `--target=${target}`,
      "src/index.ts",
      "--outfile",
      outputPath,
    ],
    {
      stdio: ["inherit", "inherit", "inherit"],
    },
  );

  const exitCode = await processHandle.exited;
  if (exitCode !== 0) {
    throw new Error(`Failed to compile sidecar for ${target} (exit code ${exitCode})`);
  }

  console.log(`Compiled ${target} -> ${outputPath}`);
}

async function main(): Promise<void> {
  const targets = parseTargetsFromArgs();
  const binariesDir = resolve("..", "src-tauri", "binaries");
  mkdirSync(binariesDir, { recursive: true });

  for (const target of targets) {
    await buildTarget(target, binariesDir);
  }
}

void main();
