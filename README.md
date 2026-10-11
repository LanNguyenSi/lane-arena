# Lane-Arena

Wie gut schlägt sich ein lokal betriebenes Open-Weight-Modell, die "Lane", als
Implementierer gegen Cloud-Modelle? Die Lane-Arena lässt sie auf echten, offenen Tickets
gegeneinander antreten: gleiches Briefing, isolierte Repository-Klone, blinder Review
und versteckte Tests.

Präsentationen ansehen: https://lannguyensi.github.io/lane-arena/

## Ausgaben

| Ausgabe | Datum | Aufgaben | Teilnehmer | Bericht | Folien |
|---|---|---|---|---|---|
| Pilot | Oktober 2026 | 2 (mittel, schwer) | Lane (Qwen3.8-Flash-Next), Claude Haiku/Sonnet/Opus 5.5, GPT-6.1-Sol, GPT-6-Luna | [Bericht](runs/2026-10-pilot/README.md) | [online](https://lannguyensi.github.io/lane-arena/runs/2026-10-pilot/) · [PDF](runs/2026-10-pilot/presentation.pdf) |

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
  README.md          Bericht
  index.html         Präsentation (läuft über GitHub Pages)
  presentation.pdf   Präsentation als PDF
```

Eine neue Ausgabe bekommt einen eigenen Ordner unter `runs/` und je eine Zeile in der
Tabelle oben und in `index.html`.

## Lizenz

Texte und Folien stehen unter [CC BY 4.0](LICENSE).
