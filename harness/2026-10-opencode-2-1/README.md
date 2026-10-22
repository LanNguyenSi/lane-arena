**English** | [Deutsch](README.de.md)

[All Lane Arena reports](../../README.md) · [First comparison (1.19.0 vs. 2.0.25)](../2026-10-opencode-2/README.md)

# opencode 1.19 vs. opencode 2.1: the second round

One week after the [first comparison](../2026-10-opencode-2/README.md) we measured again.
opencode 2 had moved from 2.0.25 to 2.1.3, with more than 1,800 commits in between (the build we
measured is 2.1.2); the lane now runs 1.19.3. The questions: has 2.x fixed the behaviour that blocked a switch, and does
the picture on real tickets change when there are two of them?

Like the first round, this is not an arena edition: no competing participants, no blind
review of the solutions, no hidden tests. It has three parts: a check of the release state,
a micro benchmark on toy tasks, and the replay of two real tickets.

## 1. Results at a glance

| Question | Answer |
|---|---|
| Is opencode 2 a drop-in replacement now? | **Still no.** The default permissions still allow everything, and shell commands still read paths outside the project through their arguments without asking, even with an explicit `ask` rule. |
| Is 2.x the regular release? | **No.** npm `latest` is 1.19.4; 2.x is still only published as development snapshots on npm and as git tags without release assets (up to v2.1.3). We used the Homebrew build 2.1.2. |
| Silent abort after a denied permission? | Unchanged in both directions: 1.19.3 ended without a final report after every denial (3 of 3 micro runs); 2.1.2 continued and reported every time (2 of 2 micro runs, 1 real-ticket run). |
| Faster? | On four of five toy tasks 1.8 to 2.9 times faster; slower on one, because it continued after a denial. On the real tickets: about the same on ticket A (690 s vs. 723 s); on ticket B **about 1.5 times slower** on average over two runs each (1,620 s vs. 1,110 s), with v2 steady and 1.19 varying widely. |
| Better results? | Slightly, at most. On ticket B 2.1.2 closed a known test gap on its own in one of two runs; 1.19.3 in neither. On ticket A both versions left one of two symmetric cases untested, each a different one. Few runs: a direction, not a finding. |
| Decision | Stay on 1.19. A switch needs the permission rules from the first round, a test inside the lane's OS sandbox, and an answer to the shell path-argument gap. |

## 2. Setup

| Area | Details |
|---|---|
| Model and server | Unchanged: Qwen3.8-Flash-Next on a Mac Studio (M5 Max, 128 GB), llama.cpp, 2 slots, 262k context, both slots idle at the start of every run. Details in the [pilot report](../../runs/2026-10-pilot/README.md), section 2.2. |
| Effort | Variant `xhigh` in both versions. |
| Arm v1 | opencode **1.19.3**, the version the lane runs in production (`opencode run --format json`). |
| Arm v2 | opencode **2.1.2** from the Homebrew bottle (`run --standalone --format json`), installed in isolation with its own config, data, state and cache directories. |
| Permissions | v1: its default (access outside the project: `ask`). v2: the two rules from the first round (`external_directory` ask, `question` deny), this time written into v2's own config file instead of an environment variable. The effective rules were read back with `opencode debug agents`. |
| Working directories | Fresh clones outside the user's home directory for every run, so v2's AGENTS.md discovery could not reach a workspace file. In the clones the default branch was pinned to the base commit and pushing was disabled. |
| Launch | opencode was started directly, not through the lane's run wrapper, because the wrapper runs opencode inside an OS sandbox in which our isolated v2 install does not start (section 3). |
| Counting | Tokens, steps and tool calls from each session's full export. |
| Quality check | After every run: the full test suites of the solution, plus mutation probes on exactly the test gaps that the review of the original production run had found. |

### Micro benchmark

Five scenarios, one run per version each, alternating v1 and v2 (10 runs). Each run starts in
a fresh copy of a tiny git repository with a sibling folder `outside/` next to it. New
compared to the first round: `shellarg`, which reads an outside path as a shell argument.

| Scenario | Prompt (abridged) | What it tests |
|---|---|---|
| `ok` | run `cat sub/a.txt` in the shell | baseline: one allowed tool call |
| `shell` | run `cd sub && cd ../.. && cat outside/note.txt` | shell breakout by changing directory |
| `shellarg` | run `cat ../outside/note.txt` | shell breakout through an argument |
| `read` | read `../outside/note.txt` with the read tool | file-tool breakout |
| `edit` | add a function and a test, run `node --test`, change nothing else | a small real edit |

### Real tickets

Both tickets are **replays**: tickets the lane had already solved in production on 1.19, run
again with the **verbatim original brief** on the same base commit, one fresh clone per run.

| Ticket | Content | Production run on 1.19 | Known gap from the production review |
|---|---|---|---|
| **A: dashboard credentials** (same as in the first round) | Backend Hono/Prisma, frontend Next.js, docs: a dashboard summary marks a connected service whose stored credential can no longer be decrypted as "unreadable". New tests, doc updates, one mutation check per new branch. | 605 s (1.19.0) | the skip of downstream calls for unreadable services was tested for one service but not for the other (2 surviving mutants) |
| **B: helper consolidation** (new) | A TypeScript CLI with about 4,650 tests: three helpers implemented twice (shell quoting, a parser for the hooks block of a settings file, a test fixture) are merged into one each, with a parity test that feeds every input shape through both callers, four named mutation checks, a changelog entry and re-pointed line citations in the project's knowledge docs. | 1,575 s (1.19.3) | the event name in one of the parser's error messages was not pinned by any test (1 surviving mutant) |

Order of the arms: ticket A v2 first, then v1; ticket B two rounds, v1 then v2 and then v2
then v1.

## 3. Behaviour: what changed since 2.0.25

| Topic | 1.19.3 | 2.1.2 | Compared to the first round |
|---|---|---|---|
| Default permissions of the `build` agent | access outside the project: `ask` | base rule `*` allow; new: reading `.env*` files asks, the browser tool is denied | unchanged: without our explicit rule there is no boundary |
| Denied permission in non-interactive mode | ends without a final report (3 of 3 micro runs) | the model is told and reports (2 of 2) | unchanged |
| Exit code after a denial | 0 | 0 | unchanged |
| Shell, path as argument (`cat ../outside/note.txt`) | denied | **runs without a permission request, file content printed** | unchanged, now measured in the micro benchmark |
| Shell, after a denied `cd ../..` | ends | continues and lists `../outside` with `ls -la ../outside`, again without a request | new observation |
| AGENTS.md discovery | stops at the git root | by the source of v2.1.3 still walks up to the home directory | unchanged in the source; not exercised here, all clones lay outside the home directory |
| Inside the lane's OS sandbox (macOS `sandbox-exec`, write access essentially only to the worktree and opencode's default data directories) | runs | our isolated install, which uses its own data directories, **does not start**: exit 1, write to its own log file denied | new; a 2.x install in the default directories was not tested |
| Release channel | npm `latest` 1.19.4 | npm dev snapshots, git tags up to v2.1.3 without assets, Homebrew 2.1.2 | still not the regular release |

The changelog between 2.0.25 and 2.1.3 contains a "v2.1 minor breaking changes" commit
(session, compaction and protocol types) and a fix that tolerates denied file system access
during startup in sandboxes. The shell permission code changed by eight lines (parser
selection); the file with the AGENTS.md discovery changed, but the rule that ends the walk at
the home directory did not.

## 4. Speed

### Micro benchmark (one run each)

| Scenario | v1 wall time | v2 wall time | v1 uncached prompt | v2 uncached prompt | Report v1 / v2 |
|---|---|---|---|---|---|
| `ok` | 16.5 s | 5.6 s | 11.9k | 2.1k | yes · yes |
| `shell` | 17.0 s | 26.8 s | 11.9k | 8.3k | **no** · yes |
| `shellarg` | 18.5 s | 8.7 s | 11.9k | 2.1k | **no** · yes (file read) |
| `read` | 15.0 s | 8.3 s | 11.9k | 2.1k | **no** · yes |
| `edit` | 39.0 s | 17.5 s | 13.0k | 2.5k | yes · yes |

The pattern of the first round holds: v1 sends about 11.9k prompt tokens per session that
miss the server's prompt cache; v2 about 2.1k (2.0.25: about 0.5k). v2 is slower only in
`shell`, because it went on after the denial (three steps instead of one). `edit`: tests
green in both, v1 with 7 tool calls in 8 steps, v2 with 5 in 5.

### Real tickets

Ticket A, one run per version:

| | v1 | v2 |
|---|---|---|
| Wall time | 723 s | 690 s |
| Production run (1.19) | 605 s | |
| Steps | 65 | 63 |
| Seconds per step | 11.1 | 11.0 |
| Tool calls | 84 | 85 |
| Prompt tokens incl. cache | 3.80 M | 3.18 M |
| Output tokens | 36.3k | 36.0k |
| Denied permissions | 0 | 1 |
| Final report | yes | yes |

Ticket B, two runs per version:

| | v1 run 1 | v1 run 2 | v2 run 1 | v2 run 2 |
|---|---|---|---|---|
| Wall time | 891 s | 1,330 s | 1,644 s | 1,595 s |
| Production run (1.19) | 1,575 s | | | |
| Steps | 101 | 133 | 97 | 85 |
| Seconds per step | 8.8 | 10.0 | 16.9 | 18.8 |
| Tool calls | 103 | 144 | 129 | 109 |
| Prompt tokens incl. cache | 6.59 M | 10.09 M | 10.14 M | 9.75 M |
| Output tokens | 38.5k | 55.1k | 71.9k | 67.3k |
| Denied permissions | 0 | 0 | 0 | 0 |
| Final report | yes | yes | yes | yes |

- **Ticket A:** both versions equally fast (723 s vs. 690 s, 11 s per step in both). Near
  the end of its run v2 had a shell command of the form `cd frontend && ...; cd .. && ...`
  denied (the permission check counted the `cd ..` as leaving the project directory),
  continued and finished with a report.
- **Ticket B:** v2 took 1,644 s and 1,595 s, 1.19 took 891 s and 1,330 s (and 1,575 s in
  production). On average v2 needed about 1.5 times as long (1,620 s vs. 1,110 s). v2 is
  steady, 1.19 is not: its three times on this ticket span a factor of 1.8. The production
  run ran under different conditions (inside the run wrapper, in a worktree below the home
  directory), so it widens the span but is not a clean repeat.
- **Where v2's time goes:** fewer or as many steps as 1.19, but each takes longer (17 to
  19 s vs. 9 to 10 s), with more tool calls and more output per step.
- **Ticket A history:** on 1.19 this ticket now has three times: 605 s (production), 596 s
  (first round) and 723 s (this round).

## 5. Result quality

All complete runs left green test suites: ticket A backend 270 of 270 and frontend 32 of 32
(v1), backend 269 of 269 and frontend 30 of 30 (v2); ticket B 4,651 and 4,659 (v1) and
4,656 and 4,655 (v2) passed tests in 164 files, build and type check clean. All reports
listed their required mutation checks as killed.

The real test: our own mutation probes on exactly the gaps that the production review had
found, plus the symmetric counterpart on ticket A.

| Probe | v1 1.19.3 | v2 2.1.2 |
|---|---|---|
| A: deployment service, servers call ignores "unreadable" | survived | killed |
| A: deployment service, apps call ignores "unreadable" | survived | killed |
| A: task service, projects call ignores "unreadable" | killed | **survived** |
| A: task service, claimable call ignores "unreadable" | killed | **survived** |
| B run 1: event name in the parser error message replaced by a constant | **survived** | killed |
| B run 2: the same probe | **survived** | **survived** |

- **Ticket A:** v1 repeats the production gap exactly, as in the first round. v2 covers that
  service and leaves the other one open. Neither version tests the symmetric case on its
  own; it only shifts which side is missing. The brief named the branches, not their
  symmetry.
- **Ticket B:** in its first run v2 added a test for a settings block with several events
  where only a later one is malformed, and checks that the error names that event. This
  closes the production gap. In its second run it did not; v1 repeats the gap in both runs.
- **Reporting (ticket B run 1):** v2 reported that two of the mutations written literally in
  the brief did not compile against its code and that it used the closest compiling forms;
  v1 listed all four as killed in literal or near-literal form. Whether the literal forms
  would have compiled against v1's code was not checked.
- In run 1, v2 also re-pointed citations in one more knowledge document than v1 did; which
  of the two is right was not checked.

**Reading:** v2 closed a known gap once in four attempts (two tickets, two runs on B), v1
never; on ticket A both miss one symmetric side. Together with the first round (ticket A,
2.0.25 more thorough but with the same gap), the direction is "v2 somewhat more thorough",
not more. With these few runs that is still not separable from chance.

## 6. Limits

- Ticket A: one run per version; ticket B: two runs per version in alternating order.
- Ticket A on v1 had to be started twice: the first run hit a denial of the same shape as
  v2's and ended after 380 s without a final report (in production the lane's run wrapper
  fails such a run). The tables show the repeated, complete run.
- The arms ran directly, not in the lane's OS sandbox. Neither production run ran inside
  that sandbox either; it was introduced afterwards.
- The verification of ticket B used a 60 s test timeout: the base commit still contains a
  test that hits the 5 s default under load (fixed in a later commit of that project).
- The AGENTS.md finding comes from reading the source of v2.1.3; the measured build is 2.1.2.
- Reasoning tokens are reported as 0 by both versions; output tokens do not separate them.
- The probes cover the known gaps only. The solutions were not reviewed in full.

## 7. Conclusion

1. **The blockers from the first round are still there.** The permission defaults, the
   shell path-argument gap and (by the source) the AGENTS.md walk are unchanged in 2.1. The silent abort is
   still fixed in v2 and still present in 1.19.
2. **An open point: the OS sandbox.** Since the first round the lane runs inside a macOS
   sandbox. Our isolated 2.x install, with its own data directories, does not start there; a
   2.x install in opencode's default directories was not tested. Either the sandbox gets
   rules for separate directories, or the default directories are tested.
3. **Speed: equal on the medium ticket, about 1.5 times slower on the large one.** v2 takes
   longer per step on ticket B and is remarkably steady (1,644 s and 1,595 s); 1.19 varies
   by a factor of 1.8 on the same ticket.
4. **Quality: at most slightly better with v2.** It closed a known gap on its own once in
   two runs, 1.19 never; on the symmetric case both versions still fail, so naming
   symmetric branches in the brief remains the more likely lever.

We stay on 1.19 and look at 2.x again when it becomes the regular release, then with several
runs per version and ticket and inside the lane's sandbox.
