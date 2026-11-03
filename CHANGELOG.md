## [1.2.3]

- Simplified Chinese interface, following the Emby UI language: plugin name, scheduled task, and the whole configuration page (settings, run, history, scan report, missing ratings, item lookup) are translated, while scan details stay canonical English on disk and are localized at render time.
- Merged the upstream 1.1.0/1.2.x UI rework (Arloes companion layout, explicit scan scope, separate missing-rating and item-lookup views) with the localization layer wired end to end.
- Scan scope, rating labels, and delete-scan results are localized from stable codes instead of pre-formatted English strings.
- Releases are published from CI: a push to `main` builds and publishes the version in `RatingSync.csproj` whenever that version has no release yet, and tags still work for re-releases. See `RELEASING.md`.

## [1.2.2]

- The plugin now targets .NET Standard 2.0, as required by the Emby plugin catalog (previously .NET Framework 4.6.2). No feature changes.

## [1.2.1]

- Replaced the placeholder plugin ID with a unique GUID (`1770753c-43e9-4454-9782-2c3b44ac06ce`) in preparation for the Emby plugin catalog. Settings and scan history are kept.
## [1.2.0]

- Added optional tiered rescanning: items released within a configurable age (default 30 days) use a shorter rescan interval (default 3 days), with an optional cap on recent-tier rescans before an item graduates to the standard interval.
- Recent-tier rescans are counted per item in scan history; items without a release date always use the standard interval.
- Scan logs report how many items are on the recent interval when tiered rescanning is enabled.
- New vector logo (`images/logo.svg`) and a sharper plugin thumbnail (`images/logo.png`).
- Existing settings and history remain compatible; tiered rescanning is off by default.

## [1.1.0]

- Added an admin-only single-request scan API returning a task ID and job ID; preserved the legacy selection route for older players.
- Expired or invalid targeted scans cannot silently become full-library scans; pending/running requests reject conflicting starts.
- Added an IMDb episode disk index with negative caching, generation invalidation and bounded retained indexes.
- Removed per-item local delays; provider requests are paced independently and checked against daily quotas before sending.
- Movie/series lookups use the correct MDBList endpoint. Critic-only gaps are included in missing-rating scans.
- Added cancellation-aware downloads/requests, dataset refresh failure backoff, atomic history/report writes and less frequent checkpoints.
- Provider failures are distinguished from unchanged ratings, with a 15-minute retry cooldown rather than the normal rescan interval.
- Added structured before/after rating changes, field-specific sources and explicit live result ordering.
- Lighter charcoal Arloes companion interface: explicit scan scope, compact results, scan filters, separate missing-rating and item-lookup views, expandable explanations and no emojis.
- Live results retain completion order, open details and scroll position while polling. Summary polls omit large detail payloads.
- Added backend and browser regression checks. Existing settings/history remain compatible.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

## [1.0.5] - 2026-07-18

- Improvement: Safer Run UX — selected-scan queue failures no longer fall back to a full library scan; targeted series/library scans respect Update Movies/Series/Episodes; IMDb-fallback-only starts are allowed; listeners bind once; cancel/resume status is more accurate.
- Improvement: Accurate API usage counting (HTTP attempts only, including MDBList show→movie retries); shared HttpClient; delay after remote calls only.
- Improvement: Progress shows smart-skip counts / status messages, rolling-window ETA, dataset download messages; result rows keyed by item id.
- Improvement: MDBList community scores only come from an `imdb` source entry (not overall score/10).
- UI: Cleaner non-pill badges/chips; Rating Sync in the Emby sidebar; clearer Both-source label, test-mode banner, targeted-scan note, scheduled-task copy.

## [1.0.4] - 2026-07-18

- Fix: `api.imdbapi.dev` is offline; IMDb ratings fallback now uses IMDb’s official free daily datasets (`title.ratings.tsv.gz`, and `title.episode.tsv.gz` when episode IDs are missing), with an improved direct page lookup as a secondary attempt.
- UI: Settings and API usage bar describe **IMDb fallback** (dataset-based) instead of the retired unofficial API.

## [1.0.3] - 2026-05-04

- Fix: IMDb unofficial API (`api.imdbapi.dev`) — normalize `tt` IDs from URLs or digit-only ids; use `?season=` for episode lists (avoid ambiguous `seasonNumber=`); resolve duplicate episode rows by vote count; when a season list row has no score, try the episode title endpoint (without duplicating a GET already done for Emby’s episode IMDb id).
- Improvement: Clearer scan skip/update messages (which sources were consulted; distinguish IMDb unofficial API from imdb.com last-resort).
- UI: Plugin settings describe the imdbapi.dev mirror without scrape warnings; dashboard shows **IMDb API** usage and reports show **IMDb API calls**.
- CI: GitHub Releases now use the **Changes** section from `CHANGELOG.md` for that tag only (no extra boilerplate in the release description).

## [1.0.2] - 2026-03-25

- Fix: Replace broken IMDb HTML scraping for episodes with `api.imdbapi.dev` (unofficial IMDb API), which bypasses the AWS WAF bot protection now blocking direct imdb.com requests.
- Fix: OMDb episode lookup now queries the episode's own IMDb ID directly (`?i={episodeId}`) when Emby provides it, improving coverage for recently aired episodes.
- Fix: `api.imdbapi.dev` fallback also applied to movies and TV series when configured sources return no community rating.
- Improvement: IMDb HTML scraper (last-resort fallback) now sends realistic browser headers to improve chances of bypassing bot-detection.

## [1.0.1] - 2026-01-08

- Fix: Prevent IMDb scraping from applying the series rating to episodes without episode IMDb IDs by resolving the episode title ID from the series episodes page.
- UI: API usage bar now notes it resets at 00:00 UTC.

## [1.0.0] - 2026-01-07

- Initial public release.
