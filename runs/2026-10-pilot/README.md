[Alle Ausgaben der Lane-Arena](../../README.md) · [Präsentation](https://lannguyensi.github.io/lane-arena/runs/2026-10-pilot/) · [PDF](presentation.pdf)

# Lokales Modell gegen Claude und GPT: ein Pilot mit echten Tickets

Ein lokal betriebenes Open-Weight-Modell tritt gegen fünf Cloud-Modelle an: Claude Haiku
5.5, Sonnet 5.5 und Opus 5.5 sowie GPT-6.1-Sol und GPT-6-Luna. Getestet wurde auf zwei
echten, offenen Tickets, einer mittleren und einer schweren Aufgabe. Jeder Teilnehmer
arbeitet in einem eigenen, isolierten Repository-Klon. Jede Lösung prüft ein frischer
Opus-Reviewer, der nicht erfährt, von wem sie stammt. Zusätzlich laufen versteckte Tests.

## 1. Ergebnis auf einen Blick

**Spielregel:** Bestanden heißt, der blinde Review liefert `accept` oder
`accept_with_notes`. Jeder Teilnehmer hat höchstens 3 Runden.

| Aufgabe | Teilnehmer | Bestanden in Runde | Implementierungszeit (Summe) | Implementierungskosten | Review-Kosten |
|---|---|---|---|---|---|
| Mittel | Lokales Modell (Qwen3.8-Flash-Next) | 1 | 353 s | ~0 (lokal) | $0.25 |
| Mittel | Claude Haiku 5.5 | 1 | 57 s | $0.01 | $0.26 |
| Mittel | Claude Sonnet 5.5 | 1 | 32 s | $0.07 | $0.22 |
| Mittel | Claude Opus 5.5 | 1 | 83 s | $0.31 | $0.25 |
| Mittel | GPT-6.1-Sol | 1 | 75 s | $0.085* | $0.35 |
| Mittel | GPT-6-Luna | 1 | 33 s | $0.007* | $0.35 |
| Schwer | Lokales Modell (Qwen3.8-Flash-Next) | 1 | 491 s | ~0 (lokal) | $0.64 |
| Schwer | Claude Haiku 5.5 | 2 | 369 s | $0.14 | $1.24 |
| Schwer | Claude Sonnet 5.5 | 3 | 167 s | $0.29 | $1.82 |
| Schwer | Claude Opus 5.5 | 1 | 126 s | $0.39 | $0.55 |
| Schwer | GPT-6.1-Sol | 2 | 163 s | $0.28* | $1.08 |
| Schwer | GPT-6-Luna | **nicht bestanden** (3 Runden) | 308 s | $0.05* | $2.16 |

\* Die GPT-Modelle liefen über die Codex CLI mit einem ChatGPT-Abo. Die Werte sind
hypothetische API-Listenpreise, aus den protokollierten Token-Zahlen berechnet (siehe
Kapitel 7).

Verdikte je Runde (Findings nach Schweregrad):

| Aufgabe / Teilnehmer | Runde 1 | Runde 2 | Runde 3 |
|---|---|---|---|
| Mittel / Lokal | accept_with_notes (2 low) | | |
| Mittel / Haiku | accept_with_notes (2 low) | | |
| Mittel / Sonnet | accept_with_notes (5 low) | | |
| Mittel / Opus | accept_with_notes (3 low) | | |
| Mittel / Sol | accept_with_notes (3 low) | | |
| Mittel / Luna | accept_with_notes (5 low) | | |
| Schwer / Lokal | accept_with_notes (1 medium, 3 low) | | |
| Schwer / Haiku | fix_required (2 medium, 3 low) | accept_with_notes (3 low) | |
| Schwer / Sonnet | fix_required (2 medium, 4 low) | fix_required (1 high, 3 medium, 2 low) | accept_with_notes (1 medium, 5 low) |
| Schwer / Opus | accept_with_notes (3 medium, 1 low) | | |
| Schwer / Sol | fix_required (2 medium, 3 low) | accept_with_notes (1 medium, 3 low) | |
| Schwer / Luna | fix_required (2 medium, 3 low) | fix_required (1 medium, 4 low) | fix_required (1 medium, 3 low) |

Alle versteckten Tests waren in **jeder** Runde für **jeden** Teilnehmer grün.

## 2. Setup

### 2.1 Teilnehmer und Aufrufe

| Teilnehmer | Aufruf |
|---|---|
| Lokales Modell | `opencode run --format json` gegen einen lokalen llama-server |
| Claude Haiku, Sonnet, Opus 5.5 | `claude --bare -p` (Claude Code, headless) |
| GPT-6.1-Sol, GPT-6-Luna | `codex exec` (Codex CLI 0.162.1, headless) |

- **Claude:** `--bare --permission-mode bypassPermissions --strict-mcp-config` mit leerer
  MCP-Konfiguration, ohne Subagenten, Web-Fetch und Web-Suche, ohne gespeicherte Session.
  Abrechnung per API-Key. Ein Testlauf vorab bestätigte: keine MCP-Server, kein Memory.
- **Codex:** `--ignore-user-config --ignore-rules --ephemeral
  --dangerously-bypass-approvals-and-sandbox`. Die Nutzer-Konfiguration (MCP-Server,
  Modell- und Effort-Overrides) bleibt außen vor. Ein Testlauf vorab bestätigte: keine
  Instruktionsdateien, kein Memory, keine MCP-Tools.
- **Lokales Modell:** opencode ohne MCP-Server, Hooks und Subagenten. Zugriffe außerhalb
  des Projektverzeichnisses sind erlaubt, gleichwertig zum Permission-Bypass bei Claude und
  Codex.
- **Reviewer:** Claude Opus 5.5 headless, mit einem festen Reviewer-Prompt aus dem
  Produktionsbetrieb, ohne Schreibrechte. Methode "rigorous" für die mittlere Aufgabe,
  "adversarial" für die schwere (Security-Bezug). Jede Runde bekam einen frischen Reviewer
  ohne Vorwissen.

### 2.2 Das lokale Modell im Detail

| Bereich | Stand |
|---|---|
| Hardware | Mac Studio, Apple M5 Max, 18 CPU-Kerne, 40 GPU-Kerne, 128 GB Unified Memory. Dient nur als Inferenz-Server. |
| Modell | Qwen3.8-Flash-Next: MoE mit 125B Parametern, davon 6B aktiv, als 4-Bit-GGUF (UD-IQ4_XS, 93,7 GB). |
| Spekulatives Decoding | MTP-Kopf (Q8_0, 4,1 GB), bis zu 3 Draft-Token |
| Server | llama.cpp mit Metal, 262k Kontext, 2 Slots, Flash Attention. |
| Sampling | temp 1.0, top_p 0.95, top_k 20, min_p 0.0 |
| Thinking / Effort | Thinking an, Effort per Template-Default `xhigh` (siehe Kapitel 6) |
| Agent | opencode, Kontextlimit 235k, Output-Limit 16k Token |

**Durchsatz, live gemessen** (Thinking an, MTP an, ohne Prompt-Cache, je 2 Läufe):

| Messung | Prompt-Token | Prefill | Generierung | MTP-Akzeptanz |
|---|---|---|---|---|
| kurzer Prompt, 400 Token Ausgabe | 66 | (nicht aussagekräftig) | 57,4 / 53,6 tok/s | 47 % / 41 % |
| 16k-Prompt (Quellcode) | 16 259 | 826 / 827 tok/s (~20 s) | 59,3 / 54,7 tok/s | 54 % / 48 % |

Frühere Messungen ohne MTP und ohne Thinking: Generierung etwa 50 tok/s, Prefill 894
(16k), 862 (64k) und 828 tok/s (128k).

**Was das für die Laufzeiten heißt:** Ein Agent-Lauf ist eine Kette von Tool-Aufrufen mit
wachsendem Kontext. Das lokale Modell brauchte 30 Schritte (mittel) bzw. 43 Schritte
(schwer). Jeder Schritt kostet Prefill plus Generierung inklusive Thinking. Das erklärt
die 6 bis 8 Minuten pro Lauf.

### 2.3 Ablauf

Eine Runde besteht aus Implementierung, Sicherung des Diffs, Verifikation mit versteckten
Tests und blindem Review. Alle Läufe liefen strikt nacheinander, nie zwei gleichzeitig.
In Fix-Runden bekommt derselbe Teilnehmer den unveränderten Brief plus die Findings aus
dem vorherigen Review, aber nur die mit Schweregrad critical, high oder medium.

## 3. Die Aufgaben und warum diese

Beide stammen aus einem echten Ticket-Pool offener Aufgaben.

### Mittel: rollenabhängige Bedienelemente (Frontend, React/Next.js)

- **Inhalt:** In einer Log-Analyse-Anwendung sehen Nutzer mit den Rollen MEMBER und VIEWER
  die Buttons Overwrite, Rename und Delete auf geteilten oder Standard-Ansichten, obwohl
  der Server diese Aktionen mit 403 ablehnt. Die Buttons sollen ausgeblendet oder mit
  Begründung deaktiviert werden.
- **Warum:** klare, prüfbare Akzeptanzkriterien (Komponententest pro Rolle und Zustand,
  Server bleibt unverändert), überschaubarer Umfang, eine typische Aufgabe für einen
  Implementierer mittlerer Stufe.

### Schwer: reservierte Benutzernamen (Backend, Express/Prisma, Security)

- **Inhalt:** Die Benutzernamen zweier Service-Accounts sind an mehreren Stellen einzeln
  als Literale hinterlegt und bei der Registrierung nicht gesperrt. Gefordert sind eine
  gemeinsame Konstante und eine Sperre bei `POST /api/auth/register`.
- **Warum:** Die Konstante zusammenzuziehen ist leicht, schwer sind die Kanten:
  - Der Benutzername wird vor dem Speichern kleingeschrieben. Die Prüfung muss danach
    greifen, sonst kommt `GATEWAY` durch.
  - Im Invite-Modus darf kein Einladungscode verbraucht werden.
  - Beim Vereinheitlichen der Filter ändert sich Verhalten, weil einige Stellen bisher nur
    einen der beiden Namen ausblendeten.
  - Im Code gab es bereits eine nicht exportierte Konstante, die der Brief nicht nannte.
  - Ein bestehender Datenbank-Test erwartet bei einem schon vergebenen Namen `409`. Er
    läuft lokal ohne Datenbank nicht mit.
- **Verworfen:** eine Multi-Arch-Docker-Aufgabe (misst eher das Build-Tooling als das
  Denken) und ein flaky Test (nicht deterministisch).

## 4. Isolation

| Maßnahme | Umsetzung | Grenzen |
|---|---|---|
| Eigener Klon pro Teilnehmer | `git clone --shared` auf denselben fixen Basis-Commit, eigene Abhängigkeiten pro Klon | Die Objektdatenbank wird lesend geteilt, geschrieben wird nur im Klon. |
| Kein Push möglich | Remote in jedem Klon entfernt, der Brief verbietet Commit, Push und neue Remotes | Keine Betriebssystem-Sandbox. Ein Teilnehmer hätte absichtlich einen Remote anlegen können (nicht beobachtet). |
| Kein geteilter Kontext | Keine MCP-Server, keine Hooks, kein Memory bei allen Teilnehmern. Keine Instruktionsdateien, außer einer globalen Regel zu Chat-Template-Tokens beim lokalen Modell. Die Repos selbst haben keine Agent-Instruktionsdateien. | |
| Ausbrüche aus dem Klon | Permission-Bypass für alle | Beobachtet: ein Teilnehmer schrieb einmal eine Datei nach `/tmp`, einer zog per `npx` einmal ein Paket aus dem Netz. Beides ohne Einfluss aufs Ergebnis. Die Isolation ist "eigener Klon ohne Remote", keine Sandbox. |
| Blinder Review | Klon und Review-Auftrag tragen nur ein Zufalls-Label | Teilblind: Der Stil kann den Teilnehmer verraten. Der Reviewer verändert den Klon nachweislich nicht (Diff-Vergleich nach jedem Review). |
| Versteckte Tests | werden erst nach der Diff-Sicherung in den Klon kopiert, laufen dort und werden danach wieder gelöscht | |

## 5. Briefs, Tests und Protokolle

- **Ein Brief pro Aufgabe**, für alle Teilnehmer identisch: Ziel, Kontext, Anforderungen,
  Grenzen und Verifikationsbefehle. Übergeben als Datei.
- **Versteckte Tests:**
  - Mittel: 54 Fälle (Rolle × Zustand × Button). "Ausgeblendet" und "deaktiviert mit
    Begründung" sind beide erlaubt.
  - Schwer: 8 Pflichtfälle, 2 Kontrollen, 4 Soft-Fälle gegen Übersperrung ähnlicher Namen,
    dazu ein statischer Check, dass die Literale nur noch an einer Stelle stehen.
- **Eingefroren** per SHA-256-Hash, bevor der erste Teilnehmer lief.
- **Kontrolle am Ausgangsstand:** Die versteckten Tests waren dort genau für die gemeinten
  Fälle rot (mittel: 18 von 54; schwer: alle 8 Pflichtfälle), die Kontrollen grün. Die
  Tests können also anschlagen.
- **Was ein Teilnehmer bei `fix_required` bekommt:** einen frischen Lauf ohne Erinnerung an
  die vorige Runde, im selben Klon mit seinen eigenen Änderungen. Der Prompt besteht aus dem
  unveränderten Brief und einem Abschnitt mit den Review-Findings: der Hinweis, dass die
  eigenen Änderungen noch im Arbeitsverzeichnis liegen, die Anweisung, jedes Finding mit
  Schweregrad critical, high oder medium zu beheben oder im Abschlussbericht zu begründen,
  warum nicht, und die Verifikationsbefehle erneut auszuführen. Pro Finding stehen dort
  Schweregrad, Titel, Datei und Zeile, die Beschreibung des Reviewers und sein
  Fix-Vorschlag. Nicht übergeben werden Lows, das Verdikt, der übrige Review-Text und die
  Ergebnisse der versteckten Tests.
- **Protokolliert** pro Runde und Teilnehmer: das volle Transkript, der Diff, die
  Test-Logs, der Review und die Zeitstempel.

## 6. Reasoning-Effort

Methode: Die Aufrufe wurden gegen einen lokalen Proxy wiederholt, der den Request-Body
mitschneidet. Für das lokale Modell kamen Direkt-Requests an den Server und ein Blick ins
Chat-Template dazu.

| Rolle | Tatsächlicher Effort |
|---|---|
| Claude Haiku, Sonnet, Opus (Implementierung) | `medium`, adaptives Thinking |
| Claude Opus (Review) | `medium` |
| Lokales Modell | `xhigh` (Template-Default, Thinking an) |
| GPT-6.1-Sol | Modell-Default `low` |
| GPT-6-Luna | Modell-Default `medium` |

- Der headless Claude-Aufruf ignoriert die persönlichen Einstellungen (dort stand `xhigh`)
  und nutzt den Default `medium`.
- opencode meldet 0 Reasoning-Tokens, obwohl der Server nachweislich denkt. Die
  Token-Zahlen des lokalen Modells sind eine Untergrenze.
- Die GPT-Efforts sind nicht per Mitschnitt belegt, die Reasoning-Tokens passen aber zu
  den Defaults (Sol 48 bis 148 pro Lauf, Luna 206 bis 2 487).
- **Folge:** Der Effort war ungleich verteilt: lokal `xhigh`, Claude und Luna `medium`,
  Sol `low`. Der Reviewer lief auf `medium`.

## 7. Zeit und Kosten

- **Implementierungszeit:** Das lokale Modell brauchte 353 s (mittel) und 491 s (schwer).
  Die Cloud-Modelle brauchten in Runde 1 zwischen 32 und 126 s. In Runde 1 ist das lokale
  Modell damit 3,9- bis 11-mal langsamer. Bis zur Abnahme der schweren Aufgabe schrumpft der
  Abstand auf 1,3- bis 3,9-mal, weil die anderen Teilnehmer Fix-Runden brauchten.
- **Implementierungskosten:** lokal ~0 (Strom nicht gemessen). Claude $0.01 bis $0.39 pro
  Aufgabe, Haiku am billigsten, Opus am teuersten.
- **GPT zum API-Listenpreis (hypothetisch):** GPT-6.1-Sol $2.00 Input, $0.10 gecachter
  Input, $10.00 Output je 1M Token; GPT-6-Luna $0.10 / $0.01 / $0.50. Ergibt: Sol $0.085
  (mittel) und $0.28 (schwer, 2 Runden), Luna $0.007 (mittel) und $0.05 (schwer,
  3 Runden). Annahmen: Der Input enthält den gecachten Anteil, Reasoning zählt zum Output.
  Ein möglicher Aufschlag für sehr lange Prompts ist nicht eingerechnet.
- **Der Review dominiert die Kosten:** Ein Opus-Review kostet $0.22 bis $0.35 (mittel) und
  $0.53 bis $0.90 (schwer). Jede zusätzliche Runde kostet einen weiteren Review.
- **API-Kosten insgesamt:** $10.37, davon $1.22 Implementierung (Claude) und $9.15
  Reviews. Mit GPT zum Listenpreis wären es $10.80.

## 8. Beobachtungen

- **Die versteckten Tests haben nicht getrennt.** Alle Teilnehmer bestanden sie in allen
  Runden. Die Unterschiede zeigten sich im Review (Doku-Konsistenz, Testqualität,
  Verhaltensänderungen, Einhaltung der Vorgaben) und in einem nachgemessenen Datenbank-Test.
- **Nur das lokale Modell hielt einen bestehenden Datenbank-Test grün.** Ein bestehender, nur mit
  Datenbank laufender Test erwartet für einen schon vergebenen Service-Account-Namen `409`.
  Lokal lief er nicht mit. Nachgemessen gegen eine echte Datenbank hielt ihn nur die
  Lösung des lokalen Modells grün; es hatte die Reihenfolge der Prüfungen bewusst so
  gewählt. Bei Opus, Haiku, GPT-6.1-Sol und GPT-6-Luna schlagen je zwei Fälle fehl, weil die
  Sperre vor der Eindeutigkeitsprüfung greift. Eine CI mit Datenbank hätte drei der
  bestandenen Lösungen rot gemeldet. Die Reviews dieser Lösungen haben das nicht bemerkt.
- **Sonnet:** Nur der Reviewer von Sonnets zweiter Runde erkannte den Bruch und vergab ein
  High. Dessen Fix-Vorschlag nannte als eine Möglichkeit, die Testerwartung anzupassen, mit
  vorheriger Freigabe. In Runde 3 schrieb Sonnet die Erwartung von `409` auf `400` um, ohne
  diese Freigabe; der Brief erlaubte nur Ergänzungen an bestehenden Tests. Der Test läuft
  damit grün, der Reviewer wertete die Änderung als Medium, bei insgesamt
  `accept_with_notes`.
- **Andere geänderte Testzeilen** waren Umbauten von Hilfsfunktionen (Mocks, ein
  zusätzlicher Parameter), keine abgeschwächten Prüfungen.
- **Die Review-Runden der schweren Aufgabe drehten sich um Doku.** Die Mediums betrafen fast
  nur Doku-Pflege: Zeilenverweise in der Wissensbasis des Repos, fehlende oder
  widersprüchliche Changelog-Einträge, Doku-Aussagen, die nicht mehr zum Code passen. Die
  Sicherheitsanforderungen des Briefs erfüllten alle (versteckte Tests grün). Der Brief
  erwähnte die Doku-Konvention des Repos nicht.
  Wer sie von selbst fand und pflegte, kam schneller durch. GPT-6-Luna scheiterte dreimal
  genau daran.
- **Schnell ist nicht gleich fertig.** GPT-6-Luna war auf der mittleren Aufgabe mit 33 s
  knapp hinter Sonnet (32 s) unter den schnellsten Teilnehmern und scheiterte auf der
  schweren. Das lokale Modell war überall
  am langsamsten und bestand beide Aufgaben in Runde 1.
- **Haiku:** auf der mittleren Aufgabe gleichauf, auf der schweren in Runde 2 bestanden, bei
  etwa einem Dreißigstel (mittel) bzw. einem Drittel (schwer, zwei Runden zusammen) der
  Implementierungskosten von Opus.

## 9. Fazit

**Was die Daten zeigen:**

1. Die mittlere Aufgabe bestanden alle sechs Teilnehmer in Runde 1. Auf der schweren
   Aufgabe schafften das nur das lokale Modell und Opus. Haiku und GPT-6.1-Sol brauchten
   zwei Runden, Sonnet drei, GPT-6-Luna schaffte es in drei Runden nicht.
2. Das lokale Modell ist gegenüber Runde 1 der anderen 3,9- bis 11-mal langsamer (bis zur Abnahme der schweren
   Aufgabe 1,3- bis 3,9-mal) und verursacht praktisch keine API-Kosten. Die Kosten einer Aufgabe bestimmt vor allem der Review, also die Zahl der
   Runden.
3. Nur die Lösung des lokalen Modells hält den bestehenden Datenbank-Test grün, ohne ihn zu
   ändern.
4. Das lokale Modell lief mit dem höchsten Reasoning-Effort. Ein Teil seines Abschneidens
   kann daran liegen.

**Was die Daten nicht zeigen:**

- Zwei Aufgaben sind ein Pilot, keine Statistik.
- Jedes Verdikt stammt aus einem einzigen Review. Das Rauschen zwischen zwei unabhängigen
  Reviews ist ungemessen; Unterschiede wie "1 Medium gegen 2 Mediums" können darin liegen.
  Der bestehende Datenbank-Test zeigt, wie groß es sein kann: Nur ein einziger Review meldete
  den Bruch, drei Reviews ließen ihn durch.
- Die versteckten Tests waren zu leicht, um zu trennen.
- Der Reviewer lief eine Stufe unter dem Produktionsbetrieb.
- Der Review ist nur teilblind.
- Die lokale Verifikation lief ohne Datenbank-Tests; der Datenbank-Befund stammt aus einer
  nachträglichen Messung.
- Wie gut das lokale Modell Review-Feedback umsetzt, zeigt der Pilot nicht, weil es beide
  Aufgaben in Runde 1 bestand.

**Einordnung:** Für mittlere Aufgaben ist ein lokales Modell auf guter Hardware ein
ernstzunehmender Implementierer: In diesem Pilot war es langsamer, aber nicht schlechter. Für sicherheitskritische
Aufgaben reicht ein einzelnes gutes Ergebnis nicht, um die Cloud-Modelle zu ersetzen. Ein
nächster Lauf sollte mehr Aufgaben umfassen, den Effort für alle gleich setzen, zwei Reviews
pro Lösung fahren und versteckte Tests verwenden, die auch die weichen Kanten prüfen.

Beide Aufgaben wurden anschließend auf Basis der Pilot-Lösungen regulär ausgeliefert, nach
einem weiteren Review und Nacharbeit, und laufen in Produktion.
