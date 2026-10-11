**English** | [Deutsch](README.de.md)

[All Lane Arena editions](../../README.md) · [Slides](https://lannguyensi.github.io/lane-arena/runs/2026-10-pilot/) · [PDF](presentation.pdf)

# Local model vs. Claude and GPT: a pilot on real tickets

A locally hosted open-weight model competes against five cloud models: Claude Haiku 5.5,
Sonnet 5.5 and Opus 5.5, plus GPT-6.1-Sol and GPT-6-Luna. The test used two real, open
tickets, one medium and one hard. Every participant works in its own isolated repository
clone. A fresh Opus reviewer checks every solution without learning who wrote it. In
addition, hidden tests are run.

## 1. Results at a glance

**Rule:** a participant passes when the blind review returns `accept` or
`accept_with_notes`. Each participant gets at most 3 rounds.

| Task | Participant | Passed in round | Implementation time (sum) | Implementation cost | Review cost |
|---|---|---|---|---|---|
| Medium | Local model (Qwen3.8-Flash-Next) | 1 | 353 s | ~0 (local) | $0.25 |
| Medium | Claude Haiku 5.5 | 1 | 57 s | $0.01 | $0.26 |
| Medium | Claude Sonnet 5.5 | 1 | 32 s | $0.07 | $0.22 |
| Medium | Claude Opus 5.5 | 1 | 83 s | $0.31 | $0.25 |
| Medium | GPT-6.1-Sol | 1 | 75 s | $0.085* | $0.35 |
| Medium | GPT-6-Luna | 1 | 33 s | $0.007* | $0.35 |
| Hard | Local model (Qwen3.8-Flash-Next) | 1 | 491 s | ~0 (local) | $0.64 |
| Hard | Claude Haiku 5.5 | 2 | 369 s | $0.14 | $1.24 |
| Hard | Claude Sonnet 5.5 | 3 | 167 s | $0.29 | $1.82 |
| Hard | Claude Opus 5.5 | 1 | 126 s | $0.39 | $0.55 |
| Hard | GPT-6.1-Sol | 2 | 163 s | $0.28* | $1.08 |
| Hard | GPT-6-Luna | **failed** (3 rounds) | 308 s | $0.05* | $2.16 |

\* The GPT models ran through the Codex CLI on a ChatGPT subscription. These figures are
hypothetical API list prices, computed from the logged token counts (see section 7).

Verdicts per round (findings by severity):

| Task / participant | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| Medium / Local | accept_with_notes (2 low) | | |
| Medium / Haiku | accept_with_notes (2 low) | | |
| Medium / Sonnet | accept_with_notes (5 low) | | |
| Medium / Opus | accept_with_notes (3 low) | | |
| Medium / Sol | accept_with_notes (3 low) | | |
| Medium / Luna | accept_with_notes (5 low) | | |
| Hard / Local | accept_with_notes (1 medium, 3 low) | | |
| Hard / Haiku | fix_required (2 medium, 3 low) | accept_with_notes (3 low) | |
| Hard / Sonnet | fix_required (2 medium, 4 low) | fix_required (1 high, 3 medium, 2 low) | accept_with_notes (1 medium, 5 low) |
| Hard / Opus | accept_with_notes (3 medium, 1 low) | | |
| Hard / Sol | fix_required (2 medium, 3 low) | accept_with_notes (1 medium, 3 low) | |
| Hard / Luna | fix_required (2 medium, 3 low) | fix_required (1 medium, 4 low) | fix_required (1 medium, 3 low) |

All hidden tests were green in **every** round for **every** participant.

## 2. Setup

### 2.1 Participants and invocations

| Participant | Invocation |
|---|---|
| Local model | `opencode run --format json` against a local llama-server |
| Claude Haiku, Sonnet, Opus 5.5 | `claude --bare -p` (Claude Code, headless) |
| GPT-6.1-Sol, GPT-6-Luna | `codex exec` (Codex CLI 0.162.1, headless) |

- **Claude:** `--bare --permission-mode bypassPermissions --strict-mcp-config` with an
  empty MCP configuration, no subagents, no web fetch or web search, no persisted session.
  Billed via API key. A test run beforehand confirmed: no MCP servers, no memory.
- **Codex:** `--ignore-user-config --ignore-rules --ephemeral
  --dangerously-bypass-approvals-and-sandbox`. The user configuration (MCP servers, model
  and effort overrides) is left out. A test run beforehand confirmed: no instruction files,
  no memory, no MCP tools.
- **Local model:** opencode without MCP servers, hooks or subagents. Access outside the
  project directory is allowed, equivalent to the permission bypass for Claude and Codex.
- **Reviewer:** Claude Opus 5.5 headless, with a fixed reviewer prompt taken from
  production use, without write access. Method "rigorous" for the medium task,
  "adversarial" for the hard one (security-related). Every round got a fresh reviewer with
  no prior knowledge.

### 2.2 The local model in detail

| Area | Details |
|---|---|
| Hardware | Mac Studio, Apple M5 Max, 18 CPU cores, 40 GPU cores, 128 GB unified memory. Used only as an inference server. |
| Model | Qwen3.8-Flash-Next: MoE with 125B parameters, 6B active, as a 4-bit GGUF (UD-IQ4_XS, 93.7 GB). |
| Speculative decoding | MTP head (Q8_0, 4.1 GB), up to 3 draft tokens |
| Server | llama.cpp with Metal, 262k context, 2 slots, flash attention. |
| Sampling | temp 1.0, top_p 0.95, top_k 20, min_p 0.0 |
| Thinking / effort | Thinking on, effort `xhigh` by template default (see section 6) |
| Agent | opencode, context limit 235k, output limit 16k tokens |

**Throughput, measured live** (thinking on, MTP on, no prompt cache, 2 runs each):

| Measurement | Prompt tokens | Prefill | Generation | MTP acceptance |
|---|---|---|---|---|
| short prompt, 400 output tokens | 66 | (not meaningful) | 57.4 / 53.6 tok/s | 47 % / 41 % |
| 16k prompt (source code) | 16,259 | 826 / 827 tok/s (~20 s) | 59.3 / 54.7 tok/s | 54 % / 48 % |

Earlier measurements without MTP and without thinking: generation about 50 tok/s, prefill
894 (16k), 862 (64k) and 828 tok/s (128k).

**What this means for run times:** an agent run is a chain of tool calls with a growing
context. The local model needed 30 steps (medium) and 43 steps (hard). Every step costs
prefill plus generation including thinking. That explains the 6 to 8 minutes per run.

### 2.3 Procedure

A round consists of implementation, saving the diff, verification with hidden tests, and
a blind review. All runs were strictly sequential, never two at the same time. In a fix
round the same participant gets the unchanged brief plus the findings from the previous
review, but only those with severity critical, high or medium.

## 3. The tasks and why these

Both come from a real pool of open tickets.

### Medium: role-dependent controls (frontend, React/Next.js)

- **What:** in a log analysis application, users with the roles MEMBER and VIEWER see the
  buttons Overwrite, Rename and Delete on shared or default views, although the server
  rejects these actions with 403. The buttons should be hidden or disabled with a reason.
- **Why:** clear, testable acceptance criteria (a component test per role and state, the
  server stays unchanged), a manageable scope, a typical task for a mid-tier implementer.

### Hard: reserved usernames (backend, Express/Prisma, security)

- **What:** the usernames of two service accounts are hard-coded as separate literals in
  several places and not blocked at registration. Required: one shared constant and a
  block at `POST /api/auth/register`.
- **Why:** consolidating the literals into one constant is easy, the edges are hard:
  - The username is lowercased before it is stored. The check has to run after that,
    otherwise `GATEWAY` gets through.
  - In invite mode, no invite code may be consumed.
  - Unifying the filters changes behaviour, because some places used to hide only one of
    the two names.
  - The code already had a non-exported constant that the brief did not mention.
  - An existing database test expects `409` for a name that is already taken. It does not
    run locally without a database.
- **Rejected:** a multi-arch Docker task (measures build tooling more than reasoning) and a
  flaky test (not deterministic).

## 4. Isolation

| Measure | Implementation | Limits |
|---|---|---|
| Own clone per participant | `git clone --shared` at the same fixed base commit, own dependencies per clone | The object database is shared read-only; writes happen only in the clone. |
| No push possible | Remote removed in every clone; the brief forbids commit, push and new remotes | No operating-system sandbox. A participant could have added a remote on purpose (not observed). |
| No shared context | No MCP servers, no hooks, no memory for any participant. No instruction files, except one global rule about chat-template tokens for the local model. The repositories themselves have no agent instruction files. | |
| Breakouts from the clone | Permission bypass for everyone | Observed: one participant once wrote a file to `/tmp`, one fetched a package from the network via `npx` once. Neither affected the result. The isolation is "own clone without a remote", not a sandbox. |
| Blind review | Clone and review request carry only a random label | Partially blind: style can give the participant away. The reviewer demonstrably does not change the clone (diff comparison after every review). |
| Hidden tests | copied into the clone only after the diff is saved, run there, then deleted again | |

## 5. Briefs, tests and logs

- **One brief per task**, identical for all participants: goal, context, requirements,
  constraints and verification commands. Handed over as a file.
- **Hidden tests:**
  - Medium: 54 cases (role × state × button). "Hidden" and "disabled with a reason" are
    both accepted.
  - Hard: 8 required cases, 2 controls, 4 soft cases against over-blocking similar names,
    plus a static check that the literals remain in only one place.
- **Frozen** by SHA-256 hash before the first participant ran.
- **Check against the base state:** the hidden tests were red there for exactly the
  intended cases (medium: 18 of 54; hard: all 8 required cases), the controls green. So the
  tests can actually fail.
- **What a participant gets on `fix_required`:** a fresh run with no memory of the previous
  round, in the same clone with its own changes. The prompt consists of the unchanged brief
  and a section with the review findings: a note that its own changes are still in the
  working tree, the instruction to fix every finding with severity critical, high or medium
  or explain in the final summary why not, and to re-run the verification commands. Each
  finding lists severity, title, file and line, the reviewer's description and the
  suggested fix. Not passed on: lows, the verdict, the rest of the review text, and the
  hidden test results.
- **Logged** per round and participant: the full transcript, the diff, the test logs, the
  review and the timestamps.

## 6. Reasoning effort

Method: the invocations were replayed against a local proxy that captures the request
body. For the local model, direct requests to the server and a look at the chat template
were added.

| Role | Actual effort |
|---|---|
| Claude Haiku, Sonnet, Opus (implementation) | `medium`, adaptive thinking |
| Claude Opus (review) | `medium` |
| Local model | `xhigh` (template default, thinking on) |
| GPT-6.1-Sol | model default `low` |
| GPT-6-Luna | model default `medium` |

- The headless Claude invocation ignores personal settings (which said `xhigh`) and uses
  the default `medium`.
- opencode reports 0 reasoning tokens although the server demonstrably thinks. The local
  model's token counts are a lower bound.
- The GPT efforts are not proven by a capture, but the reasoning tokens match the defaults
  (Sol 48 to 148 per run, Luna 206 to 2,487).
- **Consequence:** effort was unevenly distributed: local `xhigh`, Claude and Luna
  `medium`, Sol `low`. The reviewer ran at `medium`.

## 7. Time and cost

- **Implementation time:** the local model needed 353 s (medium) and 491 s (hard). The
  cloud models needed between 32 and 126 s in round 1. Against round 1, the local model is
  3.9 to 11 times slower. Until acceptance on the hard task the gap shrinks to 1.3 to 3.9
  times, because the other participants needed fix rounds.
- **Implementation cost:** local ~0 (electricity not measured). Claude $0.01 to $0.39 per
  task, Haiku cheapest, Opus most expensive.
- **GPT at API list price (hypothetical):** GPT-6.1-Sol $2.00 input, $0.10 cached input,
  $10.00 output per 1M tokens; GPT-6-Luna $0.10 / $0.01 / $0.50. Result: Sol $0.085
  (medium) and $0.28 (hard, 2 rounds), Luna $0.007 (medium) and $0.05 (hard, 3 rounds).
  Assumptions: input includes the cached share, reasoning counts as output. A possible
  surcharge for very long prompts is not included.
- **Review dominates cost:** an Opus review costs $0.22 to $0.35 (medium) and $0.53 to
  $0.90 (hard). Every additional round costs another review.
- **Total API cost:** $10.37, of which $1.22 implementation (Claude) and $9.15 reviews.
  With GPT at list price it would be $10.80.

## 8. Observations

- **The hidden tests did not discriminate.** All participants passed them in all rounds.
  The differences showed up in the review (docs consistency, test quality, behaviour
  changes, adherence to constraints) and in a database test measured afterwards.
- **Only the local model kept an existing database test green.** An existing test that
  runs only with a database expects `409` for a service-account name that is already taken.
  It did not run locally. Measured afterwards against a real database, only the local
  model's solution kept it green; it had chosen the order of checks deliberately. With
  Opus, Haiku, GPT-6.1-Sol and GPT-6-Luna two cases fail each, because the block runs
  before the uniqueness check. A CI with a database would have flagged three of the passing
  solutions as red. The reviews of those solutions did not notice.
- **Sonnet:** only the reviewer of Sonnet's second round recognised the break and gave it a
  high. That reviewer's suggested fix named adjusting the test expectation, with prior
  approval, as one option. In round 3 Sonnet changed the expectation from `409` to `400`
  without that approval; the brief only allowed additions to existing tests. The test then
  passes; the reviewer rated the change as a medium, with an overall
  `accept_with_notes`.
- **Other changed test lines** were refactors of helpers (mocks, an extra parameter), not
  weakened checks.
- **The review rounds on the hard task revolved around docs.** The mediums were almost
  entirely about docs upkeep: line references in the repository's knowledge base, missing
  or contradictory changelog entries, docs statements that no longer match the code. All
  participants met the security requirements of the brief (hidden tests green). The brief
  did not mention the repository's docs convention. Those who found and maintained it on
  their own got through faster. GPT-6-Luna failed on exactly this three times.
- **Fast is not the same as done.** GPT-6-Luna was among the fastest on the medium task,
  with 33 s just behind Sonnet (32 s), and failed on the hard one. The local model was the
  slowest everywhere and passed both tasks in round 1.
- **Haiku:** on par on the medium task, passed the hard one in round 2, at about one
  thirtieth (medium) or one third (hard, both rounds) of Opus's implementation cost.

## 9. Conclusion

**What the data shows:**

1. All six participants passed the medium task in round 1. On the hard task only the local
   model and Opus did. Haiku and GPT-6.1-Sol needed two rounds, Sonnet three, GPT-6-Luna
   did not make it in three rounds.
2. Against round 1 of the others, the local model is 3.9 to 11 times slower (1.3 to 3.9
   times until acceptance on the hard task) and incurs practically no API cost. The cost of
   a task is driven mainly by the review, that is, by the number of rounds.
3. Only the local model's solution keeps the existing database test green without changing
   it.
4. The local model ran with the highest reasoning effort. Part of its result may be due to
   that.

**What the data does not show:**

- Two tasks are a pilot, not statistics.
- Each verdict comes from a single review. The noise between two independent reviews is
  unmeasured; differences such as "1 medium vs. 2 mediums" can lie within it. The existing
  database test shows how large it can be: only one review reported the break, three
  reviews let it through.
- The hidden tests were too easy to discriminate.
- The reviewer ran one tier below production use.
- The review is only partially blind.
- Local verification ran without database tests; the database finding comes from a
  measurement taken afterwards.
- How well the local model acts on review feedback is not shown by this pilot, because it
  passed both tasks in round 1.

**Assessment:** for medium tasks, a local model on good hardware is a serious
implementer: in this pilot it was slower, but not worse. For security-critical tasks, a
single good result is not enough to replace the cloud models. A next run should include
more tasks, set the same effort for everyone, use two reviews per solution, and use hidden
tests that also check the soft edges.

Both tasks were subsequently shipped on the basis of the pilot solutions, after a further
review and rework, and are running in production.
