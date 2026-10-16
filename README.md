**English** | [Deutsch](README.de.md)

# Lane Arena

How well does a locally hosted open-weight model, the "lane", hold up as an implementer
against cloud models? The Lane Arena puts them head to head on real, open tickets: the same
brief, isolated repository clones, a blind review and hidden tests.

All editions and slides: https://lannguyensi.github.io/lane-arena/

## Editions

| Edition | Date | Tasks | Participants | Report | Slides |
|---|---|---|---|---|---|
| Pilot | October 2026 | 2 (medium, hard) | Lane (Qwen3.8-Flash-Next), Claude Haiku/Sonnet/Opus 5.5, GPT-6.1-Sol, GPT-6-Luna | [Report](runs/2026-10-pilot/README.md) | [online](https://lannguyensi.github.io/lane-arena/runs/2026-10-pilot/) · [PDF](runs/2026-10-pilot/presentation.pdf) |

## Harness comparisons

Same model, different agent harness. These are not arena editions: no competing
participants, no blind review, no hidden tests, so the rules below do not apply. Each
report describes its own setup.

| Comparison | Date | What | Report |
|---|---|---|---|
| opencode 1.19 vs. 2 | October 2026 | Lane (Qwen3.8-Flash-Next) in opencode 1.19.0 and 2.0.25: sandbox behaviour, micro benchmark, one real ticket replayed | [Report](harness/2026-10-opencode-2/README.md) |

## Rules (apply to every edition)

- All participants get the same brief per task and work in their own isolated clone of the
  same base commit.
- A fresh reviewer checks every solution without learning who wrote it.
- Hidden tests are frozen before the first run and checked against the base state.
- **Passed** means: the blind review returns `accept` or `accept_with_notes`. At most 3
  rounds. In a fix round the participant gets the brief plus the review findings of
  severity medium and above.
- Deviations from these rules are documented in the report of the respective edition.

## Layout

```
runs/<yyyy-mm>-<name>/
  README.md             report (English)
  README.de.md          report (German)
  index.html            slides, English (served via GitHub Pages)
  de.html               slides, German
  presentation.pdf      slides as PDF (English)
  presentation.de.pdf   slides as PDF (German)
```

A new edition gets its own folder under `runs/`, a row in the tables of `README.md` and
`README.de.md`, and a card in `index.html`. A harness comparison works the same way under
`harness/<yyyy-mm>-<name>/` (report only, slides optional) with a row in the harness
tables and a card in `index.html`.

For each edition and comparison the repository holds only the report and the slides. The
briefs, hidden tests, run logs and the harness that ran it are not published here.

The Pages site is built on every push to `main` (`.github/workflows/pages.yml`, locally
`npm ci && npm run build` into `_site/`). The build renders the `README.md` and `README.de.md`
of each edition and comparison to `report.html` and `report.de.html`, rewrites relative report links to
their site targets and fails when a local link on the site points at a file that does not
exist or lies outside the site. Anchors after `#` are not checked. The reports stay
Markdown; the HTML is never committed.

## License

Texts and slides are licensed under [CC BY 4.0](LICENSE).
