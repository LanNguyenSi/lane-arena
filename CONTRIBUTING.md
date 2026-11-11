# Contributing

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md).

This repository publishes the reports and slides of the Lane Arena editions
and harness comparisons. The briefs, hidden tests, run logs and the harness
that ran them are not part of it, so editions themselves are not accepted as
contributions.

## What helps

- Errors in a report or in the slides: a wrong number, a claim the report
  does not back, a broken link, a translation that differs between the
  English and the German text. Open an issue or a pull request.
- Ideas for a future edition or comparison: open a feature request.

## Pull requests

- One topic per pull request.
- Keep the English and German versions in step (`README.md` and
  `README.de.md`, the slides `index.html` and `de.html`): a fix in one
  language goes into the other as well.
- Build the site before you push: `npm ci && npm run build` renders the
  reports into `_site/` and fails on a local link that points at a missing
  file. `_site/` is never committed.

## License

By contributing you agree that your contributions are licensed under
[CC BY 4.0](LICENSE), as the rest of the texts and slides.
