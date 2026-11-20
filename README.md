# Baldur's Cake

An interactive, zero-build-step dungeon escape puzzle built for **GitHub Pages**.

Every chamber is gated by **authenticated encryption (`PBKDF2-SHA256` + `AES-256-GCM`)**: the answer to Chamber `N` is the cryptographic key that decrypts Chamber `N + 1` in `data/rooms.js`. Players cannot peek at future chambers or passphrases from the HTML, JavaScript, or data bundle.

## Structure
- **10 Chambers (`I–X`) + Victory Courtyard (`✦`)**: Every chamber introduces a distinct tactile, audio, logic, or forensic mechanic, culminating in a final metapuzzle (`Chamber X`).
- **Story Chronicle (`📖`)**: Tracks each unlocked chamber's chronicle along your run.
- **No Built-In Hints**: Pure solve-and-extract progression with local `localStorage` save state and Web Audio synthesis.

## Deploying to GitHub Pages
1. Push this repository to GitHub (`authoring/rooms.secret.json`, `HANDOVER.md`, and `PUZZLE_INSPIRATION.md` remain ignored via `.gitignore`).
2. Open **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and click **Save**.

> **Note on Web Crypto:** `crypto.subtle` requires a secure context (`https://` on GitHub Pages or `http://localhost`).
