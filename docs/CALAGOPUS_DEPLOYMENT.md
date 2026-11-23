# Petalnodes Sanctuary Theme (`cloud.petalnodes.sanctuary`) — Calagopus Deployment Guide

This guide documents how to build, validate, install, activate, and roll back the **Petalnodes Sanctuary Theme** (`cloud.petalnodes.sanctuary` v2.1.0) extension package (`cloud_petalnodes_sanctuary.c7s.zip`) on Calagopus Panel (`panel_version >= 1.1.0`).

---

## 1. Verified Package Structure (`cloud_petalnodes_sanctuary.c7s.zip`)

`cloud_petalnodes_sanctuary.c7s.zip` is a reproducible Deflate ZIP extension archive structured for Calagopus Panel's extension importer (`shared/src/extensions/distr.rs`) and Vite component override plugin (`vite-plugins/extension-overrides.ts`):

- `Metadata.toml` — top-level keys (`package_name = "cloud.petalnodes.sanctuary"`, `name = "Petalnodes Sanctuary Theme"`, `panel_version = ">=1.1.0"`)
- `backend/` and `backend/src/`
  - `backend/Cargo.toml` — crate `cloud_petalnodes_sanctuary` using workspace dependencies (`shared`, `async-trait`, `tracing`)
  - `backend/src/lib.rs` — defines `pub struct ExtensionStruct` implementing `shared::extensions::Extension`
- `frontend/` and `frontend/src/`
  - `frontend/package.json` — `"name": "cloud.petalnodes.sanctuary"`, `"version": "2.1.0"`, `"main": "src/index.tsx"`, `"types": "src/index.tsx"`, `"dependencies": { "shared": "workspace:*", ... }`
  - `frontend/src/index.tsx` — default-exports `PetalnodesSanctuaryExtension` subclassing `Extension` from `'shared'`, configuring `blushThemeConfig`, `blushCssVariablesResolver`, `enterThemes((t) => t.disableVariants({ schemes: ['light', 'dark'] }))`, global `AmbientPetalBackground`, font injection, and `enterRoutes` (`/server/:id/minecraft` and `/account/notifications`)
  - `frontend/src/overrides.ts` + `frontend/src/overrides/*.tsx` — official `defineOverride(Original, Replacement)` declarations replacing Calagopus shell, navigation, auth wrapper, cards, dashboard server grid, server cards, and admin overview while preserving `makeComponentHookable` and third-party extension slots
  - `frontend/src/app.css` — `:root[data-petalnodes-theme]` scoped Light/Midnight Dark CSS variables and Mantine/Tailwind styling

Local development helpers (`frontend/src/shared-adapter.ts`, `frontend/tsconfig.json`, `*.test.ts`, `node_modules/`, `.env*`, `dist/`) are excluded from the archive so Calagopus Panel compiles cleanly against its native `shared` workspace package.

---

## 2. Rebuilding & Validating the Package Locally

Run both commands from the repository root:

```bash
npm run package:c7s
npm run verify:c7s
```

---

## 3. Installation & Activation on Calagopus VPS

```bash
panel-rs extensions add ./cloud_petalnodes_sanctuary.c7s.zip
panel-rs extensions apply
systemctl restart calagopus-panel
```

Or upload `cloud_petalnodes_sanctuary.c7s.zip` via **Admin Panel > Extensions**.

---

## 4. Rollback Procedure

```bash
panel-rs extensions remove cloud.petalnodes.sanctuary
panel-rs extensions apply
systemctl restart calagopus-panel
```
