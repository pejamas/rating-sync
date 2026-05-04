# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

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
