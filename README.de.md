[English](README.md) | **Deutsch**

# Lane-Arena

Wie gut schlägt sich ein lokal betriebenes Open-Weight-Modell, die "Lane", als
Implementierer gegen Cloud-Modelle? Die Lane-Arena lässt sie auf echten, offenen Tickets
gegeneinander antreten: gleiches Briefing, isolierte Repository-Klone, blinder Review
und versteckte Tests.

Alle Ausgaben und Präsentationen: https://lannguyensi.github.io/lane-arena/?lang=de

## Ausgaben

| Ausgabe | Datum | Aufgaben | Teilnehmer | Bericht | Folien |
|---|---|---|---|---|---|
| Pilot | Oktober 2026 | 2 (mittel, schwer) | Lane (Qwen3.8-Flash-Next), Claude Haiku/Sonnet/Opus 5.5, GPT-6.1-Sol, GPT-6-Luna | [Bericht](runs/2026-10-pilot/README.de.md) | [online](https://lannguyensi.github.io/lane-arena/runs/2026-10-pilot/de.html) · [PDF](runs/2026-10-pilot/presentation.de.pdf) |

## Harness-Vergleiche

Gleiches Modell, anderer Agent-Harness. Das sind keine Arena-Ausgaben: keine
konkurrierenden Teilnehmer, kein blinder Review, keine versteckten Tests, die Spielregeln
unten gelten daher nicht. Jeder Bericht beschreibt seinen eigenen Aufbau.

| Vergleich | Datum | Was | Bericht |
|---|---|---|---|
| opencode 1.19 gegen 2 | Oktober 2026 | Lane (Qwen3.8-Flash-Next) in opencode 1.19.0 und 2.0.25: Sandbox-Verhalten, Mikro-Benchmark, ein echtes Ticket wiederholt | [Bericht](harness/2026-10-opencode-2/README.de.md) |

## Spielregeln (gelten für alle Ausgaben)

- Alle Teilnehmer bekommen pro Aufgabe denselben Brief und arbeiten in einem eigenen,
  isolierten Klon desselben Basis-Commits.
- Jede Lösung prüft ein frischer Reviewer, der nicht erfährt, von wem sie stammt.
- Versteckte Tests werden vor dem ersten Lauf eingefroren und am Ausgangsstand gegengeprüft.
- **Bestanden** heißt: Der blinde Review liefert `accept` oder `accept_with_notes`.
  Höchstens 3 Runden. In einer Fix-Runde bekommt der Teilnehmer den Brief plus die
  Review-Findings ab Schweregrad medium.
- Abweichungen von diesen Regeln stehen im Bericht der jeweiligen Ausgabe.

## Aufbau

```
runs/<jjjj-mm>-<name>/
  README.md             Bericht (Englisch)
  README.de.md          Bericht (Deutsch)
  index.html            Präsentation, Englisch (läuft über GitHub Pages)
  de.html               Präsentation, Deutsch
  presentation.pdf      Präsentation als PDF (Englisch)
  presentation.de.pdf   Präsentation als PDF (Deutsch)
```

Eine neue Ausgabe bekommt einen eigenen Ordner unter `runs/` und je eine Zeile in den
Tabellen von `README.md` und `README.de.md` sowie eine Karte in `index.html`. Ein
Harness-Vergleich läuft genauso unter `harness/<jjjj-mm>-<name>/` (nur Bericht, Folien
optional) mit einer Zeile in den Harness-Tabellen und einer Karte in `index.html`.

Zu jeder Ausgabe und jedem Vergleich enthält das Repository nur den Bericht und die Folien. Briefs, versteckte
Tests, Laufprotokolle und das Harness, mit dem sie lief, sind hier nicht veröffentlicht.

Die Pages-Seite wird bei jedem Push auf `main` gebaut (`.github/workflows/pages.yml`, lokal
`npm ci && npm run build` nach `_site/`). Der Build rendert `README.md` und `README.de.md`
jeder Ausgabe und jedes Vergleichs zu `report.html` und `report.de.html`, schreibt relative Links im Bericht auf
ihre Ziele auf der Seite um und bricht ab, wenn ein lokaler Link auf der Seite auf eine
Datei zeigt, die es nicht gibt oder die außerhalb der Seite liegt. Anker nach `#` werden
nicht geprüft. Die Berichte bleiben Markdown; das HTML wird nie eingecheckt.

## Lizenz

Texte und Folien stehen unter [CC BY 4.0](LICENSE).
