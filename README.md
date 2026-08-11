# Temple Committee

Fully offline desktop app for Sri Lankan Buddhist temple community records.

## Stack

- Electron + React + Vite + TypeScript
- SQLite via Node built-in `node:sqlite` (no native compile / Visual Studio required)
- electron-builder (NSIS) for Windows installer updates via USB

## Defaults

- **Admin password:** `admin123` (change in Settings after first unlock)
- **Database:** `%AppData%\TempleCommunity\data\temple.sqlite`
- **Backups:** `%AppData%\TempleCommunity\backups\`

## Develop

```bash
npm install
npm run electron:dev
```

## Demo data

With the app closed (or after first launch so the DB exists):

```bash
npm run seed
```

Add another batch even if data exists:

```bash
npm run seed:force
```

Optional: `TEMPLE_DB_PATH=C:\path\to\temple.sqlite npm run seed`

## Branding assets

| File | Purpose |
|------|---------|
| `resources/icon.ico` | Windows exe / installer / taskbar (multi-size 16–256) |
| `resources/icon.png` | Window icon fallback + packaged resource |
| `resources/splash.png` + `resources/splash.html` | Startup splash screen |
| `resources/logo-wide.png` | Wide brand banner (also copied to `src/assets`) |
| `resources/icons/*` | Source size variants (kept for edits) |
| `src/assets/logo.png` | Round mark (home hero accent) |
| `src/assets/logo-wide.png` | Public header brand banner |
| `src/assets/logo-mark.png` | Admin sidebar mark |
| `public/favicon.ico` | Browser/dev tab favicon |

Replace those files (same names) and rebuild to update branding.

## Build installer

```bash
npm run dist
```

Copy `TempleCommittee-Setup-*.exe` from `release/` to a USB and run it on the temple PC. Installer uses branded green sidebars, creates Desktop + Start Menu shortcuts, and can launch after finish. Application data (database, backups, window size) is kept in AppData across upgrades — uninstall does **not** delete records. Only one instance runs at a time — opening the shortcut again focuses the existing window.

## Modes

- **Public:** search / view / submit pending create-update requests (no login)
- **Admin:** unlock with shared password — houses, people, attendance, documents, approvals, backup

## TODO

- Replace `custom_field_1..5` with real Sinhala paper-form attributes
- Named users / roles
- PDF export
