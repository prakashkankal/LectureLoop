# LectureLoop Oral Test Module

An oral-practice app that opens directly to its dashboard and accepts lecture notes from the LectureLoop learning app. A user-triggered, origin-checked browser message transfers the selected lecture notes to the oral-practice screen. Practice history is stored locally and scoped to this browser.

## Requirements

- Node.js 20 or newer and npm.
- Microphone access is optional. Browser speech recognition availability and Hindi-English mixed-language quality depend on the browser and operating system.

## Setup and run

From this folder:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://127.0.0.1:5179>. The API health check is at <http://127.0.0.1:4179/api/health>.

To make a test from a learning-app lecture, start the LectureLoop learning client at <http://localhost:5173> and this module with `npm run dev`. Oral Practice opens directly to the dashboard without account sign-in. Click **Use lecture notes**, choose a lecture in the LectureLoop library tab, then click **Practice orally** on that lecture. Its notes appear in Oral Practice for review; click **Begin oral practice** when ready. Alternatively, click **Practice orally** directly from the learning app to open Oral Practice and import that lecture. The handoff accepts notes only from the local LectureLoop client origin.

This module runs without paid AI APIs or provider keys. It uses local note-based question prompts and heuristic feedback. Browser speech recognition is optional; typed answers are always available. Cloud translation and cloud audio transcription are not included.

```powershell
npm run build
npm test
npm run lint
```

The module data is kept in `server/data/oral-practice.sqlite` by default. To use another local path, set `DATA_DIR`. `JWT_SECRET` should be changed from the development fallback before exposing the API beyond the local machine. Keep the app on a trusted device: the local database stores submitted text and feedback in plaintext and is not intended as a hosted multi-tenant deployment.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | Local API port; default `4179`. |
| `CLIENT_ORIGIN` | Allowed client origin; default `http://127.0.0.1:5179`. |
| `JWT_SECRET` | Signs module-only account tokens. Use a long random value. |
| `DATA_DIR` | Isolated SQLite location; default `./data` relative to the server process. |
| `FILLER_EXPRESSIONS` | Comma-separated expressions; default `um,uh,actually,basically,you know,like`. |

## Learning material import

The dashboard includes two sample note sets. You can edit the notes in place or import `.txt` notes. JSON imports accept either the object itself or `{ "material": { ... } }`:

```json
{
  "schemaVersion": 1,
  "subject": "Database Systems",
  "lecture": "Relational normalization",
  "topic": "Functional dependencies",
  "notes": "Paste source-grounded lecture notes here. At least 20 characters are required.",
  "keyTerms": ["functional dependency", "candidate key"]
}
```

The API exposes `GET /api/materials`, `POST /api/questions`, `POST /api/evaluate`, and `GET`/`DELETE` `/api/attempts` endpoints. Requests are validated and rate-limited. A random local browser identifier scopes guest practice history to that browser; answers are sent only to this local API and stored in the local SQLite database. Audio recordings are not uploaded.

## Feature behavior and limitations

- Questions use only supplied notes. Local prompts are formed from the note sentences; they are a demo fallback, not adaptive question generation.
- Scores are local heuristics. Content uses note/key-term overlap; language uses a lightweight length/punctuation estimate. It cannot reliably judge grammar, concept equivalence, completeness, or valid alternative explanations.
- Browser speech synthesis reads questions aloud. Browser `SpeechRecognition` is used when present. If unavailable or denied, type/edit the answer instead. Speech recognition behavior and language quality depend on browser support.
- Hinglish can be used in practice mode, but no automatic translation is provided. Speech recognition quality varies by browser, language, and accent.
- Pace uses submitted word count divided by total answer duration. Speech pauses cannot be removed reliably, so the result is labeled approximate. Filler and “like” detection is transcript-based and may misclassify meaningful language.
- Sample data is learning material, not saved test history. Progress charts are calculated from the current browser's actual saved attempts. Clearing this browser's site data creates a new practice history. No recordings or fake historical scores are stored.
- SQLite is a lightweight local demonstration store loaded into memory and serialized to disk on writes. Use an encrypted, production-grade storage and deployment design before hosting private student data.

## Module structure

```text
oral-test-module/
  client/       React/Vite screens, browser speech adapters, charts
  server/       Express API, auth, SQLite, local question and assessment services
  .env.example
  eslint.config.js
  package.json
  README.md
```