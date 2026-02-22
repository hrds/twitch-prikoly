Install dependencies:
```sh
bun install
```

Run backend in dev mode:
```sh
bun run dev
```

Build sidecar for current host target:
```sh
bun run build:sidecar
```

Build sidecars for a release matrix (macOS arm64/x64, linux x64, windows x64):
```sh
bun run build:sidecar:matrix
```

Build sidecar for explicit Bun target(s):
```sh
bun run build:sidecar -- --target bun-darwin-arm64
bun run build:sidecar -- --target bun-darwin-arm64,bun-windows-x64
```
