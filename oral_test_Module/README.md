# LectureLoop Oral Test Module

An independent student oral-practice app. It runs separately from the LectureLoop client and API; it does not import their source, MongoDB models, authentication, routes, or database.

## Requirements

- Node.js 20 or newer and npm.
- Optional OpenAI API key for source-grounded question generation, semantic answer feedback, Hinglish translation, and server-side audio transcription.
- Microphone access is optional. Browser speech recognition availability and Hindi-English mixed-language quality depend on the browser and operating system.

## Setup and run

From this folder:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://127.0.0.1:5179>. The API health check is at <http://127.0.0.1:4179/api/health>.

For AI feedback, set `OPENAI_API_KEY` in this folder's `.env`. Never put provider credentials in client code. Without a key, sample materials, browser speech controls, local question prompts, answer history, and clearly labeled heuristic scoring are available. Translation returns the supplied text unchanged and says translation is unavailable rather than pretending to translate.

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
| `OPENAI_API_KEY` | Optional server-side key for AI and transcription features. |
| `OPENAI_MODEL` | Chat model for questions, evaluation, and translation; default `gpt-4o-mini`. |
| `OPENAI_TRANSCRIPTION_MODEL` | Audio transcription model; default `gpt-4o-mini-transcribe`. |
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

The API also exposes authenticated `GET /api/materials`, `POST /api/questions`, `POST /api/evaluate`, `POST /api/transcribe`, `POST /api/language-assist`, and per-account `GET`/`DELETE /api/attempts` endpoints. Requests are validated; API calls are rate-limited. Attempt history is owner-scoped. Audio is held in memory only for the transcription request and is not written to disk.

## Feature behavior and limitations

- Questions use only supplied notes. With no AI key, local prompts are formed from the note sentences; they are a demo fallback, not adaptive question generation.
- With an AI key, question content, model answers, language corrections, vocabulary use, and separate 0–10 content/language scores are provider-generated and schema-validated against the supplied notes. AI output can still be wrong; check the source material.
- Without AI, the app labels scores as local heuristics. Content uses note/key-term overlap; language uses a lightweight length/punctuation estimate. It cannot reliably judge grammar, concept equivalence, completeness, or valid alternative explanations.
- Browser speech synthesis reads questions aloud. Browser `SpeechRecognition` is used when present; recorded audio can instead be sent to the configured transcription adapter. If neither works, type/edit the answer. Permission errors, unavailable recognition, empty transcripts, and provider failures leave the text answer path available.
- Hindi-English mixed recognition and translation quality vary by browser, transcription model, language, and accent. The language helper is explicitly practice assistance, not an independent assessment. It does not lower a content score merely because the assessment mode is practice.
- Pace uses submitted word count divided by total answer duration. Speech pauses cannot be removed reliably, so the result is labeled approximate. Filler and “like” detection is transcript-based and may misclassify meaningful language.
- Sample data is learning material, not saved test history. Progress charts are calculated only from the signed-in user's actual saved attempts. No recordings or fake historical scores are stored.
- SQLite is a lightweight local demonstration store loaded into memory and serialized to disk on writes. Use an encrypted, production-grade storage and deployment design before hosting private student data.

## Module structure

```text
oral-test-module/
  client/       React/Vite screens, browser speech adapters, charts
  server/       Express API, auth, SQLite, assessment/provider services
  .env.example
  eslint.config.js
  package.json
  README.md
```