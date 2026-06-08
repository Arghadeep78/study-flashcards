# DSA Flashcards

A deadline-driven flashcard + PDF notes app for DSA interview prep, optimized for a strict 45–60 day prep window. Uses a **Leitner box system** rather than open-ended SM-2 scheduling. Built with React + Vite on the frontend and Express + MongoDB on the backend.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router v6 |
| Backend | Express 4, Mongoose 8, Node.js (ESM) |
| Database | MongoDB |
| PDF Rendering | react-pdf (pdf.js) |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | react-hot-toast |

---

## Project Structure

```
flashcards/
├── backend/
│   └── src/
│       ├── index.js                # Express server entry
│       ├── db.js                   # MongoDB connection
│       ├── models/
│       │   ├── Card.js             # Flashcard schema
│       │   └── PdfNote.js          # PDF section schema
│       ├── controllers/
│       │   ├── cards.js            # Flashcard logic + review modes
│       │   ├── pdfNotes.js         # PDF notes logic + review modes
│       │   └── stats.js            # Dashboard stats
│       ├── routes/
│       │   ├── cards.js
│       │   ├── pdfNotes.js
│       │   └── stats.js
│       └── lib/
│           └── drive.js            # Google Drive download helper
└── frontend/
    └── src/
        ├── App.jsx                 # Routes
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── AllCards.jsx
        │   ├── CardForm.jsx
        │   ├── DailyReview.jsx
        │   ├── RandomReview.jsx
        │   ├── SelectiveReview.jsx
        │   ├── WeakCards.jsx
        │   ├── StudyMode.jsx
        │   ├── Settings.jsx
        │   ├── PdfNotes.jsx            # PDF notes list
        │   ├── PdfViewer.jsx           # Single PDF viewer
        │   ├── PdfDailyReview.jsx
        │   ├── PdfRandomReview.jsx
        │   ├── PdfSelectiveReview.jsx
        │   └── PdfWeakReview.jsx
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.jsx
        │   │   └── Sidebar.jsx
        │   └── ui/
        │       ├── ReviewSession.jsx       # Shared flashcard review UI
        │       ├── PdfReviewSession.jsx    # Shared PDF review UI
        │       ├── CardDetailModal.jsx
        │       ├── CreatableSelect.jsx     # Dropdown with custom option creation
        │       ├── MultiSelectFilter.jsx
        │       ├── Badge.jsx
        │       ├── Button.jsx
        │       ├── CodeBlock.jsx
        │       └── StatCard.jsx
        ├── store/
        │   ├── useCardStore.js     # Global card state (Zustand)
        │   └── useSettings.js      # User settings (Zustand + localStorage)
        └── utils/
            └── api.js              # Axios API client
```

---

## Running Locally

### Backend

```bash
cd backend
npm install
# create .env with MONGODB_URI=<your-mongo-uri>
npm run dev      # nodemon, port 5000
```

> **Note:** Do not put runtime-written files (uploads) inside `backend/src/` — nodemon will restart mid-request. The `uploads/` directory is at `backend/uploads/`.

### Frontend

```bash
cd frontend
npm install
npm run dev      # Vite, port 5173
```

Vite proxies `/api` and `/uploads` to `localhost:5000` — no CORS issues in dev.

---

## Flashcard Schema

```js
{
  title:        String,          // required
  topic:        String,          // required
  subtopic:     String,
  difficulty:   'Easy' | 'Medium' | 'Hard',
  problemLink:  String,
  question:     String,
  approaches: [
    {
      label:           String,
      approach:        String,
      timeComplexity:  String,
      spaceComplexity: String,
      code:            String,
    }
  ],
  notes:        String,

  // Leitner tracking
  boxLevel:     Number,          // 0, 1, 2, or 3 (default: 0)
  archived:     Boolean,         // manual archive flag (not used by the box system)
  lastReviewed: Date,
  visitCount:   Number,          // total ratings across all modes
  weak:         Boolean,         // manually flagged
}
```

---

## PDF Note Schema

Each **section** of a PDF is stored as its own `PdfNote` document. Multiple sections from the same file share a `fileName` / `fileUrl`.

```js
{
  topic:        String,          // required — deck-level grouping
  title:        String,          // = subtopic (section display name)
  subtopic:     String,          // section subtopic (dropdown-selected)
  difficulty:   'Easy' | 'Medium' | 'Hard' | '',  // optional
  sourceType:   'file' | 'drive',
  fileName:     String,          // stored filename on disk
  originalName: String,          // original upload filename (e.g. "notes.pdf")
  fileUrl:      String,          // served path, e.g. /uploads/<file>
  driveLink:    String,          // Google Drive share link (for refresh)
  startPage:    Number,          // required
  endPage:      Number,          // required

  // Leitner tracking (mirrors Card schema)
  boxLevel:     Number,          // 0, 1, 2, or 3
  archived:     Boolean,         // manual archive flag (not used by the box system)
  lastReviewed: Date,
  visitCount:   Number,
  passCount:    Number,          // total "Got it" ratings
  failCount:    Number,          // total "Missed" ratings
  weak:         Boolean,
}
```

### Adding PDF Notes

1. Click **New PDF Note** on the PDF Notes page.
2. Choose **Upload PDF** or **Google Drive link**.
3. Select a **Topic** (required).
4. Add one or more **Sections** — each section requires:
   - **Start / End page**
   - **Subtopic** (required, dropdown with custom option creation — saved per device)
   - **Title** (optional free text)
   - **Difficulty** (optional — Easy / Medium / Hard)
5. Each section becomes a separate reviewable `PdfNote` document sharing the same PDF file.

### Archive system

Sections can be manually archived via the archive toggle on each card. Archived sections are shown in the All PDF Notes list (dimmed) but excluded from all review queues. The box system never auto-archives — archive is always a manual action.

---

## Deadline-Driven Leitner Box System

Applies to both **flashcards** and **PDF sections**. Cards/sections move through four boxes (0 → 1 → 2 → 3). A correct answer promotes one box; a missed answer drops straight back to box 0. Box 3 is permanent — correct ratings reset the 12-day timer but do not graduate out.

Rating: `POST .../review` with `{ rating: 'pass' | 'fail' }`.

### Rating logic

```
Missed  (rating: 'fail')  →  boxLevel = 0,    lastReviewed = now
Correct (rating: 'pass'):
  boxLevel < 3            →  boxLevel += 1,   lastReviewed = now   (promote)
  boxLevel === 3          →  stays at Box 3,  lastReviewed = now   (timer resets)
```

`visitCount` increments on every rating. `passCount` / `failCount` track each outcome separately (PDF sections only).

### Box thresholds

| Box | Threshold | Meaning |
|---|---|---|
| 0 | 0 days  | Always due — new or just-missed |
| 1 | 3 days  | Due 3 days after last reviewed |
| 2 | 7 days  | Due 7 days after last reviewed |
| 3 | 12 days | Due 12 days after last reviewed — stays here indefinitely |

Unseen items (`lastReviewed === null`) are always due. Box 3 is the permanent maintenance box — items never leave it, they just resurface every 12 days.

---

## Flashcard Review Modes

### 1. Daily Review — `/review/daily`

Fetches all due, non-archived cards sorted box 0 first (`boxLevel asc`, then `lastReviewed asc`). Frontend slices to `dailyTarget` (default 20). Goal: clear today's queue, struggling cards first.

### 2. Random Review — `/review/random`

Pick a count. Backend samples `count × 5` cards via `$sample`, then applies weighted sampling (see below). Goal: random drilling biased toward unseen / long-unseen cards.

### 3. Selective Review — `/review/selective`

Pick topics + optional subtopics + count. Backend matches non-archived cards, sorts unseen first then longest-unseen, pools `count × 5`, then applies weighted sampling. Goal: targeted pattern drilling that surfaces new questions aggressively.

### 4. Weak Cards — `/review/weak`

All `weak: true` cards sorted by `boxLevel asc`, then `lastReviewed asc`. The weak flag is manual-only — toggle via the flag icon in any session or on the All Cards page.

---

## PDF Review Modes

All PDF review modes use a split-screen layout: sidebar on the left, full-height PDF viewer on the right. There is no way to skip ahead — sections are presented in order and you must rate each one before moving on.

### 1. PDF Daily Review — `/pdf-notes/review/daily`

Due, non-archived sections sorted box 0 first. Same threshold logic as flashcards.

### 2. PDF Random Review — `/pdf-notes/review/random`

Pick a count. Backend samples all non-archived sections and applies weighted sampling (all four factors). No ability to jump between sections during the session.

### 3. PDF Selective Review — `/pdf-notes/review/selective`

Pick topics + subtopics + count (slider). Optionally filter by difficulty (Easy/Medium/Hard) and box (0–3) — filters apply client-side after the API call. The slider max adapts to the total section count of the selected topics. No ability to jump between sections during the session.

### 4. PDF Weak Sections — `/pdf-notes/review/weak`

All `weak: true`, non-archived sections sorted box 0 first.

### PDF Review Session UI

- **Reveal flow:** title shown immediately; all other metadata (subtopic, topic, PDF name, page range, box, difficulty) blacked out until revealed via the eye toggle or by clicking any blacked-out element. PDF is hidden behind a blur overlay until "Reveal PDF" is clicked.
- **Left panel:** session title · progress bar · Quit button · title (always visible) · eye toggle · blacked-out details · weak toggle · page navigator · zoom controls (hidden until PDF revealed) · **Missed / Got it** rating buttons pinned to bottom.
- **Right panel:** full PDF rendered at `scale=2.0`; opens at fit-to-width zoom. Zoom is pure CSS transform (no re-renders). Ctrl+scroll to zoom; section pages auto-scroll on section change.
- **Navigation lock:** browser close/refresh is blocked via `beforeunload` while a session is active. The Quit button shows a confirm dialog — progress already rated is saved; remaining sections are skipped.
- **Rating:** **Missed** / **Got it** buttons stacked vertically, revealed after PDF is shown. Each rating updates the section's Leitner box. No section skipping — the queue is not shown.

---

## Weighted Sampling (shared logic)

Used by Random and Selective modes for both flashcards and PDF sections.

```js
recencyWeight  = lastReviewed === null ? 1.0 : 1 - e^(-daysSince / 7)
scarcityWeight = 1 / (visitCount + 1)
boxWeight      = (4 - boxLevel) / 4          // box 0 → 1.0, box 3 → 0.25
subtopicWeight = 1 / (subtopicPicksSoFar + 1) // dynamic — recomputed each round
finalWeight    = recencyWeight × scarcityWeight × boxWeight × subtopicWeight
```

- **recencyWeight** — climbs the longer since last review. Never-reviewed → 1.0; 7 days ago → ~0.63; 1 day ago → ~0.13.
- **scarcityWeight** — `1 / (visitCount + 1)`. Unseen → 1.0; each prior rating shrinks it.
- **boxWeight** — lower boxes score higher. Box 0 → 1.0, Box 1 → 0.75, Box 2 → 0.5, Box 3 → 0.25.
- **subtopicWeight** — dynamic per-session counter. First pick from a subtopic → 1.0; second → 0.5; third → 0.33. Updated after every pick so the penalty compounds immediately, spreading selection across subtopics rather than clustering on one.

Sampling is without replacement — a picked item is removed from the pool.

---

## All PDF Notes Page

- Paginated list (20 per page) with search, topic/subtopic filter dropdown, difficulty chips (Easy / Medium / Hard), box chips (Box 0–3), and a sort dropdown (newest / most viewed / most correct / most missed / pass rate / fail rate / box ascending / box descending).
- Each card shows: section title · difficulty badge (color-coded) · ARCHIVED / DUE / WEAK badges · PDF filename · topic › subtopic badge · page range · **Box pill** (color-coded: grey/amber/green/blue for boxes 0–3) · views · ✓ got-it count · ✗ missed count · pass rate %.
- Archived notes are dimmed and excluded from all review queues.
- Hover for: edit · refresh (Drive only) · archive/unarchive toggle · delete.

---

## API Reference

### Flashcards

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cards` | List cards (search, topic, subtopic, difficulty, page, limit) |
| GET | `/api/cards/:id` | Get single card |
| POST | `/api/cards` | Create card |
| PUT | `/api/cards/:id` | Update card |
| DELETE | `/api/cards/:id` | Delete card |
| POST | `/api/cards/:id/duplicate` | Duplicate card (resets box/archived/lastReviewed) |
| POST | `/api/cards/:id/review` | Rate `{ rating: 'pass'\|'fail' }` |
| POST | `/api/cards/:id/weak` | Toggle weak flag |
| GET | `/api/cards/due` | Due non-archived cards, box 0 first |
| GET | `/api/cards/random?count=N` | Weighted random cards |
| POST | `/api/cards/selective` | Pattern-focused `{ topics, subtopics, count }` |
| GET | `/api/cards/weak` | Weak cards by box level |
| GET | `/api/cards/topics` | All topics with subtopics |
| GET | `/api/cards/export` | Full deck export |
| POST | `/api/cards/import` | Bulk import `{ cards: [...] }` |

### PDF Notes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pdf-notes` | All PDF note sections |
| GET | `/api/pdf-notes/:id` | Single section |
| POST | `/api/pdf-notes/upload` | Create from uploaded PDF (multipart, `pdf` field) |
| POST | `/api/pdf-notes/drive` | Create from Google Drive link |
| POST | `/api/pdf-notes/:id/refresh` | Re-download Drive PDF |
| PUT | `/api/pdf-notes/:id` | Update section metadata |
| DELETE | `/api/pdf-notes/:id` | Delete section (file removed if no other section uses it) |
| GET | `/api/pdf-notes/sections/due` | Due sections, box 0 first |
| GET | `/api/pdf-notes/sections/random?count=N` | Weighted random sections |
| POST | `/api/pdf-notes/sections/selective` | Pattern-focused `{ topics, subtopics, count }` |
| GET | `/api/pdf-notes/sections/weak` | Weak non-archived sections |
| POST | `/api/pdf-notes/sections/:sectionId/review` | Rate section `{ rating: 'pass'\|'fail' }` |
| POST | `/api/pdf-notes/sections/:sectionId/weak` | Toggle section weak flag |

### Stats

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | Total cards, due today, reviewed today, topic distribution |

---

## Settings

Stored in `localStorage` under `dsa_settings`.

| Setting | Default | Description |
|---|---|---|
| `dailyTarget` | 20 | Max cards per Daily Review session |
| `confirmDelete` | true | Require double-click to confirm deletes |

---

## Card Form

- Form mode and JSON paste mode (toggle in the header).
- Topics: built-in DSA defaults + custom topics saved to `localStorage`.
- Subtopics: creatable dropdown, saved to `localStorage`.
- Approaches: any number, any name, collapsible, drag handle (visual only).
- Draft auto-saved to `localStorage` for new cards; restored on next visit.
- Legacy field migration: old cards with `brute`/`better`/`optimal` fields are automatically converted to the `approaches` array on save.

---

## CreatableSelect Component

Reusable dropdown (`components/ui/CreatableSelect.jsx`) used for Topic and Subtopic fields across flashcards and PDF notes.

- Portals its dropdown to `document.body` so it escapes scroll/overflow containers (important inside modals).
- Searches existing options; "Add new" row persists custom options to `localStorage` under the provided `storageKey`.
- Re-reads `localStorage` on every open so sibling instances on the same page see each other's additions immediately.
