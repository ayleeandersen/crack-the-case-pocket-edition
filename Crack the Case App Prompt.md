# Build "Crack the Case Pocket": a mobile-first murder-mystery party game web app

You are building a complete, working web app from this spec. Read the whole thing before writing code. When something here is ambiguous, choose the simplest option that fits the spirit of the spec, and list the choices you made at the end.

I have attached **`crack-the-case-cards.json`**, which contains all of the game content. Do not invent, rewrite, shorten or summarize any card text. Display it exactly as it appears in the file.

---

## 1. What the app is

*Crack the Case* is a party game for a group. One person, the **Moderator**, reads a short, puzzling crime scenario aloud (**The Case** and **The Mystery**). The other players, the **Investigators**, ask yes-or-no questions to work out what really happened. The Moderator secretly reads the full explanation (**The Story**) and answers their questions. If the Investigators get stuck, the Moderator can reveal up to two **Clues**, each of which adds penalty minutes. The faster the group reaches **The Solution**, the more points it earns.

The app replaces the physical card deck. It lives on one phone, which is passed around or held by the Moderator. It has to be fast, readable in a dim living room, usable one-handed, and must work with no internet connection.

---

## 2. Tech requirements

- **Stack:** React + TypeScript + Vite. Use Tailwind CSS for styling.
- **App shell:** a single-page app, installable as a **PWA**: a web app manifest, app icons, and a service worker (use `vite-plugin-pwa`). It must work **fully offline** after the first load, and "Add to Home Screen" must open it full-screen with no browser bar (`display: standalone`).
- **No backend, no accounts, no analytics, no third-party trackers.** All state lives on the device in `localStorage` (see section 9).
- **Card data:** bundle `crack-the-case-cards.json` into the app with a static import, so it is cached with the app. Do not fetch it from a server at runtime.
- **Routing:** client-side routing, e.g. `/play`, `/library`, `/case/:id`, `/groups`. Deep links must work after a refresh (configure the dev server and the build for SPA fallback).
- **Target devices:** phones first, 360–430 px wide, portrait. It must also look fine on tablets and desktop, using a centered column no wider than about 640 px.
- **Code quality:** strict TypeScript, small focused components, and a few unit tests (Vitest) for the logic in section 10: random selection, scoring and the played-status rules.
- **Hosting:** this is a private, personal app (see section 13). The build output should be a static `dist/` folder that can be hosted anywhere static files are served.

---

## 3. The card data

The attached file looks like this:

```json
{
  "version": 1,
  "cards": [
    {
      "id": "23",
      "number": 23,
      "source": "official",
      "title": "Initial Amnesia",
      "difficulty": "Easy",
      "case": ["paragraph 1", "paragraph 2", "Eb - Ob", "wsn", "SWIS S"],
      "mystery": "Who is the young man? ...",
      "clues": ["Clue 1 text", "Clue 2 text"],
      "timetable": { "masterDetective": [1, 6], "privateEye": [7, 9], "flatfoot": [10, 12] },
      "story": ["paragraph 1", "paragraph 2", "..."],
      "specialInformation": "string or null",
      "solution": "One or two sentences."
    }
  ]
}
```

Facts about the data:

- There are **208 cards**:
  - **108 official** cards (`source: "official"`, ids `"1"`–`"108"`): 42 Easy, 48 Medium, 18 Difficult.
  - **100 originals** (`source: "original"`, ids `"O1"`–`"O100"`): 40 Easy, 40 Medium, 20 Difficult.
- `difficulty` is always exactly `"Easy"`, `"Medium"` or `"Difficult"`.
- `case` and `story` are **arrays of paragraphs**. Render each array item as its own paragraph. A few items are very short lines, such as the tattoo letters on card 23 or a quoted rhyme. Center any paragraph shorter than about 15 characters so those read as set-apart lines.
- `timetable` gives inclusive minute ranges for 6, 5 and 4 points. The ranges differ from card to card, so always read them from the card.
- `specialInformation` is moderator-only extra guidance, often a ruling on what to answer if asked. It is `null` on most cards.
- **Card display label:** official cards show as "Card 23"; originals show as "Original O23".
- **Card 1** (official, "Candy, Dish and Shell Game") is the game's sample card. Treat it like any other card.

Load and validate the data once at startup. In development, log a warning if any card is missing a required field.

---

## 4. Information architecture

- **Header** (every main screen): the app name on the left and a **"Playing as"** switcher on the right (section 5).
- **Bottom tab bar** (always visible on main screens, thumb-reachable): **Play** and **Library**.
- **Case screen:** opens on top of either tab, full-screen, with a back button.
- **Groups / settings screen:** opened from the "Playing as" switcher.

---

## 5. Who is playing: "Me" and Groups

The app tracks played cases separately for **the phone's owner** and for **groups of friends**.

### Profiles
- **Me**: always exists and can't be deleted. It means "cases the phone owner already knows the answer to."
- **Groups**: named, for example "Friday Crew" or "Family". The user can create, rename, delete and reset them. Each group has its own played history that persists between game nights.

### The "Playing as" switcher
- A compact control in the header showing the active profile ("Me" or a group name).
- Tapping it opens a sheet that lists **Just me**, every group, **+ New group**, and **Manage groups**.
- The active profile is remembered between visits.

### "I'm playing in this session"
- When a **group** is active, a toggle labeled **"I'm playing too"** appears in the switcher sheet and also as a small chip on the Play screen. It is **on by default**.
- When it's on, a case completed for the group is **also** marked played for **Me**, because whoever holds the phone learns the solution.
- When it's off (for example, the phone is lent to friends), only the group's history changes.
- Store this toggle **per group**.

### Rules for marking a case played (implement these exactly)
- Playing as **Me** and finishing a case marks it played for **Me** only.
- Playing as **Group G** and finishing a case marks it played for **G**, and also for **Me** if "I'm playing too" is on.
- "Finishing" means tapping **Solved** or **Gave up** on the case screen (section 7). **Skip** never marks anything as played.

---

## 6. Play tab

### Filters
- **Difficulty chips:** **Easy**, **Medium**, **Difficult**. All three are **on by default**. Tapping a chip toggles it, but **at least one must stay on**: if the user tries to turn off the last one, make the chip shake briefly and leave it on.
- **Deck chips:** **Official** and **Originals**, both **on by default**, with the same "at least one must stay on" rule.
- Filters are remembered between visits. Store them **per profile**, so each group keeps its own preference.

### Pool summary
Below the filters, show a line such as **"31 unplayed cases match your filters."** This counts cards that match the filters and are **unplayed for the active profile**.

### Next Case button
- A big, full-width primary button at the bottom of the screen, within thumb reach.
- Tapping it picks a **random** card that matches the filters and is **unplayed for the active profile**, then opens it on the case screen.
- Never pick the card that was just skipped or just shown, unless it's the only one left.
- **When nothing is left** (every matching card has been played by the active profile):
  - Show an **"All caught up!"** state in place of the button.
  - Offer **Include played cases**: a one-time pick from all cards that match the filters.
  - Offer **Reset played history for these filters**, behind a confirmation dialog. It clears played status only for the active profile, and only for cards matching the current filters.

### Recent activity (optional, small)
Under the button, show the last 3 cases completed by the active profile, each with its points. Tapping one opens that case.

---

## 7. Case screen

This is the most important screen.

### Layout, top to bottom

1. **Top bar:** a back arrow, the card label ("Card 23" or "Original O23") and a difficulty badge. Badge colors: Easy = deep blue, Medium = plum/purple, Difficult = teal. These echo the colors of the real cards.
2. **Title:** large, serif, dark red.
3. **THE CASE:** large, comfortable reading text (about 20 px, line height about 1.5), one paragraph per array item.
4. **THE MYSTERY:** visually emphasized, e.g. a tinted box.
5. **Game clock panel** (described below).
6. **Clues panel** (described below).
7. **Moderator section**, hidden by default (described below).
8. **Action bar**, fixed at the bottom: **Solved!**, **Gave up**, **Skip**.

### Moderator section: show and hide with a button, not by holding
- By default, only a button is shown: **"Show Story & Solution"**, with an eye icon.
- **One tap opens it, and it stays open.** No press-and-hold. The Moderator needs to read and scroll freely while answering questions.
- While open, a **"Hide"** button is pinned to the top of the section (sticky as you scroll inside it), so it can be closed quickly if someone leans over.
- Inside, in this order: **THE STORY** (paragraphs), **Special Information** if not null (clearly labeled, in a callout style), then **THE SOLUTION** (bold).
- The section **always starts hidden** whenever a case is opened, even when revisiting a case.
- The Moderator normally opens this right after reading The Case aloud and keeps it open during questioning, so make it comfortable to read for a long time.

### Game clock
- It shows elapsed time in large mm:ss digits, plus the **current tier**: "Master Detective · 6 pts", "Private Eye · 5 pts", "Flatfoot · 4 pts", or, past the Flatfoot range, "Out of time · 0 pts".
- Below the digits, show a thin progress bar split into the card's three tiers.
- **Start** begins the clock. It does not start automatically, because the Moderator first reads the case aloud. Also offer **Pause/Resume** and **Reset**, with Reset behind a confirmation.
- Compute time from **timestamps**, not by counting ticks, so the clock stays correct if the screen locks or the app goes to the background. Save the clock state so it survives a page reload.
- While the clock runs, request a **Screen Wake Lock** if the browser supports it, so the phone doesn't sleep mid-game. Release it when the clock pauses or stops.
- **Penalty minutes** from clues (below) are added to the clock's effective time. Show them as "+1 min" / "+3 min" next to the digits.

### Clues
- Two buttons: **"Reveal Clue 1 (+1 min)"** and **"Reveal Clue 2 (+2 min)"**.
- Revealing a clue shows its text in place of the button and adds the penalty: 1 minute for Clue 1, 2 minutes for Clue 2.
- Clue 2 can be revealed without Clue 1.
- Show a small confirmation the first time in each case, e.g. "Reveal Clue 1? This adds 1 minute." The confirmation can be skipped with a "Don't ask again" option stored in settings.
- If clues are revealed before the clock has started, still record the penalty. It counts once the clock starts.

### Scoring
- Effective time = elapsed time + penalty minutes.
- Points:
  - 6 if effective whole minutes are within `masterDetective`
  - 5 if within `privateEye`
  - 4 if within `flatfoot`
  - 0 if beyond the end of `flatfoot`
- Round effective time **up** to whole minutes for scoring, so 0:01–1:00 counts as minute 1. Treat anything under a minute as minute 1.
- If the clock was never started, **Solved** asks the Moderator to choose the tier manually: 6, 5, 4 or 0.

### Actions
- **Solved!** stops the clock, works out the points, marks the case played (section 5 rules), saves a result record, and shows a small result card: points, effective time, clues used, and buttons **Next Case** and **Back**.
- **Gave up** marks the case played with 0 points and automatically opens the Moderator section so everyone can hear the story.
- **Skip** marks nothing and returns to the Play tab, so the group can draw another case. Use it when the group has heard a case before or isn't in the mood for it.

### Manual played status
At the very bottom of the case screen, below the moderator section, add small "Played status" toggles: **Me: played / not played**, and, if a group is active, **[Group name]: played / not played**. These let the user correct history by hand.

---

## 8. Library tab

### List
- Shows all 208 cases. Each row has the card label, title, a difficulty color dot, a deck tag (small "Original" pill for originals), and played markers:
  - **"✓ You"** if played by Me.
  - **"✓ [Group]"** if played by the active group (only when a group is active).
  - Unplayed for the active profile = a hollow circle.
- Rows show **only the title**: never the case text, story or solution. Scrolling the library must not spoil anything.
- Use smooth scrolling and simple list virtualization or windowing if needed for performance.

### Progress summary (top of the screen)
- For the active profile, e.g. "Friday Crew · 22 of 208 played · Easy 12/82 · Medium 8/88 · Difficult 2/38".
- When a group is active, add a second line for Me.

### Filters, search, sort
- **Status:** All / Not played / Played. This applies to the **active profile**.
- **Difficulty chips** and **deck chips**, the same as on Play. Library filters are independent of Play filters.
- **Search** by title, case-insensitive, matching as you type.
- **Sort:** Card number (official 1–108 first, then O1–O100) / Title A–Z / Recently played.

### Interactions
- Tapping a row opens the case screen. This is how you choose a specific case or replay a favorite.
- Long-press or a "⋯" menu on a row offers quick toggles: mark played/unplayed for Me and for the active group.

---

## 9. Persistence (localStorage)

Use one namespaced, versioned key, for example `ctc:v1`, holding JSON like:

```ts
type Store = {
  schemaVersion: 1;
  activeProfileId: "me" | string;            // group id
  groups: { id: string; name: string; createdAt: number; meAlsoPlaying: boolean }[];
  played: {                                   // profileId -> cardId -> record
    [profileId: string]: { [cardId: string]: { playedAt: number; points: 0|4|5|6|null } }
  };
  filters: { [profileId: string]: { difficulties: Difficulty[]; decks: ("official"|"original")[] } };
  libraryPrefs: { status: "all"|"unplayed"|"played"; difficulties: Difficulty[]; decks: ("official"|"original")[]; sort: "number"|"title"|"recent" };
  activeClock?: { cardId: string; startedAt: number|null; accumulatedMs: number; running: boolean; penaltyMin: number; cluesRevealed: [boolean, boolean] };
  settings: { confirmClues: boolean; theme: "system"|"light"|"dark"; textSize: "normal"|"large" };
};
```

- `points: null` means the case was marked played by hand.
- Wrap every read and write in try/catch. If storage is unavailable, as in some private browsing modes, the app must still work for the session and show a gentle notice that progress won't be saved.
- Write a small migration function for future `schemaVersion` changes.
- **Export and import:** in Settings, add **"Export my progress"**, which downloads the store as a JSON file, and **"Import progress"**, which validates the file before replacing the store. This is how progress moves to a new phone.

---

## 10. Logic that must have unit tests

1. **Random selection:** respects the filters and the active profile's played set, never repeats the last card unless it's the only one, and returns null when the pool is empty.
2. **Played rules:** the Me/group behavior in section 5, including the "I'm playing too" toggle.
3. **Scoring:** the tier boundaries for several timetables (for example 1–6/7–9/10–12, 1–10/11–15/16–20 and 1–14/15–21/22–28), penalties, rounding up, and the 0-point case.
4. **Clock:** elapsed-time calculation from timestamps across pause and resume.

---

## 11. Groups / settings screen

- Lists groups, each with **Rename**, **Reset played history** (with confirmation) and **Delete** (with confirmation, and a warning that the group's history will be lost).
- **New group** opens a name field.
- **Me:** a "Reset my played history" option with a strong confirmation that requires typing "RESET".
- **Settings:** theme (System / Light / Dark), text size (Normal / Large, which scales case and story text), clue confirmations on or off, and export/import progress.
- **About:** a short "How to play" (2–3 sentences from section 1) and the line "Crack the Case ©1993 Milton Bradley. Official card text is included for personal use only. Originals are fan-written."

---

## 12. Visual design and accessibility

- **Mood:** a classic 1990s mystery-game box, modernized. Cream/off-white card surfaces, deep-colored header bands, serif titles and body text (e.g. "Libre Baskerville" or "Source Serif" for reading, with a clean sans for UI labels). Self-host the fonts so they work offline.
- **Difficulty colors:** Easy `#24349B`, Medium `#7A1470`, Difficult `#0F7A84`. Title red `#9C1420`. Make sure all text passes WCAG AA contrast in both light and dark mode.
- **Dark mode:** a first-class design, not just inverted colors, since this is played in dim rooms. Use a near-black warm background and soft cream text.
- **Touch targets:** at least 44×44 px. Keep primary actions in the bottom third of the screen.
- **Accessibility:** semantic headings, buttons with labels, visible focus states, `prefers-reduced-motion` respected, and screen-reader text for icons and played markers.
- **Performance:** first load under about 300 KB of JS (gzipped), excluding the card JSON. The app must be instantly interactive when opened offline.
- **No spoilers anywhere outside the moderator section:** not in titles, previews, notifications, the browser tab title, or share text. The page `<title>` can show the case title, which is not a spoiler.

---

## 13. Privacy and content rules

- The official card text is from a published game and is included for **my personal use only**. Do **not** add sharing features that publish card content, public links, or social sharing.
- Keep the app private: no indexing (`<meta name="robots" content="noindex">`), no analytics, no external requests at runtime other than loading the app itself.
- Never send any data off the device.

---

## 14. Build order

Work in this order, and make sure each step runs before moving to the next:

1. Project scaffold, Tailwind, PWA setup, data import and type definitions, store and persistence layer with tests.
2. Case screen: reading layout, Show/Hide moderator section, clues, clock, scoring, and the Solved / Gave up / Skip actions.
3. Play tab: filters, pool count, Next Case, the all-caught-up state.
4. Profiles: the "Playing as" switcher, groups, "I'm playing too", played rules.
5. Library tab: list, markers, progress summary, filters, search, sort, manual toggles.
6. Groups/settings screen, export/import, theme, text size.
7. Polish: dark mode, accessibility pass, offline test, install test on iPhone (Safari) and Android (Chrome).

---

## 15. Acceptance checklist

The app is done when all of these are true:

- [ ] After one online visit, the app opens and works fully in airplane mode, including from a home-screen icon.
- [ ] Next Case never shows a case the active profile has played, unless the user chose "Include played cases."
- [ ] Turning off Easy and Originals means Next Case only draws official Medium and Difficult cases, and the pool count matches.
- [ ] The last difficulty chip and the last deck chip can't be turned off.
- [ ] The Story & Solution section is hidden whenever a case opens, opens with one tap, stays open, and closes with Hide.
- [ ] The clock stays accurate after locking the phone for 2 minutes and unlocking it.
- [ ] Revealing Clue 2 at 5:30 on a card with 1–6/7–9/10–12 gives 5 points if solved at that moment, because 5:30 + 2:00 = 7:30, which rounds up to minute 8.
- [ ] Solving a case as "Friday Crew" with "I'm playing too" on marks it played for both Friday Crew and Me; with the toggle off, only Friday Crew.
- [ ] Skip never changes played status.
- [ ] The Library never shows case, story or solution text.
- [ ] Progress survives closing and reopening the app, and export → import on another browser restores it exactly.
- [ ] Every screen is usable one-handed on a 375 px-wide phone, in both light and dark mode.

When you finish, summarize what you built, any assumptions you made, and how to run, test and deploy it.
