2026-05-04: Kept the existing Korean rhwp-studio same-origin/COOP-COEP comments in `next.config.ts` and normalized the config to a single exported typed object.
2026-05-04: Added a three-stage Dockerfile (`deps`, `builder`, `runner`) on `node:22-bookworm-slim` with a non-root runtime user and standalone server startup.
