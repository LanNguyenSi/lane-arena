**English** | [Deutsch](README.de.md)

[All Lane Arena reports](../../README.md) · [Pilot edition](../../runs/2026-10-pilot/README.md)

# opencode 1.19 vs. opencode 2: same model, different harness

The lane, the locally hosted model from the [pilot edition](../../runs/2026-10-pilot/README.md),
runs inside opencode. opencode 2 has been in development for weeks. Before switching, we
measured whether the new version behaves the same way, whether it is faster and whether the
results get better or worse. The model, hardware and server stayed exactly the same; only the
agent harness changed.

This is not an arena edition: there are no competing participants, no blind review and no
hidden tests. It is a harness comparison with two parts: a micro benchmark on toy tasks and
the replay of one real ticket.

## 1. Results at a glance

| Question | Answer |
|---|---|
| Is opencode 2 a drop-in replacement? | **No.** Four defaults change silently and would have removed the lane's sandbox boundary or altered its context (section 3). |
| Does opencode 2 fix the silent abort after a denied permission? | **Yes.** The model is told about the denial and finishes with a report. The exit code is still 0. |
| Is it faster? | On toy tasks 1.2 to 5.8 times faster. On the real ticket **1.75 times slower**. |
| Why the difference? | The toy-task gain is a fixed saving on the first prompt of a session (about 15 s). Per step both versions are equally fast; on the real ticket the model simply took 95 steps instead of 55. |
| Better results? | Somewhat more thorough on the real ticket, with the same blind spot as 1.19. One run per version: a direction, not a finding. |
| Decision | Stay on 1.19 for now. Re-test once 2.x is the regular npm release. |

## 2. Setup

| Area | Details |
|---|---|
| Model and server | Qwen3.8-Flash-Next on a Mac Studio (M5 Max, 128 GB), llama.cpp, 2 slots, 262k context. Details in the [pilot report](../../runs/2026-10-pilot/README.md), section 2.2. |
| Effort | Variant `xhigh` in both versions (1.19: `--variant xhigh`, 2.x: `-m provider/model#xhigh`). |
| Arm v1 | opencode **1.19.0**, the regular npm release (`opencode run --format json`). |
| Arm v2 | opencode **2.0.25** (`run --standalone --format json`). At the time 2.x was not the npm `latest` release; it came from the Homebrew bottle, installed in isolation with its own config, data, state and cache directories, so the production 1.19 install stayed untouched. |
| Permissions | Both arms: access outside the project directory set to `ask` (1.19 default; set explicitly for 2.x, see section 3). In the non-interactive mode an `ask` becomes an automatic denial. |
| Working directories | Fresh copies outside the user's home directory for every run (reason: section 3, AGENTS.md). |
| Server load | Both llama.cpp slots idle at the start of every run. |
| Counting | Tokens, steps and tool calls from each session's full export, in both arms from the same kind of source. |

### Micro benchmark

Four scenarios, 3 repetitions each, alternating v1 and v2 (24 runs). Each run starts in a
fresh copy of a tiny git repository with a sibling folder `outside/` next to it.

| Scenario | Prompt (abridged) | What it tests |
|---|---|---|
| `ok` | run `cat sub/a.txt` in the shell | baseline: one allowed tool call |
| `shell` | run `cd sub && cd ../.. && cat outside/note.txt` | shell breakout from the project directory |
| `read` | read `../outside/note.txt` with the read tool | file-tool breakout |
| `edit` | add a function and a test, run `node --test`, change nothing else | a small real edit |

### Real ticket

One ticket that the lane had already delivered in production on 1.19, replayed with the
**verbatim original brief** on the same base commit, one fresh clone per arm, one run each.
The ticket (backend Hono/Prisma, frontend Next.js, docs): a dashboard summary should mark a
connected service whose stored credential can no longer be decrypted as "unreadable",
instead of failing as a whole or showing "Not configured". The brief demanded new tests,
doc updates and a mutation check for each new branch (break the branch, the new test must
fail).

In the original production run, the review had found one medium-severity gap: the skip of
downstream calls was only tested for some services, the deployment service lines had
surviving mutants.

## 3. Behaviour: what opencode 2 changes

| Topic | 1.19.0 | 2.0.25 | Consequence |
|---|---|---|---|
| Default permissions of the `build` agent | access outside the project: `ask` | everything `allow` | Without an explicit rule there is no sandbox boundary any more. Confirmed in a probe run before the benchmark: shell and read reached a folder outside the project without asking. |
| Denied permission in non-interactive mode | session ends silently after the tool call, no report (0 of 6 runs) | the model gets "this non-interactive run cannot ask the user for permission ... continue without this action" and reports (6 of 6) | the long-standing silent abort is fixed |
| Exit code after a denial | 0 | 0 | a wrapper still has to detect a missing report |
| `run` without `--standalone` | n/a | talks to a background service that does not see the client's `OPENCODE_CONFIG_CONTENT` | permission overrides have no effect; `--standalone` is required |
| AGENTS.md discovery | stops at the git root | walks up to the home directory when the working directory lies below it | a checkout below a workspace folder silently loads that workspace's AGENTS.md (in our case about 37 KB, roughly 10k tokens of unrelated orchestrator rules) into every session; no config switch found |
| `question` tool in non-interactive mode | not observed | called in 1 of 3 `read` runs (an extra error and step) | deny it explicitly |
| Existing `opencode.json` | | normalised without loss (providers, variants, limits, compaction) | not a blocker |
| CLI | `--variant`, `--dir` | variant as `-m provider/model#variant`, no `--dir` | wrappers need adjusting |
| `--format json` stream | complete | omits the last `step_finish` | count from the session export instead |

The permission configuration we used for v2 on the real ticket, passed as
`OPENCODE_CONFIG_CONTENT` together with `--standalone` (later rules win, so path-specific
`allow` rules can follow the `ask`). The micro benchmark ran with the first rule only; the
`question` rule was added after the micro benchmark showed the `question` call:

```json
{"permissions": [
  {"action": "external_directory", "resource": "*", "effect": "ask"},
  {"action": "question", "resource": "*", "effect": "deny"}
]}
```

The source references (default rules, file access, AGENTS.md discovery in
`packages/core/src/config/plugin/instruction.ts`) were read on the upstream development
branch, not exactly at 2.0.25. Every row above except the source reading was also observed
in runs.

## 4. Speed

### Micro benchmark (median of 3)

| Scenario | v1 wall time | v2 wall time | v1 uncached prompt | v2 uncached prompt | Report v1 / v2 |
|---|---|---|---|---|---|
| `ok` | 19.6 s | 3.4 s | 11.9k | 0.5k | 3/3 · 3/3 |
| `shell` | 19.1 s | 16.4 s | 11.9k | 0.5k | **0/3** · 3/3 |
| `read` | 19.0 s | 9.8 s | 11.9k | 0.6k | **0/3** · 3/3 |
| `edit` | 34.4 s | 13.5 s | 12.5k | 0.8k | 3/3 · 3/3 |

- Harness overhead (wall time minus model time) is small in both: 0.7 s (v1) and 0.5 s (v2).
- The gap is almost entirely the **first prompt of a session**: v1 sends about 11.9k tokens
  that miss the server's prompt cache every time. v2 sends a smaller system prompt (7.8k on
  its very first run). After that, in an `ok` run (two steps), about 15.2k of its 15.7k
  prompt tokens come from the cache, although the working directory changes per run. Why v1 misses the cache is not verified.
- `edit`: tests green in 3 of 3 runs in both versions, only the two intended files changed.
  v2 needed 5 steps instead of 6 to 8 and about half the prompt tokens.

### Real ticket (one run each)

| | v1 1.19.0 | v2 2.0.25 |
|---|---|---|
| Wall time | 596 s | 1,040 s |
| Harness overhead | 1.1 s | 3.1 s |
| Steps | 55 | 95 |
| **Seconds per step** | **10.8** | **10.9** |
| Output tokens per step | 556 | 560 |
| Tool calls (errors) | 72 (0) | 116 (2) |
| Prompt tokens incl. cache | 2.72 M | 6.63 M |
| Uncached input | 50k | 65k |
| Largest context of one step | 76k | 116k |
| Report at the end | yes | yes |

Per step the two versions are equally fast, and inside one long session both use the prompt
cache well. v2 was slower because the model did more under v2, not because the harness is
slower. The extra time is spread out, with no single hotspot. Each step is counted by its
first tool call; shell commands that run tests, lint, type checks, builds or code generation
count as "tests, lint, build":

| Step type (first tool call of the step) | v1 steps / seconds | v2 steps / seconds |
|---|---|---|
| edit / write | 17 / 153 | 32 / 357 |
| other shell | 10 / 180 | 27 / 307 |
| tests, lint, build | 15 / 87 | 14 / 127 |
| read | 6 / 100 | 11 / 114 |
| mutation probes | 2 / 14 | 5 / 62 |
| `npm ci` | 2 / 20 | 5 / 33 |
| other (todo list, final report without a tool) | 3 / 41 | 1 / 37 |
| **total** | **55 / 595** | **95 / 1,037** |

What v2 did in addition: more tests, two failed edits (the search string did not match),
repeated `npm ci` after parallel installs left a partial tree, reading a tool's `--help`
twice, a production build and a throwaway end-to-end check against the real downstream
module. The micro-benchmark saving of about 15 s per session is about 2.5 % of a 600 s
ticket and disappears in that extra work.

## 5. Result quality on the real ticket

- Both versions changed the same 9 files. Backend 270 of 270 tests green; frontend 30 of 30
  (v1) and 33 of 33 (v2).
- Both reported the three required mutation checks as killed. Our own probes on the skip for
  the deployment service lines found **2 surviving mutants in both versions**, exactly the
  gap of the original production run. Neither version extended the tests to this symmetric
  case on its own; both tested what the brief named literally.
- v1 removed a guard that only checks readability for configured services. Unconfigured
  services now trigger an extra credential lookup and a downstream call, and the summary
  reports an error instead of `null` for them. The UI is unaffected, the change is untested
  and not purely additive. The original production run on the same version did not do this:
  run-to-run variance, not a version trait.
- v2 kept the response contract, added a test for one more service and an extra mutation
  check, and ran the build and an end-to-end check.

**Reading:** v2 was more thorough here and paid for it with 1.75 times the time, 2.4 times
the prompt tokens and therefore 1.75 times the server slot occupancy. With one run per
version and visible variance within 1.19 itself, "v2 is more thorough" cannot be separated
from chance.

## 6. Limits

- **One run per version on the real ticket**, and not alternating: v2 ran first, then v1
  (a loop bug in the benchmark script ran only v2 on the first invocation; the data was
  relabelled, nothing was lost).
- The micro scenarios repeat identical prompts, which favours prompt caching. A busy server
  or changing briefs were not measured.
- The cause of v1's cache misses on the first prompt is a hypothesis (a per-run value placed
  early in the system prompt), not verified by a request capture.
- Reasoning tokens are reported as 0 by both versions although the model thinks (as in the
  pilot). Output tokens therefore do not separate reasoning.
- One build of 2.x (2.0.25). The development branch moves quickly; 1.19 has since received
  patch releases that were not re-measured.
- Both arms ran in clones outside the home directory. In the production layout (checkouts
  below the workspace folder) v2 would additionally have loaded the workspace AGENTS.md.

## 7. Conclusion

1. **opencode 2 is not a drop-in replacement for an unattended lane.** Its default
   permissions allow everything, `run` without `--standalone` ignores permission overrides,
   AGENTS.md discovery reaches beyond the repository, and the `question` tool is available in
   unattended runs. Each of these changes the lane without any visible error.
2. **The silent abort is fixed**, but the exit code stays 0. A wrapper that fails a run
   without a final report is needed in both versions.
3. **Faster on toy tasks, slower on real work.** The toy-task gain is a fixed prompt-cache
   saving per session. On a real ticket the number of steps dominates, and the model took
   more of them under v2.
4. **The brief is the more likely quality lever than the harness.** Both versions skipped the
   same symmetric test case. Naming symmetric branches explicitly in the brief is the next
   thing to test; this comparison did not try it.

We stay on 1.19 and repeat the real-ticket comparison with several runs per version once 2.x
is the regular npm release, with `--standalone`, the permission rules above, checkouts
outside the home directory and the run wrapper's report check.
