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
`README.de.md`, and a card in `index.html`.

## License

Texts and slides are licensed under [CC BY 4.0](LICENSE).
