# SDD — OpenRouter STT Audio Transcriber SPA

**Version:** 1.0
**Status:** Approved — implementation not yet started
**Owner:** TBD
**Last updated:** 2026-09-26

---

## 1. Summary

A static single-page application (React + TypeScript + Tailwind + Vite) that converts long
audio files into a single stitched text transcript. The browser decodes files of any common
format, splits them into model-safe chunks, calls OpenRouter's
`POST /api/v1/audio/transcriptions` endpoint using a **user-supplied API key**, and stitches
the returned text back together.

There is **no backend**. The API key never leaves the browser and is transmitted only to
`openrouter.ai`.

---

## 2. Goals

- Accept all common audio containers/codecs: `mp3`, `m4a`/`mp4`, `mov`, `wav`, `flac`, `ogg`,
  `opus`, `webm`, `mkv`, `aac`, `ts`.
- Handle files up to **~2 GB / ~4 hours** without freezing or crashing the tab.
- Chunk audio to satisfy STT provider limits (payload size and processing timeout), then
  stitch transcripts seamlessly.
- BYOK: the user pastes their OpenRouter API key in the UI.
- Chromium-first (Chrome/Edge).

---

## 3. Non-goals (v1)

- Timestamps, SRT/VTT export, word-level timings, speaker diarization, translation.
- Real-time microphone / streaming transcription.
- Backend proxy, user accounts, persisted server-side history.
- Inline transcript editing (read-only output with copy/download only).

---

## 4. Tech stack

| Concern | Choice | Why |
|---|---|---|
| UI | React 18 + TypeScript + Vite | Fast, simple static build |
| Styling | TailwindCSS | Requested |
| State | Zustand | Lightweight, suited to a pipeline state machine |
| Media I/O | **Mediabunny** + `@mediabunny/mp3-encoder` | Zero-dependency, streaming demux/decode/encode via WebCodecs; covers all target containers; MP3/FLAC encoding polyfilled via small extensions |
| Decode/Encode | WebCodecs (`AudioDecoder`/`AudioEncoder`) via Mediabunny | Hardware-accelerated, low memory, streaming |
| STT client | `@openrouter/sdk` (`stt.createTranscription`, ESM) with a raw-`fetch` fallback | Type-safe; SDK ships STT helpers; only dependency is `zod` |
| Concurrency | Small custom async pool | Control parallelism + retry |
| Tests | Vitest (unit + integration) | Standard; e2e deferred |

**Explicitly excluded:** `ffmpeg.wasm`. It loads entire files into memory and would undermine
the ~2 GB target.

---

## 5. Pipeline architecture

Media work runs inside a **Web Worker**; the UI thread handles only state and rendering.
`ArrayBuffer`s are *transferred* (not cloned) between worker and main thread.

1. **Ingest** — drag/drop or file picker. Validate MIME/extension/size. Read duration and
   track list via Mediabunny `Input` over a `BlobSource` (streams from the `File`; does not
   load it whole).
2. **Plan** — compute a chunk plan: default chunk length **300 s**, overlap **15 s**,
   boundaries snapped to silence. Block with a clear message if the file exceeds the
   configured cap.
3. **Decode + slice** — stream packets, decode to `AudioSample`, downmix + resample to
   **16 kHz mono**, and append to a bounded PCM ring buffer. At each boundary, scan signal
   energy in `[target − O, target + O]` and cut at the quietest window; hard-cut if no
   suitable window exists.
4. **Encode** — encode each PCM slice to **MP3 mono @ 64 kbps** via Mediabunny
   (`BufferTarget` + `@mediabunny/mp3-encoder`). ~300 s ≈ 2.4 MB → ~3.2 MB base64, safely
   under payload limits and faster to upload than WAV. WAV is the fallback if MP3 encode is
   unavailable.
5. **Transcribe** — base64-encode one chunk at a time and POST to OpenRouter STT.
   Concurrency **2**; exponential backoff on 429/5xx; honor `Retry-After`; `AbortController`
   for cancel. Progress is reported per chunk.
6. **Stitch** — for each chunk in order, detect the longest suffix/prefix token overlap
   between the previous transcript tail and the current head, drop the duplicate, and
   concatenate.
7. **Present** — read-only transcript; copy; download `.txt`; char/word count; aggregated
   `usage.cost`.

### Pipeline state machine

```
idle → loading → planning → processing(chunk i/n) → stitching → done
                                                     ↘ error
                                                     ↘ cancelled
```

---

## 6. Chunking & stitching details

- **Chunk length is deliberately conservative.** Provider requests time out after ~60 s of
  *processing* (not audio length), and 5 minutes of audio typically transcribes well inside
  that budget. Default 300 s; configurable; hard cap enforced.
- **Overlap** guarantees no word is lost at a boundary; the stitcher removes the duplicated
  text. Default overlap 15 s.
- **Stitch algorithm:** normalize whitespace/casing; compare up to **40 trailing tokens** vs.
  **40 leading tokens**; take the longest matching overlap; drop it; join with a single
  space.
- v1 is plain text, so **no timestamp rebasing is required** — but chunk `start`/`end` offsets
  are retained in the data model so SRT/VTT is a clean future extension.
- **Empty chunks** (silence) are retained as boundaries and contribute no text.

---

## 7. Memory strategy (~2 GB / ~4 h)

- Never decode the whole file: Mediabunny streams packets; only the active window is decoded.
- Bounded PCM ring buffer; each slice is encoded and then discarded.
- Chunk payloads are ~3 MB each; ~48 chunks for 4 h ≈ ~150 MB retained. If this proves tight,
  add an **OPFS spool** (designed as a drop-in swap behind a chunk-store interface).
- Only one chunk is base64-encoded at a time; buffers are released promptly.
- Worker ↔ main-thread transfers use `ArrayBuffer` transfer, not structured clone copies.

---

## 8. OpenRouter integration

### Authentication

- `Authorization: Bearer <key>`.
- Attribution headers: `HTTP-Referer`, `X-Title`.

### Model selection — searchable dropdown

- Catalog fetched from `GET /api/v1/models?output_modalities=transcription` (public; no auth
  required; currently returns 24 models). Cached client-side with a **Refresh** affordance.
- Rendered as a **searchable dropdown (combobox)**.
- Default selection/placeholder: `openai/whisper-large-v3`.
- The combobox remains **free-text-capable** so a user can paste a slug not yet in the cached
  list.
- If a selected slug is not servable by `/audio/transcriptions`, surface the API error
  clearly.

### Request shape

- Base64 JSON body via `input_audio` (supports larger payloads and streaming offload):

  ```json
  {
    "model": "<slug>",
    "input_audio": { "data": "<base64>", "format": "mp3" },
    "language": "<optional ISO-639-1>",
    "temperature": 0
  }
  ```

- Optional params: `language`, `temperature` (default 0 for determinism).
- Per-model guard config (e.g. chunk-length overrides) keyed by slug, applied when recognized.

### Response handling

- Uses `text`; aggregates `usage` (`seconds`, tokens, `cost`) for the cost summary.
- Cost guardrail: pre-run estimate from duration where pricing is known; warn above a
  threshold.

### Key storage — rationale

The SPA must read the plaintext key to build the `Authorization` header, so at request time
it inevitably exists in JS memory. Any script in the page — our code, an npm dependency, a
compromised CDN asset, or a browser extension with page access — can read it. The decision is
therefore about **how long** and **how widely** the key is exposed, and the **blast radius**
if it leaks.

| Option | Survives reload? | Other tabs? | Survives tab close? | Syncs across devices? | Risk |
|---|---|---|---|---|---|
| **In-memory only** (default) | No | No | No | No | Lowest; user re-pastes each session |
| **sessionStorage** (opt-in toggle) | Yes | No | No | No | Middle; convenient for long runs, cleared on tab close |
| **localStorage** | Yes | Yes | Yes | Possibly | Highest; long-lived credential, bad on shared machines |

**Decision:** default **in-memory**. A single toggle — *"Remember for this session (cleared
when you close the tab)"* — stores the key in **`sessionStorage`**, off by default. **Never
`localStorage`** in v1. A **Clear key** button is always present.

### Defense-in-depth (built in regardless)

- Strict **Content-Security-Policy** (no inline/eval; restricted script origins) + SRI on any
  external asset.
- Keep the dependency surface small; **no third-party analytics scripts** on the page.
- Never log the key; mask it in the UI; never place it in URLs/query strings.
- No service-worker caching of API responses.
- The key is transmitted **only to `openrouter.ai`**; there is no backend in the path.
- **Strongest real mitigation (documented in the key gate):** create a **dedicated OpenRouter
  key with a spend/credit limit**, so a worst-case leak is financially capped.

---

## 9. UI/UX

- **API key gate** — modal shown on first use when no key is present; includes the
  dedicated-key/limit guidance and the session toggle.
- **Workspace** — dropzone; settings (model combobox, language, chunk length, temperature);
  Run/Cancel; progress bar with per-chunk status list; transcript pane; usage/cost summary;
  error banners.
- Full empty / loading / error states.
- Optional dark mode.

---

## 10. Error handling & edge cases

| Case | Behavior |
|---|---|
| Unsupported codec/container | Explicit message via Mediabunny `canDecode` |
| No audio track / zero-length file | Blocked at ingest with a clear message |
| Invalid key | 401 surfaced with actionable copy |
| Model slug not servable | API error surfaced clearly |
| Network failure mid-run | Resume from the failed chunk (chunk blobs retained) |
| Empty transcript with non-zero audio | Surfaced, not silently dropped |
| Oversized file | Blocked at plan stage with the configured cap shown |

---

## 11. Testing

- **Unit tests (Vitest):**
  - chunk planner
  - silence detection
  - stitcher overlap logic
  - base64 / format helpers
  - model-slug validation
  - key-storage toggle behavior
  - transcribe/retry/backoff logic
- **Integration tests:** fixture-driven, against a **mocked OpenRouter fetch**; sample files
  for `wav`, `mp3`, `m4a`, `flac`, `ogg`.
- **Verification loop:** `tsc --noEmit` + ESLint + Prettier.
- **E2E (Playwright):** out of scope for v1.

---

## 12. Project structure

```
video-transcriber-app/
  index.html
  vite.config.ts
  tailwind.config.js
  src/
    main.tsx
    App.tsx
    components/        # ApiKeyGate, Dropzone, SettingsPanel, ProgressPanel, TranscriptView, UsageSummary
    features/
      stt/             # openrouter client, model catalog
      audio/           # decode, chunker, encode, worker
      stitch/          # stitcher
    state/store.ts
    lib/               # base64, tokens
    types.ts
  tests/
  docs/SDD.md
```

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| WebCodecs codec gaps (esp. Safari/Firefox) | Chromium-first; `canDecode` checks; clear errors; ffmpeg.wasm fallback can be added later behind the same interface |
| Provider 60 s processing timeout | Conservative 300 s chunks + retry/recovery |
| Browser memory pressure on ~2 GB files | Streaming decode, worker, bounded buffers, optional OPFS spool |
| SDK browser quirks | Raw-`fetch` fallback path |
| Per-model caps vary | Per-model guard config keyed by slug |
| Static model catalog lag | Free-text-capable combobox + Refresh |

---

## 14. Milestones

1. **M1** — Scaffold (Vite/React/TS/Tailwind), API key gate + session toggle, model catalog
   combobox.
2. **M2** — Decode/encode/chunk pipeline in worker.
3. **M3** — OpenRouter transcription, progress, retry/resume, cost summary.
4. **M4** — Stitching + transcript UI + copy/download.
5. **M5** — Hardening: memory behavior, unit/integration tests, large-file QA.

---

## 15. Open items

None. All decisions are closed as of v1.0.
