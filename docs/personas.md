# User Personas — Super Reader Championship

This document defines the core user personas for the Super Reader Championship app. Use these personas to evaluate feature ideas, prioritize work, and ensure the product serves its real users well.

The app is built for **friend groups and casual book clubs** running reading competitions. There are two roles in the system — **admin** and **player** — but motivations within those roles vary widely.

---

## 1. The Organizer (Admin)

**"I want everyone to have fun and actually participate."**

### Bio

The Organizer is the friend who had the idea to do a reading competition in the first place. They created the organization, configured the scoring rules, set up the genres, and sent out the invite code. They feel responsible for making the competition fun and fair for everyone.

### Goals

- Set up a competition quickly without needing to read a manual
- Customize scoring rules to match the group's preferences (e.g., how much audiobooks should be penalized, whether rereads count)
- Keep the competition fair — flag suspicious entries, adjust rules when something feels off
- Get stragglers to actually join and start logging books
- Keep the group engaged throughout the season

### Frustrations

- Onboarding is friction: they end up explaining the app to every new person individually
- Adjusting rules mid-season feels risky — will it retroactively change scores? Will people notice?
- Edge cases create arguments: "Does a graphic novel count as fiction?" "What if I listened to half and read half?"
- No easy way to see who hasn't logged anything in a while

### Key Surfaces

Admin settings, scoring configuration, genre management, player management, invite codes, flagged entries, org notes

### Design Implications

- Admin flows should be approachable, not enterprise-y. This is a friend running a book club, not a SaaS administrator.
- Org setup should have sensible defaults so The Organizer doesn't have to understand every scoring field before launching.
- Changes to scoring rules should clearly communicate their impact (retroactive or not).
- The invite/onboarding flow is partly The Organizer's responsibility — give them tools to help (shareable links, clear instructions they can forward).

---

## 2. The Competitor (Player)

**"I'm reading to win, and I need to know exactly where I stand."**

### Bio

The Competitor treats the reading championship like a sport. They study the scoring rules, pick books strategically (long nonfiction from an unrepresented country in a genre they haven't covered yet), and check the leaderboard daily. Winning — or at least finishing top 3 — is the goal.

### Goals

- Understand exactly how scoring works so they can optimize book choices
- Track their rank and see how close the competition is
- Know their progress toward challenge bonuses (genre diversity, alphabet challenge, countries)
- See what other players are reading to gauge the competition

### Frustrations

- Scoring rules that are hard to find or hard to understand
- Not knowing how close they are to unlocking a season bonus (e.g., "I have 11 of 13 letters — which ones am I missing?")
- Score preview that doesn't match the final score after bonuses/deductions
- Lack of transparency about how other players' points are calculated

### Key Surfaces

Leaderboard (obsessively), score preview, rules page, my books, other players' profiles

### Design Implications

- Scoring transparency is paramount. The rules page should be unambiguous, and the score preview should break down exactly how points are calculated.
- Challenge progress should be visible and specific (not just "12/26 letters" but "you're missing: J, Q, X, Z...").
- The leaderboard should feel alive — recent activity, point changes, rank movement.
- Comparative views help engagement: "You're 45 points behind 2nd place."

---

## 3. The Casual (Player)

**"I just like reading and my friend made me sign up."**

### Bio

The Casual was invited by a friend and thought it sounded fun. They read at their own pace — maybe a book a month, maybe less — and don't think much about strategy or scoring. They enjoy seeing what their friends are reading more than they care about their rank. The app should feel lightweight, not like homework.

### Goals

- Log a book quickly without thinking too hard about metadata
- See what friends are reading and how the group is doing
- Not feel overwhelmed or behind
- Maybe discover a good book recommendation from the leaderboard

### Frustrations

- Too many fields when adding a book — "Why do I need to pick a country? What's a deduction?"
- The scoring system feels impenetrable and they don't care enough to learn it
- Seeing a huge points gap on the leaderboard is discouraging rather than motivating
- Forgetting to log books and then not remembering exact finish dates

### Key Surfaces

My books (simplified), leaderboard (as a social feed more than a ranking), book entry form (minimal path)

### Design Implications

- The book entry flow needs a fast, minimal path. Required fields should be minimal; bonus/deduction fields can be optional or progressive disclosure.
- The leaderboard should have a social dimension beyond raw ranking — recent books read, activity, personal bests.
- Avoid making low-ranked players feel bad. Consider framing like "books completed" alongside points.
- Gentle nudges (not nagging) for players who haven't logged in a while.

---

## 4. The Explorer (Player)

**"I want to read a book from every country and unlock every challenge."**

### Bio

The Explorer is motivated by breadth and discovery. The genre challenge, alphabet challenge, and country tracking are what make this competition special to them. They actively seek out books from countries they haven't covered, in genres they don't usually read. Winning would be nice, but completing every challenge is the real prize.

### Goals

- Track which challenges they've completed and what gaps remain
- Discover books from new genres, countries, and with uncommon starting letters
- See their challenge progress at a glance
- Understand exactly what counts toward each challenge (completed only? do DNFs count?)

### Frustrations

- No clear dashboard showing challenge progress and remaining gaps
- Unclear which entries count toward challenges (status requirements, etc.)
- Hard to find books from specific countries or in underrepresented genres
- Genre list doesn't always match how they'd categorize a book

### Key Surfaces

Challenge stats, player profile, book entry metadata (genre, country, series), my books filtered by challenge criteria

### Design Implications

- Challenge progress should be front-and-center, not buried. Show what's complete and what's missing.
- Country and genre selection should be discoverable and well-organized.
- Consider "suggestions" or gap analysis: "You need a book starting with X — here's what other players have read."
- Make the rules around challenge eligibility crystal clear (e.g., "only completed books count toward genre challenge").

---

## 5. The Tracker (Player)

**"If the page count is wrong, the whole entry bothers me."**

### Bio

The Tracker treats their book list as a prized record. They care deeply about accuracy — correct page counts, proper series names and order, the right genre classification, an honest rating. They may cross-reference with Goodreads or StoryGraph to make sure everything matches. They want their reading history to be comprehensive and correct, season after season.

### Goals

- Enter complete, accurate metadata for every book
- Edit entries after the fact when they notice errors
- Maintain a continuous reading history, not just the current season
- Rate and review every book they read
- Track series progress accurately

### Frustrations

- Book data auto-populated from ISBN is sometimes wrong (wrong page count, missing author)
- Can't easily edit an entry after it's been submitted
- Reading history disappears or resets between seasons
- No way to note edition-specific details (hardcover vs paperback page count differences)
- Series tracking is inconsistent — no way to indicate book order within a series

### Key Surfaces

Book entry form (every field matters), my books (detailed view), player profile, ratings, Goodreads/StoryGraph profile links

### Design Implications

- The book entry form should support detailed metadata without forcing it on everyone (progressive disclosure benefits both The Tracker and The Casual).
- Editing should be easy and non-punitive. The Tracker will want to fix typos, update page counts, and correct genres.
- Consider cross-season reading history as a feature, not just seasonal snapshots.
- External profile links (Goodreads, StoryGraph) matter — The Tracker uses these platforms seriously.
- Series tracking should support ordering and completeness views.

---

## Cross-Cutting Scenarios

These are situational contexts that any persona might encounter. When designing a feature, consider how each persona would experience the scenario differently.

### Late Joiner

Joins weeks or months into a season.

- **The Organizer** worries about fairness and wants to reassure them the scoring still works.
- **The Competitor** stresses about the points gap and wants to know if catching up is realistic.
- **The Casual** doesn't notice or care — they just start logging books.
- **The Explorer** dives straight into challenges, since those don't depend on timing.
- **The Tracker** wants to backfill books they read before joining.

### First Season

Brand new to the app and the group's competition culture.

- **The Organizer** is also learning the admin tools while trying to help others.
- **The Competitor** needs to internalize the scoring system quickly.
- **The Casual** needs the lowest possible friction or they'll bounce.
- **The Explorer** needs to discover what challenges exist and how they work.
- **The Tracker** wants to understand every field in the book entry form.

### Returning Player

Back for another season, expects continuity and improvement.

- **The Organizer** wants to keep what worked, tweak what didn't.
- **The Competitor** wants to see their historical rank and set new goals.
- **The Casual** hopes they don't have to re-learn anything.
- **The Explorer** wants to build on previous challenge progress.
- **The Tracker** expects their full reading history to be intact.

### Multi-Org Member

Participates in more than one organization simultaneously.

- **The Organizer** may admin one org and play in another.
- **The Competitor** might game differently in each org depending on scoring rules.
- **The Casual** finds org-switching confusing.
- **The Explorer** tracks challenges separately per org.
- **The Tracker** wants a unified view of everything they've read.

### Mid-Season Rule Change

The Organizer adjusts scoring or genres after the season has started.

- **The Organizer** needs confidence that the change does what they intend.
- **The Competitor** immediately wants to know how this affects their rank.
- **The Casual** probably won't notice.
- **The Explorer** needs to know if challenge requirements changed.
- **The Tracker** wants to verify their existing entries are still scored correctly.
