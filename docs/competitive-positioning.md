# Competitive Positioning — Super Reader Championship

This document maps the competitive landscape, identifies where each adjacent product excels and falls short, and gives you a sharp answer to the inevitable "oh, so it's like Goodreads?" Use it for product strategy, pitch conversations, and roadmap prioritization.

It is a companion to `docs/personas.md` and `docs/ui-ux-design.md` — the personas and design principles defined there are what justify most of the differentiation claims below.

---

## Executive Summary

**Super Reader Championship is a reading competition platform for friend groups and casual book clubs — a fantasy league for books.**

We are not a reading tracker, a social network for readers, or a book club coordination tool. Those exist, they are crowded, and they are owned by incumbents with massive catalogs and network effects. We sit one category over: the *gamified group competition* that those incumbents treat as a forum thread or a feature footnote. The product is what you would build if you took the spreadsheet a friend group already runs every year and gave it customizable scoring, real-time leaderboards, multi-org support, persona-aware UX, and a challenge system that treats genre diversity, alphabet, and country tracking as first-class.

When someone says "oh, like Goodreads?", the right answer is: *Goodreads tracks what you've read. We run a season-long contest between you and your friends, with house rules.*

---

## The Category Frame

The book-app market is usually described as one big space, but it is really four overlapping circles. Knowing which circle you are in clarifies who is actually competing for the same minutes of attention.

1. **Personal trackers** — Goodreads, The StoryGraph, Hardcover, Literal, Bookly, Libib. Solo logging, ratings, stats, want-to-read shelves.
2. **Social and discovery networks** — Fable, Goodreads' social graph, Bookstagram/BookTok ecosystems. Reader-to-reader content, recommendations, follow graphs.
3. **Book club coordination** — Bookclubs.com, Fable Clubs, Discord/GroupMe/iMessage threads. Picking a shared book, scheduling meetings, discussion threads.
4. **Reading challenges and gamification** — Beanstack, StoryGraph prompt challenges, PopSugar-style yearly lists, Reading Bingo cards, Goodreads' yearly goal.

We sit at the intersection of **(3) book club coordination** and **(4) gamification** — a quadrant where almost no purpose-built consumer product exists. Today that intersection is occupied by spreadsheets, group chats, and homemade Notion templates. That is exactly what `scripts/migrate-spreadsheet.ts` migrated *away* from. The market gap is real, and it is shaped like our product.

---

## Competitor Teardowns

Each block follows the same structure: who they are, where they excel, where they are weak, and how they relate to us.

### Goodreads

- **What it is:** Amazon-owned, the dominant reading tracker by a wide margin. Massive catalog, ratings at scale, the de facto book database.
- **Excels at:** Catalog completeness, social graph for individual readers, established habit ("I'll add it on Goodreads"), yearly reading goal as a personal metric.
- **Weak at:** UX has not meaningfully improved in a decade. "Group challenges" are forum threads where members manually post progress in numbered comments — there is no automated leaderboard, no scoring rules, no admin moderation, no challenge gap analysis. The 35,000-member 2026 Reading Challenge Group is essentially a shared spreadsheet expressed as a forum.
- **Relation to us:** Complementary, not competitive. Many of our players keep their canonical reading log on Goodreads — that's why external Goodreads profile links matter to The Tracker (per `docs/personas.md`). We don't replace their library; we replace the spreadsheet their friend group runs on top of it.

### The StoryGraph

- **What it is:** The premier modern alternative to Goodreads. Independent, indie, beloved by serious readers.
- **Excels at:** Personal stats (mood, pace, genre breakdowns), AI recommendations, prompt-based reading challenges (their 2026 Genre Challenge has 34k participants, Reads the World has 25k), buddy reads (up to 15) and readalongs (up to 1000) with checkpoint discussions.
- **Weak at:** Their challenges are individual prompt checklists, not group competitions. Their buddy reads are discussion-driven, not score-driven — there is no concept of points, no leaderboard ranking by score, no admin-configurable scoring rules, no audiobook penalties tunable per group, no per-group customization at all. You cannot run a friend-group competition on StoryGraph any more easily than on Goodreads.
- **Relation to us:** The most likely product to *eventually* drift into our territory because their data foundation is strong. Today they are a personal tracker with social features bolted on, not a group competition platform.

### Fable

- **What it is:** Mobile-first reader social app focused on book clubs and discussion.
- **Excels at:** Beautiful mobile UX, AI-assisted summaries and discussion prompts, in-app discussion threads, club milestones tied to chapter progress.
- **Weak at:** Fable Clubs are explicitly *discussion-led*, not competition-led. Everyone in a Fable club reads the same book; we are built for the opposite — everyone reads what they want and earns points. No customizable scoring, no leaderboard, no challenge primitives, no admin rules.
- **Relation to us:** Different use case. A user could plausibly belong to a Fable club (for shared reading) and a Super Reader Championship org (for the competition) without overlap.

### Hardcover

- **What it is:** A modern, indie Goodreads alternative with a steady stream of feature releases.
- **Excels at:** Tracker depth — 2026 brought a series tracker, 18 new stat visualizations, customizable dashboards, timezone-aware date precision, and Goodreads/StoryGraph CSV import. Strong appeal to The Tracker persona.
- **Weak at:** Entirely individual-focused. No group competitions, no leaderboards beyond personal stats, no challenge admin, no shared scoring rules. Premium tier is $4.99/month for personal stats, not for group features.
- **Relation to us:** Same complementary relationship as Goodreads/StoryGraph. The Tracker persona may keep their canonical log here; we layer the competition on top.

### Literal, Bookly, Libib

- **What they are:** Personal reading tools — Literal is a minimalist tracker, Bookly is a session timer, Libib is library cataloging.
- **Excels at:** Each does its narrow thing well.
- **Weak at:** None of them are group products. None have leaderboards, challenges, or shared scoring.
- **Relation to us:** Not competitors. Mentioned for completeness so we can name them when asked.

### Beanstack

- **What it is:** The closest competitor *in spirit*. Gamified reading challenges with leaderboards, badges, streaks, and friend-code-based competition. Used widely in libraries and schools.
- **Excels at:** A real reading-competition primitive that already works for adults — minutes-logged leaderboards, friend codes, badge tiers (e.g., 100/500/1000-minute milestones), challenge participation across thousands of libraries.
- **Weak at:** Distribution is B2B through libraries — you can't just sign up your friend group, you need a participating library. UX is built for kids/families and feels institutional. Scoring is fixed (minutes logged), not customizable per group. No alphabet/country/genre challenge axes. No way for a friend who hosts the competition to author and tune house rules.
- **Relation to us:** The most direct overlap of any product on this list, but the channel and customization gap is enormous. Beanstack is "library reading program with a leaderboard." We are "your friend group's reading league with the rules they argued about for an hour."

### Bookclubs.com

- **What it is:** The dominant book club organizer — meetings, polls, discussion boards, used by 1M+ readers.
- **Excels at:** Meeting scheduling, attendance, ranked-choice voting on next book, integrated video meetings on premium tiers ($5–$19/month per club).
- **Weak at:** It is a *book club* product, not a *book competition* product. They organize the act of picking and discussing one shared book. There is no per-book scoring, no individual competition, no points or ranking.
- **Relation to us:** Complementary if a group does both, but most groups do one or the other. We are the "everyone reads their own books and competes" version; Bookclubs.com is the "everyone reads the same book and discusses it" version.

### The Spreadsheet

- **What it is:** Your real incumbent. A shared Google Sheet with tabs for each player, hand-rolled scoring formulas, and a leaderboard maintained by The Organizer. Literally the artifact `scripts/migrate-spreadsheet.ts` exists to import.
- **Excels at:** Free. Infinitely flexible. Already familiar to The Organizer. Trivial to fork for next season.
- **Weak at:** Useless on mobile. Onboarding is "let me share this link and explain the formulas." Real-time leaderboard requires manual recalculation. No challenge-progress visualizations. No score-preview while entering a book. No moderation. The Casual will never log a book in 30 seconds in a spreadsheet.
- **Relation to us:** This is the actual competitor. Most of our wins or losses will be measured against "could I just keep using the spreadsheet?"

### Discord, GroupMe, iMessage threads

- **What it is:** "We'll just track it ourselves" in a group chat.
- **Excels at:** Already where the friend group hangs out. Zero onboarding cost.
- **Weak at:** No structure, no scoring, no leaderboard, no challenge tracking, no history that survives scroll-back.
- **Relation to us:** The "we don't even need a tool" alternative. Same relationship as the spreadsheet, just less ambitious.

---

## Where the Field Is Weak — The Gaps We Own

Across the entire competitive set, here is what no one else does well. These are the gaps that justify our existence.

- **Customizable scoring rules per group.** Every friend group has house rules — does the audiobook count for half? Do rereads count? Is fiction worth less than nonfiction? Beanstack's scoring is fixed, StoryGraph and Goodreads have no scoring at all. We make these tunable without enterprise complexity, which is exactly the "Admin ≠ Enterprise" principle in `docs/ui-ux-design.md`.
- **Multi-organization support.** A single user can play in their work book club, their college friends' league, and their family's annual contest — each with its own rules and history. This is a first-class concept in the data model and the UX, and it is the kind of thing every other tool would have to retrofit.
- **Challenge primitives as a parallel scoring axis.** Alphabet, countries, and genre diversity are not seasonal gimmicks — they are tracked entities with gap analysis ("you're missing J, Q, X, Z"), eligibility rules, and dedicated UI surfaces. StoryGraph's challenges are individual prompt checklists; ours are integrated into the competition.
- **Season-based competition with persistent cross-season history.** The Tracker persona explicitly cares about reading history surviving across seasons. Beanstack resets each library program. Goodreads challenges are year-by-year forum threads. We keep history continuous while letting each season have its own rules and leaderboard.
- **Persona-aware progressive disclosure.** The Casual logs a book in 30 seconds. The Competitor sees the full scoring math. The Tracker edits metadata after the fact. Same product, different layers — see `docs/ui-ux-design.md` "Progressive Disclosure Over Feature Flags." No competitor in this space designs against five persona archetypes; they design for "the reader."
- **A leaderboard that is built for competition, not a feature footnote.** Recent activity, point movement, "you're 45 points behind 2nd place," challenge progress alongside rank. This is the home page of our product. On every other product on this list, ranking — if it exists at all — is buried.

---

## Differentiation Pillars

These are the four claims the product is built around. Use them in conversations and as a sanity check on roadmap decisions.

1. **Designed for the group, not the individual.** Goodreads, StoryGraph, and Hardcover all answer the question "what have *I* read?" We answer "how is *our group* doing?" Every screen, starting with the leaderboard as the home page, is built around shared context.
2. **Customizable rules, run by a friend.** The Organizer is a friend hosting a book club, not a SaaS administrator. Scoring, genres, audiobook penalties, bonus and deduction rules — all configurable, with sensible defaults so launching a season doesn't require touching a single field. Beanstack has rules but you don't get to change them; everyone else has no rules at all.
3. **Challenges as a first-class system.** Alphabet, countries, and genre diversity are a parallel competition axis with their own progress UI and gap analysis. The Explorer persona exists because this isn't a side feature.
4. **Replaces the spreadsheet, not the bookshelf.** We are aware that our users already have a Goodreads, StoryGraph, or Hardcover account, and we don't fight that. External profile links are a real surface in the product. The Tracker can keep their canonical library wherever they want; we run the competition that sits on top.

---

## The "Oh, So It's Like Goodreads?" Playbook

This is the section you will actually use in conversation. Three layered responses, in the order you should reach for them.

### The one-liner — use first

> "Goodreads tracks what you've read. This runs a season-long competition between you and your friends — like a fantasy football league for books."

The "fantasy league" metaphor does almost all of the work. It immediately tells the listener: there are seasons, rules, scoring, a leaderboard, and a friend group that already exists.

### The 30-second version — for a follow-up "tell me more"

> "A friend of mine ran our reading competition out of a Google Sheet for years. We had house rules — fiction is worth less, audiobooks count for half, you get a bonus for reading from a country no one else has covered. The leaderboard had to be recalculated by hand, no one could log books on their phone, and onboarding new people meant a 20-minute call. This is that — but as an app. Each group sets its own rules, the leaderboard updates in real time, and there are challenges layered on top: read a book starting with every letter of the alphabet, hit a genre diversity goal, cover the most countries. You can be in multiple leagues at once."

This version names the spreadsheet pain, gives concrete examples of the rules, and surfaces the multi-org idea.

### Pre-canned answers to the next four questions

People reliably ask these next, in roughly this order:

- **"So it's like a book club?"**
  No. Book clubs pick one book and read it together. This is a season where everyone reads what they want and earns points. Closer to a fantasy league than a book club. (If they use Bookclubs.com or Fable, you can say: "those products are for picking a shared book — this is for everyone reading their own and competing.")

- **"Why not just use a spreadsheet?"**
  That is literally what we replaced. Spreadsheets break down on mobile, on onboarding, on real-time scoring, on challenge progress, and on edge-case arguments. Once your group is more than four or five people, the maintainer becomes a bottleneck and stragglers stop logging.

- **"Can't Goodreads do this?"**
  Goodreads has a yearly reading goal and group forums where people manually post progress in numbered comments. There is no automated leaderboard, no scoring rules, no admin moderation, and no challenge gap analysis. The 35k-member 2026 Reading Challenge Group is a shared spreadsheet expressed as a forum thread. This is the product version of what those groups are trying to do by hand.

- **"What about The StoryGraph or Beanstack?"**
  StoryGraph has buddy reads and prompt-based challenges, but they are individual checklists with no group leaderboard and no customizable scoring. Beanstack has gamified leaderboards but is sold to libraries and schools — you can't sign up your friend group, scoring is fixed at minutes-logged, and the UX is built for institutional reading programs. We are the consumer, self-serve, customizable version of that quadrant.

- **"Who's it for?"**
  Existing friend groups and casual book clubs that want their reading to feel like a shared game. Not solo trackers, not strangers-meet-online communities, not corporate reading programs. If your friend group has ever talked about doing a reading competition, or actually ran one in a spreadsheet, you are the target.

---

## Risks and Where Competitors Could Catch Up

A CPO-grade analysis includes the honest version. Here is where the moat is thin.

- **The StoryGraph is the most likely incumbent threat.** Their data foundation, indie credibility, and community are strong. If they decide group competitions are a feature, they can add a leaderboard and basic scoring on top of buddy reads relatively quickly. Our defense is depth: customizable scoring, challenge primitives, multi-org, and persona-aware UX are not a weekend project.
- **Fable could push competitive clubs alongside discussion clubs.** Their UX is good and their social graph is real. They are unlikely to do this because their product center of gravity is discussion-led, but it is possible.
- **Beanstack could go consumer/self-serve.** They already have the leaderboard and gamification primitives. Their channel is libraries, but a consumer SKU is not unimaginable. Our defense is customization (their scoring is fixed) and target user (we don't feel like a library program).
- **Discord bots, Notion templates, or a really good Google Sheets template could occupy the low end.** The "good enough" threat is real because the competing artifact is free and already where the friend group lives. Our defense is the things a template cannot do well: mobile-first entry under 30 seconds, real-time scoring, challenge gap analysis, multi-season continuity.
- **Goodreads will not catch up.** Amazon has not invested meaningfully in the product in years. They are the incumbent for the catalog and the social graph, not for new product surfaces.

The defensibility story, in short: every feature on the persona-aware roadmap (customizable scoring depth, multi-org continuity, challenge gap analysis, the five-persona design philosophy) is a thing competitors would have to bolt on top of a product designed for a different center of gravity. We started here.

---

## Using This Document

When evaluating a new feature, ask: does this strengthen one of the four differentiation pillars, or does it pull us toward a quadrant where someone bigger already wins? When pitching the product, lead with the fantasy-league metaphor and earn your way to the spreadsheet story. When prioritizing the roadmap, weight the gaps in *Where the Field Is Weak* — that is where we build moat instead of parity.
