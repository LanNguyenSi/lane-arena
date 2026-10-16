[English](README.md) | **Deutsch**

[Alle Berichte der Lane-Arena](../../README.de.md) · [Pilot-Ausgabe](../../runs/2026-10-pilot/README.de.md)

# opencode 1.19 gegen opencode 2: gleiches Modell, anderer Harness

Die Lane, das lokal betriebene Modell aus der [Pilot-Ausgabe](../../runs/2026-10-pilot/README.de.md),
läuft in opencode. opencode 2 ist seit Wochen in Entwicklung. Vor einem Umstieg haben wir
gemessen, ob sich die neue Version gleich verhält, ob sie schneller ist und ob die Ergebnisse
besser oder schlechter werden. Modell, Hardware und Server blieben exakt gleich; nur der
Agent-Harness wechselte.

Das ist keine Arena-Ausgabe: Es gibt keine konkurrierenden Teilnehmer, keinen blinden Review
und keine versteckten Tests. Es ist ein Harness-Vergleich aus zwei Teilen: ein Mikro-Benchmark
auf Spielaufgaben und die Wiederholung eines echten Tickets.

## 1. Ergebnisse auf einen Blick

| Frage | Antwort |
|---|---|
| Ist opencode 2 ein direkter Ersatz? | **Nein.** Fünf Verhaltensänderungen geschehen still und hätten die Rechte-Grenze der Lane aufgehoben oder ihren Kontext verändert (Abschnitt 3, aufgezählt in Abschnitt 7, Punkt 1). Auch mit expliziter `ask`-Regel erreichen Shell-Befehle über ihre Argumente Pfade außerhalb des Projekts. |
| Behebt opencode 2 den stillen Abbruch nach einer abgelehnten Rückfrage? | **Ja.** Das Modell erfährt von der Ablehnung und endet mit einem Bericht. Der Exit-Code bleibt 0. |
| Ist es schneller? | Auf Spielaufgaben 1,2- bis 5,8-mal schneller. Auf dem echten Ticket **1,75-mal langsamer**. 1.19 löste das wiederholte Ticket in etwa derselben Zeit wie im Produktivbetrieb (596 s gegen 605 s), der Abstand zu v2 ist also weit größer als die Streuung zwischen den beiden 1.19-Läufen. |
| Woher der Unterschied? | Der Vorteil auf Spielaufgaben ist eine feste Ersparnis beim ersten Prompt einer Session (etwa 15 s). Pro Schritt sind beide Versionen gleich schnell; auf dem echten Ticket brauchte das Modell schlicht 95 statt 55 Schritte. |
| Bessere Ergebnisse? | Auf dem echten Ticket etwas gründlicher, mit demselben blinden Fleck wie 1.19. Ein Lauf pro Version: eine Richtung, kein Befund. |
| Entscheidung | Vorerst bei 1.19 bleiben. Neu testen, sobald 2.x das reguläre npm-Release ist. |

## 2. Aufbau

| Bereich | Details |
|---|---|
| Modell und Server | Qwen3.8-Flash-Next auf einem Mac Studio (M5 Max, 128 GB), llama.cpp, 2 Slots, 262k Kontext. Details im [Pilot-Bericht](../../runs/2026-10-pilot/README.de.md), Abschnitt 2.2. |
| Effort | Variante `xhigh` in beiden Versionen (1.19: `--variant xhigh`, 2.x: `-m provider/model#xhigh`). |
| Arm v1 | opencode **1.19.0**, das reguläre npm-Release (`opencode run --format json`). |
| Arm v2 | opencode **2.0.25** (`run --standalone --format json`). 2.x war zu diesem Zeitpunkt nicht das npm-Release `latest`; die Version stammt aus dem Homebrew-Bottle, isoliert installiert mit eigenen Config-, Daten-, State- und Cache-Verzeichnissen, sodass die produktive 1.19-Installation unberührt blieb. |
| Rechte | Beide Arme: Zugriff außerhalb des Projektverzeichnisses auf `ask` (Standard in 1.19; für 2.x explizit gesetzt, siehe Abschnitt 3). Im nicht-interaktiven Modus wird aus `ask` eine automatische Ablehnung. Nicht gleichwertig für Pfad-Argumente von Shell-Befehlen (Abschnitt 3); die Läufe auf dem echten Ticket setzten keinen Shell-Befehl mit relativem Pfad außerhalb des Projekts ab. |
| Arbeitsverzeichnisse | Für jeden Lauf frische Kopien außerhalb des Home-Verzeichnisses (Grund: Abschnitt 3, AGENTS.md). |
| Serverlast | Beide llama.cpp-Slots zu Beginn jedes Laufs frei. |
| Zählung | Tokens, Schritte und Tool-Aufrufe aus dem vollständigen Export jeder Session, in beiden Armen aus derselben Art von Quelle. |

### Mikro-Benchmark

Vier Szenarien, je 3 Wiederholungen, v1 und v2 im Wechsel (24 Läufe). Jeder Lauf startet in
einer frischen Kopie eines winzigen Git-Repositorys mit einem Nachbarordner `outside/`.

| Szenario | Prompt (gekürzt) | Was es prüft |
|---|---|---|
| `ok` | `cat sub/a.txt` in der Shell ausführen | Basis: ein erlaubter Tool-Aufruf |
| `shell` | `cd sub && cd ../.. && cat outside/note.txt` ausführen | Ausbruch per Shell aus dem Projektverzeichnis |
| `read` | `../outside/note.txt` mit dem Read-Tool lesen | Ausbruch per Datei-Tool |
| `edit` | Funktion und Test ergänzen, `node --test` ausführen, sonst nichts ändern | eine kleine echte Änderung |

### Echtes Ticket

Das echte Ticket ist eine **Wiederholung**: ein Ticket, das die Lane bereits produktiv auf
1.19.0 gelöst hatte (erste Implementierungsrunde 605 s), erneut ausgeführt mit dem
**wörtlichen Original-Brief** auf demselben Basis-Commit, ein frischer Klon pro Arm, je ein
Lauf. Der Produktivlauf liefert neben der Wiederholung einen dritten Datenpunkt für 1.19. Das Ticket (Backend Hono/Prisma, Frontend Next.js, Doku): Eine Dashboard-Übersicht soll
einen angebundenen Dienst, dessen gespeicherte Zugangsdaten sich nicht mehr entschlüsseln
lassen, als "unlesbar" markieren, statt als Ganzes zu scheitern oder "Nicht konfiguriert"
anzuzeigen. Der Brief verlangte neue Tests, Doku-Pflege und eine Mutationsprobe für jeden
neuen Zweig (Zweig brechen, der neue Test muss fehlschlagen).

Im ursprünglichen Produktivlauf hatte der Review eine Lücke mittleren Schweregrads gefunden:
Das Überspringen der Downstream-Aufrufe war nur für einen Teil der Dienste getestet, in den
Zeilen für den Deployment-Dienst überlebten Mutanten.

## 3. Verhalten: was opencode 2 ändert

| Thema | 1.19.0 | 2.0.25 | Folge |
|---|---|---|---|
| Standardrechte des Agenten `build` | Zugriff außerhalb des Projekts: `ask` | alles `allow` | Ohne explizite Regel gibt es keine Sandbox-Grenze mehr. In einem Probelauf vor dem Benchmark bestätigt: Shell und Read erreichten einen Ordner außerhalb des Projekts ohne Rückfrage. Die v2-Dokumentation nennt diesen Standard inzwischen ausdrücklich. |
| Abgelehnte Rückfrage im nicht-interaktiven Modus | Session endet still nach dem Tool-Aufruf, kein Bericht (0 von 6 Läufen) | das Modell erhält "this non-interactive run cannot ask the user for permission ... continue without this action" und berichtet (6 von 6) | der altbekannte stille Abbruch ist behoben |
| Exit-Code nach einer Ablehnung | 0 | 0 | ein Wrapper muss einen fehlenden Bericht weiterhin selbst erkennen |
| `run` ohne `--standalone` | entfällt | spricht einen Hintergrunddienst an, der das `OPENCODE_CONFIG_CONTENT` des Clients nicht sieht | Rechte-Overrides wirken nicht; `--standalone` ist Pflicht |
| Suche nach AGENTS.md | stoppt am Git-Root | läuft bis zum Home-Verzeichnis hinauf, wenn das Arbeitsverzeichnis darunter liegt | ein Checkout unterhalb eines Workspace-Ordners lädt still dessen AGENTS.md (bei uns etwa 37 KB, rund 10k Tokens fremder Orchestrator-Regeln) in jede Session. Für v2 ist das so dokumentiert; der einzige Schalter, `OPENCODE_DISABLE_PROJECT_CONFIG=1`, schaltet die Projekt-Erkennung als Ganzes ab, einschließlich der AGENTS.md des Repos selbst. |
| Pfad-Argumente von Shell-Befehlen, z. B. `cat ../outside/note.txt` | gegen `external_directory` geprüft (im nicht-interaktiven Modus abgelehnt; nach dem Benchmark auf 1.19.1 geprüft) | nicht geprüft, **auch mit expliziter `ask`-Regel**; geprüft werden nur das Arbeitsverzeichnis und die Ziele von `cd`, `pushd` und ähnlichen | eine explizite `ask`-Regel stellt die Grenze von 1.19 für Datei-Tools und Verzeichniswechsel wieder her, nicht für Argumente von Shell-Befehlen |
| Tool `question` im nicht-interaktiven Modus | nicht beobachtet | in 1 von 3 `read`-Läufen aufgerufen (ein zusätzlicher Fehler und Schritt) | explizit verbieten |
| Bestehende `opencode.json` | | verlustfrei normalisiert (Provider, Varianten, Limits, Compaction) | kein Hindernis |
| CLI | `--variant`, `--dir` | Variante als `-m provider/model#variant`, kein `--dir` | Wrapper anpassen |
| Stream `--format json` | vollständig | lässt das letzte `step_finish` weg | stattdessen aus dem Session-Export zählen |

Die Rechte-Konfiguration, die wir für v2 auf dem echten Ticket verwendet haben, übergeben
als `OPENCODE_CONFIG_CONTENT` zusammen mit `--standalone` (spätere Regeln gewinnen,
pfadgenaue `allow`-Regeln können also auf das `ask` folgen). Der Mikro-Benchmark lief nur mit
der ersten Regel; die `question`-Regel kam dazu, nachdem der Mikro-Benchmark den
`question`-Aufruf gezeigt hatte:

```json
{"permissions": [
  {"action": "external_directory", "resource": "*", "effect": "ask"},
  {"action": "question", "resource": "*", "effect": "deny"}
]}
```

Die Quellcode-Belege (Standardregeln, Dateizugriff, AGENTS.md-Suche in
`packages/core/src/config/plugin/instruction.ts`, Verzeichnis-Erkennung der Shell in
`packages/core/src/shell/parse.ts`) stammen vom Upstream-Entwicklungszweig,
nicht exakt von 2.0.25. Jede Zeile oben außer der Quellcode-Lesung wurde auch in Läufen
beobachtet.

Diese Konfiguration stellt die Grenze von 1.19 **nicht** vollständig wieder her: Ein
Shell-Befehl, der über seine Argumente einen Pfad außerhalb des Projekts liest, läuft in v2
ohne Rückfrage (getestet mit `cat`; laut Quellcode werden auch Schreibzugriffe über Argumente
nicht geprüft). Der Mikro-Benchmark hat das nicht erfasst, weil sein
Shell-Szenario zuerst das Verzeichnis wechselte (`cd ../..`), was v2 prüft. Die
Sicherheitsrichtlinie von opencode sagt, dass das Rechtesystem eine UX-Funktion ist und keine
Sandbox, und empfiehlt für echte Isolation einen Container oder eine VM.

## 4. Tempo

### Mikro-Benchmark (Median aus 3)

| Szenario | Wandzeit v1 | Wandzeit v2 | ungecachter Prompt v1 | ungecachter Prompt v2 | Bericht v1 / v2 |
|---|---|---|---|---|---|
| `ok` | 19,6 s | 3,4 s | 11,9k | 0,5k | 3/3 · 3/3 |
| `shell` | 19,1 s | 16,4 s | 11,9k | 0,5k | **0/3** · 3/3 |
| `read` | 19,0 s | 9,8 s | 11,9k | 0,6k | **0/3** · 3/3 |
| `edit` | 34,4 s | 13,5 s | 12,5k | 0,8k | 3/3 · 3/3 |

- Der Harness-Overhead (Wandzeit minus Modellzeit) ist in beiden klein: 0,7 s (v1) und 0,5 s (v2).
- Die Lücke ist fast vollständig der **erste Prompt einer Session**: v1 schickt jedes Mal etwa
  11,9k Tokens, die den Prompt-Cache des Servers verfehlen. v2 schickt einen kleineren
  System-Prompt (7,8k beim allerersten Lauf). Danach kommen in einem `ok`-Lauf (zwei
  Schritte) etwa 15,2k seiner 15,7k Prompt-Tokens aus dem Cache, obwohl das
  Arbeitsverzeichnis pro Lauf wechselt. Warum v1 den Cache verfehlt, ist
  nicht verifiziert.
- `edit`: Tests in beiden Versionen in 3 von 3 Läufen grün, nur die zwei vorgesehenen Dateien
  geändert. v2 brauchte 5 statt 6 bis 8 Schritte und etwa die Hälfte der Prompt-Tokens.

### Echtes Ticket (je ein Lauf)

| | v1 1.19.0 | v2 2.0.25 |
|---|---|---|
| Wandzeit | 596 s | 1.040 s |
| Wandzeit des ursprünglichen Produktivlaufs (1.19.0) | 605 s | |
| Harness-Overhead | 1,1 s | 3,1 s |
| Schritte | 55 | 95 |
| **Sekunden pro Schritt** | **10,8** | **10,9** |
| Output-Tokens pro Schritt | 556 | 560 |
| Tool-Aufrufe (Fehler) | 72 (0) | 116 (2) |
| Prompt-Tokens inkl. Cache | 2,72 M | 6,63 M |
| ungecachter Input | 50k | 65k |
| größter Kontext eines Schritts | 76k | 116k |
| Bericht am Ende | ja | ja |

Die Wiederholung auf 1.19 lag innerhalb von 2 % des ursprünglichen Produktivlaufs (596 s
gegen 605 s); auf 1.19 reproduziert sich die Zeit für dieses Ticket also, die 1.040 s von v2
liegen deutlich außerhalb. Verglichen wird hier nur die Wandzeit des Produktivlaufs; er lief
in einem regulären Worktree, in dem auch 1.19 keine zusätzliche AGENTS.md lädt.

Pro Schritt sind beide Versionen gleich schnell, und innerhalb einer langen Session nutzen
beide den Prompt-Cache gut. v2 war langsamer, weil das Modell unter v2 mehr getan hat, nicht
weil der Harness langsamer ist. Die Mehrzeit verteilt sich breit, ohne einzelnen Brennpunkt.
Jeder Schritt zählt nach seinem ersten Tool-Aufruf; Shell-Befehle, die Tests, Lint,
Typprüfung, Build oder Codegenerierung ausführen, zählen als "Tests, Lint, Build":

| Schritt-Art (erster Tool-Aufruf des Schritts) | v1 Schritte / Sekunden | v2 Schritte / Sekunden |
|---|---|---|
| edit / write | 17 / 153 | 32 / 357 |
| sonstige Shell | 10 / 180 | 27 / 307 |
| Tests, Lint, Build | 15 / 87 | 14 / 127 |
| read | 6 / 100 | 11 / 114 |
| Mutationsproben | 2 / 14 | 5 / 62 |
| `npm ci` | 2 / 20 | 5 / 33 |
| sonstige (Todo-Liste, Abschlussbericht ohne Tool) | 3 / 41 | 1 / 37 |
| **gesamt** | **55 / 595** | **95 / 1.037** |

Was v2 zusätzlich tat: mehr Tests, zwei fehlgeschlagene Edits (der Suchtext passte nicht),
wiederholtes `npm ci`, nachdem parallele Installationen einen unvollständigen Baum
hinterlassen hatten, zweimal die `--help`-Ausgabe eines Tools gelesen, ein Produktions-Build
und ein Wegwerf-End-to-End-Check gegen das echte Downstream-Modul. Die Ersparnis aus dem
Mikro-Benchmark von etwa 15 s pro Session macht bei einem 600-s-Ticket etwa 2,5 % aus und
geht in dieser Mehrarbeit unter.

## 5. Ergebnisqualität auf dem echten Ticket

- Beide Versionen änderten dieselben 9 Dateien. Backend 270 von 270 Tests grün; Frontend
  30 von 30 (v1) und 33 von 33 (v2).
- Beide meldeten die drei geforderten Mutationsproben als gekillt. Unsere eigenen Proben auf
  das Überspringen in den Zeilen des Deployment-Dienstes fanden **in beiden Versionen 2
  überlebende Mutanten**, genau die Lücke des ursprünglichen Produktivlaufs. Keine Version hat
  die Tests von sich aus auf diesen symmetrischen Fall erweitert; beide testeten, was der
  Brief wörtlich nannte.
- v1 entfernte eine Bedingung, die die Lesbarkeit nur für konfigurierte Dienste prüft. Nicht
  konfigurierte Dienste lösen jetzt einen zusätzlichen Zugangsdaten-Abruf und einen
  Downstream-Aufruf aus, und die Übersicht meldet für sie einen Fehler statt `null`. Die
  Oberfläche ist nicht betroffen, die Änderung ist ungetestet und nicht rein additiv. Der
  ursprüngliche Produktivlauf auf derselben Version tat das nicht: Streuung zwischen Läufen,
  kein Merkmal der Version.
- v2 hielt den Antwortvertrag ein, ergänzte einen Test für einen weiteren Dienst und eine
  zusätzliche Mutationsprobe und führte Build und einen End-to-End-Check aus.

**Lesart:** v2 war hier gründlicher und bezahlte dafür mit der 1,75-fachen Zeit, den 2,4-fachen
Prompt-Tokens und damit der 1,75-fachen Belegung eines Server-Slots. Bei einem Lauf pro
Version und sichtbarer Streuung schon innerhalb von 1.19 lässt sich "v2 ist gründlicher"
nicht von Zufall trennen.

## 6. Grenzen

- **Ein Lauf pro Version auf dem echten Ticket**, und nicht im Wechsel: v2 lief zuerst, dann
  v1 (ein Schleifenfehler im Benchmark-Skript ließ beim ersten Aufruf nur v2 laufen; die Daten
  wurden umbenannt, nichts ging verloren). Mit dem Produktivlauf hat 1.19 zwei Zeitmessungen
  für dieses Ticket, v2 nur eine.
- Die Mikro-Szenarien wiederholen identische Prompts, das begünstigt den Prompt-Cache. Ein
  ausgelasteter Server oder wechselnde Briefs wurden nicht gemessen.
- Die Ursache der Cache-Fehlgriffe von v1 beim ersten Prompt ist eine Hypothese (ein pro Lauf
  variabler Wert früh im System-Prompt), nicht per Request-Mitschnitt belegt.
- Reasoning-Tokens melden beide Versionen als 0, obwohl das Modell denkt (wie im Pilot).
  Output-Tokens trennen Reasoning daher nicht.
- Ein Build von 2.x (2.0.25). Der Entwicklungszweig bewegt sich schnell; 1.19 hat seither
  Patch-Releases bekommen, die nicht neu gemessen wurden.
- Beide Arme liefen in Klonen außerhalb des Home-Verzeichnisses. In der produktiven
  Anordnung (Checkouts unterhalb des Workspace-Ordners) hätte v2 zusätzlich die
  Workspace-AGENTS.md geladen.

## 7. Fazit

1. **opencode 2 ist kein direkter Ersatz für eine unbeaufsichtigte Lane.** Die Standardrechte
   erlauben alles, `run` ohne `--standalone` ignoriert Rechte-Overrides, die Suche nach
   AGENTS.md reicht über das Repository hinaus, das Tool `question` steht in
   unbeaufsichtigten Läufen zur Verfügung, und Shell-Befehle erreichen über ihre Argumente
   Pfade außerhalb des Projekts, auch mit expliziter `ask`-Regel. Jede dieser Änderungen
   verändert die Lane ohne sichtbaren Fehler.
2. **Der stille Abbruch ist behoben**, aber der Exit-Code bleibt 0. Ein Wrapper, der einen
   Lauf ohne abschließenden Bericht als fehlgeschlagen wertet, ist in beiden Versionen nötig.
3. **Schneller auf Spielaufgaben, langsamer bei echter Arbeit.** Der Vorteil auf Spielaufgaben
   ist eine feste Prompt-Cache-Ersparnis pro Session. Auf einem echten Ticket dominiert die
   Zahl der Schritte, und davon brauchte das Modell unter v2 mehr.
4. **Der wahrscheinlichere Qualitätshebel ist der Brief, nicht der Harness.** Beide Versionen
   ließen denselben symmetrischen Testfall aus. Symmetrische Zweige im Brief ausdrücklich zu
   nennen ist der nächste Test; dieser Vergleich hat es nicht ausprobiert.

Wir bleiben bei 1.19 und wiederholen den Vergleich auf echten Tickets mit mehreren Läufen pro
Version, sobald 2.x das reguläre npm-Release ist: mit `--standalone`, den Rechte-Regeln oben,
Checkouts außerhalb des Home-Verzeichnisses und der Berichtsprüfung des Lauf-Wrappers. Da
die Rechte-Regeln in v2 keine Shell-Argumente abdecken, bräuchte eine Lane auf v2 einen
Container oder eine VM als eigentliche Grenze.

*Nach der Veröffentlichung ergänzt (Oktober 2026): die Zeile zu Pfad-Argumenten in der Shell
samt Folge sowie der Dokumentationsstand zu den Standardrechten und zur AGENTS.md-Suche. Ein
Feature-Request für eine einstellbare Suchgrenze liegt upstream als
[anomalyco/opencode#55999](https://github.com/anomalyco/opencode/issues/55999).*
