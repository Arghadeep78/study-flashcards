# DSA Flashcards

A deadline-driven flashcard app for DSA interview prep, optimized for a strict 45–60 day prep window. Uses a **Leitner box system** rather than open-ended SM-2 scheduling. Built with React + Vite on the frontend and Express + MongoDB on the backend.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router v6 |
| Backend | Express 4, Mongoose 8, Node.js (ESM) |
| Database | MongoDB |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | react-hot-toast |

---

## Project Structure

```
flashcards/
├── backend/
│   └── src/
│       ├── index.js              # Express server entry
│       ├── db.js                 # MongoDB connection
│       ├── models/
│       │   └── Card.js           # Mongoose schema
│       ├── controllers/
│       │   ├── cards.js          # All card logic
│       │   └── stats.js          # Dashboard stats
│       └── routes/
│           ├── cards.js
│           └── stats.js
└── frontend/
    └── src/
        ├── App.jsx               # Routes
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── AllCards.jsx
        │   ├── CardForm.jsx
        │   ├── DailyReview.jsx
        │   ├── RandomReview.jsx
        │   ├── SelectiveReview.jsx
        │   ├── WeakCards.jsx
        │   ├── StudyMode.jsx
        │   └── Settings.jsx
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.jsx
        │   │   └── Sidebar.jsx
        │   └── ui/
        │       ├── ReviewSession.jsx   # Shared review UI
        │       ├── CardDetailModal.jsx # Click-to-view modal
        │       ├── Badge.jsx
        │       ├── Button.jsx
        │       ├── CodeBlock.jsx
        │       └── StatCard.jsx
        ├── store/
        │   ├── useCardStore.js    # Global card state (Zustand)
        │   └── useSettings.js     # User settings (Zustand + localStorage)
        └── utils/
            └── api.js             # Axios API client
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

### Frontend

```bash
cd frontend
npm install
npm run dev      # Vite, port 5173
```

Vite proxies `/api` to `localhost:5000` — no CORS issues in dev.

---

## Card Schema

```js
{
  title:       String,          // required
  topic:       String,          // required
  subtopic:    String,
  difficulty:  'Easy' | 'Medium' | 'Hard',
  problemLink: String,
  question:    String,
  approaches:  [                // any number, any name
    {
      label:           String,
      approach:        String,
      timeComplexity:  String,
      spaceComplexity: String,
      code:            String,
    }
  ],
  notes:       String,

  // Leitner tracking
  boxLevel:    Number,          // current box: 0, 1, or 2 (default: 0)
  archived:    Boolean,         // true once graduated out of the final box (default: false)
  lastReviewed: Date,           // last time rated in any session (default: null)

  // tracking
  visitCount:  Number,          // total times rated across all 4 modes (default: 0)
  weak:        Boolean,         // manually flagged as weak (default: false)
}
```

> The card content fields (`title`, `topic`, `subtopic`, `difficulty`, `problemLink`, `question`, `approaches`, `notes`) are unchanged. Only the scheduling fields changed from SM-2 to Leitner.

---

## Deadline-Driven Leitner Box System

Cards move through three boxes (0 → 1 → 2). A correct answer promotes a card one box; a missed answer drops it straight back to box 0. Each box has a fixed re-review threshold, so a card resurfaces sooner when you're still learning it and less often once it's sticking. The whole system is tuned for a fixed 45–60 day window — there are no open-ended multi-month intervals.

Fires on every rating via `POST /api/cards/:id/review` with a binary rating: `{ rating: 'pass' }` (**Correct**) or `{ rating: 'fail' }` (**Missed**).

### Rating logic

```
Missed  (rating: 'fail')  →  boxLevel = 0,  lastReviewed = now

Correct (rating: 'pass'):
  boxLevel < 2   →  boxLevel += 1,  lastReviewed = now   (promote)
  boxLevel === 2 →  archived = true                       (graduate out of the deck)
```

`visitCount` increments on every rating regardless of outcome.

### Box thresholds (when a card becomes due again)

| Box | Threshold | Meaning |
|---|---|---|
| 0 | 0 days | Always due today — new (unseen) or just-missed cards |
| 1 | 3 days | Due 3 days after it was last reviewed |
| 2 | 7 days | Due 7 days after it was last reviewed |

A card is **due** when `archived === false` and the time elapsed since `lastReviewed` is at least its box threshold. Unseen cards (`lastReviewed === null`) are always due.

### Graduation

Answering **Correct** on a box-2 card sets `archived: true`. Archived cards are removed from all due queues — they've graduated the system and are considered interview-ready.

### Auto-clearing weak flag

The `weak` flag is no longer auto-cleared by the scheduler; it is purely a manual toggle. Flag and unflag cards yourself with the flag icon in any review session or on the All Cards page.

---

## Review Modes

### 1. Daily Review

**Route:** `/review/daily`

**Logic:**
1. Fetches all due, non-archived cards from the backend (`GET /api/cards/due`).
2. A card is due when the elapsed time since `lastReviewed` meets its box threshold (Box 0: 0d, Box 1: 3d, Box 2: 7d). Unseen cards are always due.
3. The queue is sorted **box 0 first** (`boxLevel asc`, then `lastReviewed asc`), so cards you're still struggling with surface before cards that are merely cycling back through.
4. The frontend slices to `dailyTarget` (user setting, default 20).
5. Each rating (Correct/Missed) promotes or resets the card's box.

**Goal:** Clear today's due queue. Box-0 cards (new or recently missed) always come first.

---

### 2. Random Review

**Route:** `/review/random`

**Logic:**
1. You pick a count (1–50 cards).
2. Backend fetches a pool of `count × 5` cards via MongoDB `$sample` (uniform random from the entire deck).
3. Each card in the pool is assigned a weight combining recency and scarcity (see [Weighted Sampling](#weighted-sampling-shared-logic)). The recency component uses `HALF_LIFE = 7` days:

   ```
   recencyWeight = 1 - e^(-daysSinceLastReview / 7)
   ```

   - **Never reviewed** (`lastReviewed = null`) → recency **1.0** (highest priority)
   - Last reviewed **7 days ago** → recency **~0.63**
   - Last reviewed **3 days ago** → recency **~0.35**
   - Last reviewed **yesterday** → recency **~0.13**

4. Weighted sampling without replacement picks `count` cards from the pool.
5. If the pool is smaller than `count` (small deck), all pool cards are returned as-is.
6. Each rating promotes or resets the card's box.

**Goal:** Random drilling with a bias toward cards you haven't seen in a while (and haven't seen often).

---

### 3. Selective Review

**Route:** `/review/selective`

Selective Review is **pattern-focused**: it aggressively surfaces new and lesser-seen questions within the selected pattern (topic/subtopic), rather than sampling uniformly.

**Logic:**
1. You select one or more topics, optionally narrow by subtopics, and pick a count (or "All").
2. Backend builds a MongoDB aggregation that `$match`es **non-archived** cards (`archived: false`) within the selected topics and subtopics.
3. The pipeline adds a temporary `isUnseen` field (`1` when `visitCount === 0`, else `0`) and sorts by `{ isUnseen: -1, lastReviewed: 1 }` — brand-new questions first, then longest-unseen.
4. If a specific count is requested:
   - Limits the sorted pool to `count × 5` cards via `$limit`.
   - Hard cap of 2000 on counted requests.
5. If "All" is selected:
   - Skips `$limit` and keeps every matching card in the pool.
6. The pool is passed through `weightedSample`, which applies the combined recency × scarcity weight (see below).
7. Each rating promotes or resets the card's box.

**Goal:** Targeted drilling that pushes you toward the questions in a pattern you've never seen — or seen least.

---

### 4. Weak Cards

**Route:** `/review/weak`

**Logic:**
1. Cards are manually flagged `weak: true` using the flag icon during any review session.
2. The list view fetches all `weak: true` cards, sorted by:
   - `boxLevel asc` — least-mastered cards (lowest box) appear first.
   - `lastReviewed asc` — tiebreaker: longest unseen first.
3. "Review All Weak" launches a full `ReviewSession` over all weak cards in that order.
4. The weak flag is manual only — unflag from the list or via the flag button during a session.
5. Each rating promotes or resets the card's box.

**Goal:** Dedicated session for cards you've explicitly identified as problematic.

---

## Weighted Sampling (shared logic)

Both Random and Selective use `weightedSample(pool, count)` in `cards.js`. The final weight multiplies two factors:

```js
recencyWeight  = lastReviewed === null ? 1.0 : 1 - e^(-daysSince / HALF_LIFE)  // HALF_LIFE = 7 days
scarcityWeight = 1 / (visitCount + 1)
finalWeight    = recencyWeight * scarcityWeight
```

- **`recencyWeight`** — higher the longer it's been since the last review. Never-reviewed cards get the max (1.0). With `HALF_LIFE = 7`, weight climbs quickly: ~0.63 at 7 days, ~0.35 at 3 days, ~0.13 at 1 day.
- **`scarcityWeight`** — `1 / (visitCount + 1)`. Unseen cards get 1.0; each prior rating shrinks the pull (2nd view → 0.5, 3rd → 0.33, 4th → 0.25…), so frequently-seen cards can't crowd out fresh ones.

Higher `finalWeight` = more likely to be selected. The sampling loop uses weighted random selection without replacement — once a card is picked it's removed from the pool so it can't be selected twice.

---

## Visit Tracking

`visitCount` increments on every `POST /api/cards/:id/review`, regardless of Correct/Missed outcome. It's the total number of times the card has been rated across all sessions, and is displayed on the All Cards page and card detail modal.

---

## All Cards Page

- Paginated list (50 per page) with search, topic, subtopic, and difficulty filters.
- Each row shows: title, due/weak badges, topic badge, difficulty badge, visit count (eye icon).
- **Click any row** to open a detail modal showing all card content (question, approaches, notes), Leitner stats (box level / archived, visit count, last seen), and controls to flag weak or jump to edit.
- Action buttons (edit, duplicate, delete) appear on hover and use `stopPropagation` so they don't open the modal.
- Bulk import via JSON array, single JSON card import, and file-based import/export.

---

## API Reference

### Cards

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cards` | List cards (search, topic, subtopic, difficulty, page, limit) |
| GET | `/api/cards/:id` | Get single card |
| POST | `/api/cards` | Create card |
| PUT | `/api/cards/:id` | Update card |
| DELETE | `/api/cards/:id` | Delete card |
| POST | `/api/cards/:id/duplicate` | Duplicate card (resets box level, archived, lastReviewed) |
| POST | `/api/cards/:id/review` | Rate card `{ rating: 'pass'\|'fail' }` — promotes/resets Leitner box |
| POST | `/api/cards/:id/weak` | Toggle weak flag |
| GET | `/api/cards/due` | Due, non-archived cards, sorted box 0 first |
| GET | `/api/cards/random?count=N` | Weighted random cards |
| POST | `/api/cards/selective` | Pattern-focused cards (unseen/lesser-seen first) `{ topics, subtopics, count }` |
| GET | `/api/cards/weak` | Weak cards sorted by box level |
| GET | `/api/cards/topics` | All topics with their subtopics |
| GET | `/api/cards/export` | Full deck export |
| POST | `/api/cards/import` | Bulk import `{ cards: [...] }` |

### Stats

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | Total cards, due today, reviewed today, topic distribution |

---

## Settings

Stored in `localStorage` under `dsa_settings`.

| Setting | Default | Description |
|---|---|---|
| `dailyTarget` | 20 | Max cards shown per Daily Review session |

---

## Card Form

- Form mode and JSON paste mode (toggle in the header).
- Topics: built-in defaults + custom topics saved to `localStorage`.
- Approaches: any number, any name, collapsible, drag handle (visual).
- Draft auto-saved to `localStorage` for new cards; restored on next visit.
- Legacy field migration: old cards with `brute`/`better`/`optimal` fields are automatically converted to the `approaches` array format on save.
