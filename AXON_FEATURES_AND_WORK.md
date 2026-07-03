# Axon Features And Work

This document is the working source for Axon feature copy and future
axoneditor website content. It should describe what Axon already does, what is
being built, and why the product feels different. It is not a private planning
checklist.

## Product Position

Axon is a local-first code editor with a Go backend, bundled language tooling,
integrated Git workflows, terminal sessions, tests, and a project-aware local
AI agent. The goal is not to look like another Electron editor with a chat
panel. The goal is a fast editor where the terminal, Problems panel, file
watcher, language servers, Git, and AI agent all react to the same project
state.

## What Axon Already Has

### Bundled Language Servers

Axon ships language tooling with the app instead of expecting every user to
install the basics manually. Current work includes bundled or managed support
for Go, Rust, Python, C/C++, TypeScript/TSX, HTML, CSS, JSON, YAML, and Lua.

Editor features already include:

- Completion.
- Installed package and export-aware completion for TypeScript/TSX projects,
  including component and icon imports from npm dependencies.
- Hover.
- Diagnostics.
- Go to definition.
- References.
- Rename.
- Formatting.
- Code actions.
- Signature help.
- Workspace configuration responses.
- TSX-aware React editing behavior.
- HTML template completion from `!` in HTML files.
- Find behavior that can seed the query from the current selection without
  stealing the editor cursor after the query already exists.

This matters because many custom editors stop at autocomplete. Axon is already
building the deeper editor contract expected from VS Code and Zed.

### Project-Aware Problems

Problems are workspace-aware and merge diagnostics from project checks, Monaco,
and LSP servers. Axon caps diagnostic volume for performance, deduplicates
entries, groups by file, supports copy actions, and keeps diagnostics tied to
the current project.

This feeds the next terminal feature: `axon fix` reads the current Problems
snapshot from Axon and applies local-agent fixes back to the project.

### Integrated Terminal

Axon includes a PTY-backed terminal owned by the Go backend. Terminal sessions
survive panel hides and renderer reconnects, with scrollback replay so output
does not disappear when the UI reconnects.

The terminal is also becoming an agent surface through the `axon` command.

### Git Workflows

Axon includes local Git surfaces for:

- Status.
- Diffs.
- History.
- Commit graph.
- Branch workflows.
- Stashes.
- Worktrees.
- Merge conflict listing and resolution.
- Commit message drafting through the local agent.

The aim is to keep the normal edit, inspect, stage, commit, and review loop
inside the editor.

### Test Explorer

Axon has a native test surface for discovering tests, running providers,
running individual targets, streaming output, and showing results in the
editor. The goal is to make tests feel like part of the project UI, not just
commands pasted into a terminal.

### Multi-Root Foundations

Axon has a multi-root workspace foundation so project-aware surfaces can move
past a single `folderPath`. Problems, search, Git, terminals, LSP, tests, and
the agent should all understand which root they belong to.

### Local Axon Agent

Axon Agent is local-first. It talks through `axon-core`, uses Axon-facing model
names, streams responses, keeps workspace conversations, and can use backend
project tools to list files, read files, and search code.

Current local agent capabilities include:

- Project-aware chat.
- Streaming responses.
- Workspace conversation sessions.
- Model discovery and local model download flow.
- Backend tool calls for project search and file reads.
- Edit proposal parsing and workspace-safe path validation.
- Commit message drafting.
- Terminal conversation sessions through the `axon` command.
- Workspace-specific resume lists with `axon resume`.
- Direct session restore with `axon resume :id`.
- Slash commands inside the terminal agent, including model selection.
- Global prompt guardrails that tell local models not to invent placeholder
  paths, counts, filenames, commands, URLs, emails, API names, or project
  facts.
- Exact project facts injected with attached project context so the agent can
  answer workspace visibility questions without replacing real values with
  tutorial placeholders.

The agent should never expose raw runtime names to normal users. The product
language is Axon models and Axon Agent.

## The `axon` Terminal Command

The shipped CLI command is `axon`. The source lives under `cmd/axon-agent` so
it stays separate from the `axon-core` server entrypoint, but users should only
need the clean terminal command.

Current command work:

```bash
axon
axon .
axon /path/to/project
axon ask "why is this slow?"
axon resume
axon resume :conversation
axon commit
axon fix
```

### `axon`

Starts a terminal-native Axon Agent conversation in the current workspace.
This is the Codex/Claude Code style surface: the user stays in the terminal,
types naturally, receives streamed responses, and can use slash commands
without reopening the editor sidebar.

The conversation is workspace-based. Axon stores the session under the current
project so a terminal conversation about one codebase does not get mixed with
another project.

### `axon .`

Opens the current directory in Axon from any terminal.

### `axon ask`

Streams a project-aware answer through `axon-core`, using the same local model
and response envelope as the editor sidebar.

`axon ask` remains useful for one-off prompts and shell scripts, but it is not
the primary interactive experience. For follow-up questions, the plain `axon`
session keeps conversation history and project context together.

### `axon resume`

Lists saved Axon Agent conversations for the current workspace. `axon resume
:conversation` restores a specific session so the user can continue a previous
terminal conversation with the same workspace context and message history.

### Slash Commands

Inside an interactive `axon` session, `/` opens the local command picker.
Commands are filtered while typing and can be selected with arrow keys and
Enter. `/model` opens the Axon model picker using product names, not raw local
runtime names.

The terminal UI should feel like a serious agent surface:

- Input stays in the Axon prompt area.
- Loading uses Axon's animated braille frame mark with shimmer text instead
  of printing backend internals like runtime checks.
- Internal stream milestones stay hidden unless they are useful errors.
- The cursor belongs to the prompt, not the loading state.

### `axon commit`

Reads `git diff --staged`, streams a commit message draft, and asks before
running `git commit`.

### `axon fix`

Reads the current Problems snapshot exported by the open editor, sends those
diagnostics to the local agent, parses an edit proposal, writes only inside the
current workspace, and lets Axon's watcher/LSP flow update diagnostics in real
time.

This is the terminal moment Axon should own: type a command, watch the editor
fix itself.

## Cold Start Speed

Fast launch is part of the product identity. Axon should open to a usable
editor shell before backend warmup makes the app feel blocked.

Current work:

- A tiny native Electron boot entry creates a splash window before importing
  the heavier main-process app graph.
- The real main process closes that boot splash when the editor BrowserWindow
  finishes loading or reaches `ready-to-show`.
- Packaged startup creates the BrowserWindow before waiting on `axon-core`
  health.
- `axon-core` still starts automatically in the background.
- The bundled core watchdog starts after core readiness instead of blocking
  first paint.
- Local AI runtime warmup stays asynchronous.
- Workspace watchers use native filesystem events by default; polling is an
  explicit debug opt-in through `AXON_WATCH_USE_POLLING=1`.
- External disk changes should appear in the sidebar quickly through native
  add/change/unlink events, including files copied in from Finder or another
  app.
- Language servers start from the active file after the editor shell is usable
  instead of starting every relevant server during workspace restore.
- Project diagnostics do not run automatically on workspace open or every file
  watcher event. They run on save and when the user explicitly refreshes
  diagnostics.

Why this matters: the renderer splash can only appear after Electron creates
and loads the real BrowserWindow. If the main process spends time importing
Git, LSP, AI, watcher, settings, and core-process modules before creating a
window, the user sees a blank app before the renderer can paint anything. The
native boot splash covers that pre-renderer gap.

Target experience:

- Dock click to visible editor shell in under 1 second on the primary
  development machine.
- File switching with no flicker.
- Terminal prompt visible in under 200ms when opening the terminal.

Future measurement work should add startup timing marks for Electron ready,
renderer ready, core health, workspace restore, first editor mount, and first
terminal prompt.

## Visual Identity

Axon should be recognizable without reading the app name. The editor can use
familiar layout patterns, but it needs persistent visual details that feel
intentional.

Current identity work:

- Status bar is becoming Axon's persistent visual signature.
- A thin animated Axon accent strip sits on the status bar.
- Active status controls use a stronger treatment instead of default editor
  chrome.
- Sidebar file and folder names use Git state color while keeping compact dot
  and status-label indicators.
- Editor buffers can scroll beyond the final line so the bottom of a file is
  not pinned to the bottom edge of the window.
- Agent, Problems, terminal, and source-control states use the Axon accent
  consistently.

Future identity areas:

- Denser tab treatment with a stronger active-file indicator.
- File tree treatment with clearer folder weight and tighter indentation.
- Agent terminal output with polished progress lines and colored edit results.

## Demo Sequence That Should Travel

This is the product story Axon should be able to show without explanation:

1. Open Axon and the editor shell is already there.
2. Run `axon .` from a terminal and the project opens.
3. Run `axon ask "what is broken here?"` and get a streamed project-aware
   answer.
4. Run `axon fix` and watch diagnostics change as files are edited.
5. Use Git, tests, terminal, Problems, and AI without leaving the editor.

That is the feature set that makes Axon feel like its own editor instead of a
generic shell around Monaco.

## Recent Editor Stabilization

The latest stabilization pass closed the review findings from
`axon-code-review.md` and `fix-editor-format-and-crossfile-lsp.md`, then kept
going through the edge cases found while using the editor normally. The point
of this work was not just to make each bug disappear once. It was to remove the
state ownership problems that caused the same class of bugs to return in
slightly different forms.

Completed editor and language work:

- Dirty saves no longer push the active editor to the bottom of the file. Save
  and dirty-state updates now preserve the user's scroll position instead of
  remounting or revealing the final line as a side effect.
- Repeated edits on the same line no longer stack stronger yellow, green, or
  red paint. Monaco change decorations are now owned as replaceable decoration
  sets, so changing a line twice refreshes the existing marker instead of
  layering another marker over it.
- Go-to-definition and jump behavior was repaired around exported functions
  and imported symbols, with command/control-click treated as the explicit
  navigation gesture.
- TypeScript hover rendering was cleaned up so the editor does not show two
  competing stacked hover cards for the same symbol.
- TypeScript/TSX completion now considers installed package exports, including
  component and icon libraries, so typing a component name can surface imports
  from dependencies instead of only local symbols.
- The completion popup width was tuned so item labels, details, and source
  text have room to breathe without turning the suggestion panel into an
  oversized overlay.
- HTML files support `!` template completion, and embedded HTML inside JSX/TSX
  now receives themed token colors instead of falling back to plain white text.
- Command/control-F behaves like a normal editor search flow: selected text
  seeds the search query, opening search is reliable, and editing the query
  does not unexpectedly remove the editing cursor from the original editor
  location.
- Breadcrumb symbol reveal works again, and breadcrumbs filter out snippet
  noise so the path focuses on real symbols and structure.

Completed settings, modal, and theme work:

- `SettingsModal.tsx` was split into focused section components and shared
  settings helpers. The modal now imports section components for Appearance,
  Editor, Ergonomics, AI, media settings, and language servers instead of
  carrying the whole settings UI in one oversized file.
- Settings support code was moved under `features/settings/lib` so non-UI
  TypeScript helpers are not mixed beside React components.
- The removed theme override section is gone from Settings. Axon now relies on
  built-in theme definitions instead of exposing partial override controls that
  made the modal heavier and harder to reason about.
- Settings no longer references browser globals directly from the modal
  component. Platform-specific window and Electron access lives behind shared
  settings helpers, which avoids `Cannot find name 'window'` in the modal file.
- The settings modal is centered correctly and opens much faster. Expensive
  live-preview work is deferred and coalesced, and the modal overlay can skip
  backdrop blur where it hurts responsiveness.
- Portal-based UI, including tab context menus, inherits the active theme from
  document-level CSS variables. This fixed dark-theme menus that previously
  showed black text, black borders, or missing backgrounds.
- Workspace Search no longer leaves a hidden overlay after closing. Leaving
  modal overlays drop pointer events, and the close timer is kept stable across
  parent re-renders.
- Every visible app scrollbar now uses Axon's custom theme-aware scrollbar
  treatment instead of mixing native scrollbars with the editor chrome.

Completed sidebar and tab-surface work:

- Sidebar file names are no longer truncated. Long names keep their natural
  width, and the file tree can scroll horizontally so the full path segment is
  inspectable.
- Re-clicking an already active file in the sidebar no longer forces a no-op
  editor layout update. That removes the flash where Monaco briefly redraws the
  active editor even though the selected file did not change.
- Tab popup actions such as pin, close, and related tab commands now use the
  active Axon theme instead of hard-coded light/default styling.

Completed extension, modal, and chrome work:

- The extension modal has a stable viewport-based height instead of resizing
  itself around the active tab's content. Downloads can show a single item
  without shrinking the modal, and installed/downloaded extension rows scroll
  inside a dedicated list region.
- Command-style modals now support a fast path for lightweight pickers. The
  Open Folder picker can skip blur, enter motion, and delayed close behavior so
  it opens and hands off to the native folder dialog without making the shell
  feel sticky.
- Sidebar file context menus are theme-aware. Floating file actions now use
  Axon's shared panel, foreground, accent, and danger variables instead of
  fixed dark colors that failed on themes like Ayu Dark.
- The renderer root is pinned to the Electron viewport, and the workbench fills
  that root. This keeps the status bar attached to the bottom edge after
  window restore or resize instead of leaving an empty band under the app.
- Editor tabs no longer show a separate full-pane `loading...` placeholder
  while file content resolves. Monaco stays on the themed editor surface, which
  avoids light flashes when opening files in dark themes.
- Workspace/folder loading uses an opaque themed surface without backdrop blur.
  The loading UI still communicates work in progress, but it avoids the
  transparent compositing path that can make Electron feel slower.
- Modal overlays now follow an opaque theme-backed policy. Shared command
  modals, Git modals, language tools, test explorer, update, workspace
  overview, trust prompts, and agent confirmation surfaces avoid translucent
  black overlays and backdrop blur while preserving panel motion.
- Startup and workspace flows now emit lightweight renderer performance marks
  for boot, initial extension registry loading, workspace tree reads,
  workspace application, restored sessions, CLI folder opens, and first Monaco
  editor mount. These marks make slow paths visible in DevTools without adding
  another heavy profiler surface to the app.
- Shared command modals now emit modal-specific performance marks for open,
  close request, and unmount. This covers Settings, Extensions, workspace
  search, command palette, file outline, and folder-picking surfaces that use
  the shared modal shell.
- Zen mode now reserves the native window-control zones in the tab strip:
  macOS traffic lights on the top left and Windows caption buttons on the top
  right no longer sit over editor tabs when the sidebar and toolbar are hidden.
- Electron development startup now rebuilds main and preload outputs before
  launching. That prevents stale preload APIs from making `window.axon`
  disappear or leaving extension marketplace functions undefined after code
  changes.
- Extension package output now uses Node-compatible ESM import specifiers, so
  `@axon/extension-api` can load from built package output without missing
  extension registry modules at startup.
- Built-in extension preparation now uses a single extension-registry step
  instead of repeatedly exporting theme packages and copying built-in assets.
  The step validates manifests under `extensions/builtin` and
  `extensions/marketplace`, then refreshes only stale renderer-facing static
  icon assets until Axon has a full extension asset protocol.
- The Catppuccin built-in icon package now contributes a named icon theme,
  giving the extension registry a real selectable icon-theme record instead of
  treating the package as only an anonymous SVG folder.
- Terminal output now has a high-volume websocket regression test that streams
  1,500 numbered lines through the PTY/session/client writer path and verifies
  that every marker arrives before the completion sentinel.
- `SingleEditor.tsx` is now under the 1K-line file limit. Find/search behavior
  moved into a dedicated editor hook, and first-editor performance marking
  moved into a small editor performance helper.
- The terminal agent CLI now has grouped support packages for config storage
  and terminal UI cursor/TTY helpers instead of keeping every helper in the
  top-level `agentcli` package.
- The built-in agent extension is explicitly identified as an agent extension,
  with named contributions for the Axon Agent sidebar and Axon Local Agent.
- The terminal CLI now has its first Charmbracelet-backed presentation layer:
  Lip Gloss owns the branded terminal styling, and Axon uses a lightweight
  inline startup animation that does not force quick commands into a full-screen
  terminal app. Bubble Tea is still planned for the full chat composer, but the
  current v2 dependency graph conflicts with the Lip Gloss-compatible transitive
  stack and is not shipped in this pass.
- Shared terminal prompt helpers moved into `agentcli/prompt`, while terminal
  presentation helpers live in `agentcli/terminalui`. The remaining Unix
  composer is still in `agentcli` because it depends on the active session,
  slash-command registry, model picker, and local stream lifecycle.
- `axon .` now queues CLI folder opens into a new managed Electron window when
  Axon is already running, instead of replacing the current editor session.
- The terminal built-in extension now advertises terminal activation events,
  command contributions, panel view contributions, and the default terminal
  profile as the registry-facing contract for future workbench activation.
- The terminal workbench implementation has moved under
  `extensions/builtin/terminal/workbench`, and `AxonAppView` resolves the active
  terminal panel/profile from the extension contribution registry before
  mounting that surface. The old workbench contrib folder no longer owns the
  terminal implementation.
- v1.2.6 shipped with macOS and Linux release assets only. The Windows package
  build failure was traced to Node's Windows npm shim handling inside the
  package-build helper, and the fix landed on `main` immediately after the
  release. The Windows installer asset is deferred to v1.2.7.
- Search and Settings now ship as built-in extension manifests, and Git,
  Problems, Testing, and Agent built-ins declare explicit command and view
  activation events. Workbench entry points route through those activation
  events before opening the existing React surfaces, so palette commands,
  toolbar actions, status-bar actions, and sidebar view changes share the same
  extension lifecycle path.
- Terminal PTY streaming now detaches renderer clients that fall too far behind
  the xterm acknowledgement cursor, protects their replay offset, and lets the
  terminal reconnect from the last painted byte. This prevents long-running
  agent output from being treated as delivered just because the websocket wrote
  faster than the terminal view could render.

## Work Still Being Built

These items are not marketing claims yet. They are the active work needed to
make Axon feel complete.

## Next Work

The next pass should focus on the parts that still affect daily editor feel and
the extension migration:

1. Complete interactive verification of the Extensions modal inside a running
   Electron window, including Installed, Downloads, reload, install, source
   links, modal scroll behavior, and stable height.
2. Continue wiring registry contributions into product surfaces so icon theme,
   terminal profile, language, agent, task, and view contributions are not only
   visible in the Extensions modal but also selectable or activatable where
   the workbench needs them.
3. Replace the temporary renderer static-asset mirror with a real extension
   asset protocol, so icon packages can be served directly from installed
   extension folders in development and packaged builds.
4. Add main-process timing around BrowserWindow ready, preload availability,
   and first terminal prompt so renderer marks can be matched with Electron and
   backend startup time.
5. Verify modal animation behavior in the running Electron app across Settings,
   Extensions, Open Folder, Git, tests, updates, workspace overview, trust
   prompts, and agent confirmations.
6. Keep splitting large editor and CLI surfaces where the boundaries are real,
   especially Monaco lifecycle, save/format handling, and terminal prompt UI.
7. Continue the terminal migration by routing terminal workbench commands and
   profile selection through the built-in extension registry, then move the raw
   agent composer behind explicit interfaces before replacing it with a fuller
   Charmbracelet chat surface.
8. Keep polishing theme-aware surfaces that still have fixed colors, especially
   trust prompts, source-control skeletons, extension status pills, and warning
   or destructive actions.

### Editor Architecture Work

Axon should stay maintainable as the feature set grows. Large files are allowed
only as migration points, not as the place where every new feature lands.

Current architecture rules:

- Keep new files under 1,000 lines.
- Split touched responsibilities out of oversized files when adding related
  work.
- Keep renderer UI state separate from backend file, Git, terminal, test, and
  AI operations.
- Prefer focused hooks and feature folders over adding unrelated state to
  `App.tsx`.
- Keep project-aware behavior explicit so Problems, Git, terminals, tests, and
  the agent can all understand workspace roots.

Important extraction areas:

- App command handling.
- Workspace/session restore.
- Panel orchestration.
- Agent conversation storage.
- Agent message rendering.
- Agent edit proposal validation.
- Runtime and model status UI.
- Diagnostics export and project-aware Problems state.

### Multi-Root Work

Multi-root is not just a workspace picker. It changes ownership for nearly
every feature.

The completed foundation should continue into:

- Project-aware Problems per root.
- Search and file navigation across roots.
- Git status and history per repository root.
- Terminals opening in the correct root.
- LSP sessions scoped to the right root.
- Test discovery and runs per root.
- Axon Agent context scoped to the selected root.

### Git Work

Axon already has status, diff, history, stashes, branches, worktrees, conflict
helpers, and commit graph pieces. The remaining work is to make those flows
feel mature enough that users do not leave the editor.

Active Git work:

- Better conflict editor.
- Safer stash flows.
- Cherry-pick and rebase flows.
- Richer worktree management.
- PR/GitHub review integration later.
- Better diff review ergonomics.

### Language Feature Work

Axon has the core language-server loop, but advanced editor quality depends on
polishing the deeper language surfaces.

Active language work:

- Semantic tokens.
- Inlay hints.
- Workspace symbols.
- Call hierarchy.
- Imports and refactors.
- Workspace edits across unopened files.
- Per-language settings.
- Better code action UI.
- More reliable TS/TSX diagnostics behavior.
- Continue hardening external-definition navigation so package symbols prefer
  opening source files when available instead of falling back to Monaco peek
  behavior.

### Testing Work

The Test Explorer exists, but the long-term goal is a complete testing
workflow:

- Test discovery per project root.
- Run all tests.
- Run one file or one test.
- Inline test result feedback.
- Jump directly to failing locations.
- Coverage UI.
- Debug individual tests later.

### Performance And Memory Work

Performance is an Axon feature. The editor should stay responsive while large
projects, LSPs, Git, file watchers, terminals, and the local agent are active.

Performance work should expose:

- Renderer memory estimate.
- Active Monaco model count.
- Open watcher count.
- Active language server processes.
- Git operation queue state.
- Test run process state.
- Startup timing marks.
- Local model/runtime warmup timing.

Current fast-first policy:

- Do not poll whole workspaces unless explicitly debugging watcher behavior.
- Keep native filesystem events responsive for files copied into the workspace
  from outside Axon.
- Do not start all language servers as part of opening a project.
- Do not run project diagnostics during workspace restore.
- Do not rerun project diagnostics for every file watcher burst.
- Collapse filesystem and Git watcher bursts before refreshing renderer state.

### Editor Surface Work

The editor surface is becoming more Axon-specific instead of only copying the
standard code editor layout.

Current editor surface work:

- Welcome opens as a real `Welcome to Axon` editor tab. It is part of the tab
  model, not a modal, so the workspace can restore it like any other editor
  surface.
- The welcome tab owns first-run actions, project actions, theme selection, and
  the Axon identity moment without blocking the rest of the shell.
- Markdown previews open as first-class tabs. Split preview remains available,
  but previewing a Markdown file can now live beside source files in the normal
  tab flow.
- The main Files, History, Source Control, and extension sidebar can dock on
  the left or right from Settings -> Appearance.
- Sidebar side is app-aware like the theme. When one workspace changes it, the
  next workspace inherits it instead of silently falling back to left.
- Axon Agent remains on the opposite side of the editor surface and is
  resizable, so moving the main sidebar does not collapse the agent workflow.
- The Electron boot window is reused as the real editor window, which removes
  the small extra window that could appear before the main app loaded.
- Built-in themes now flow through an Axon `SyntaxTheme` layer inspired by
  Zed's capture model. Themes describe semantic captures like function,
  function.method, property, type, tag, selector, punctuation, and string
  variants, then Axon expands those captures to Monaco token names.
- Syntax capture lookup falls back from specific child captures to parent
  captures, so a language can emit names like `function.method.call` or
  `string.special.symbol` without every theme needing to know that exact name.
- Terminal output now uses a non-blocking backend writer queue per renderer
  connection, so chatty long-running agents cannot block the PTY reader while
  the browser is slow or reconnecting.
- The terminal renderer now tracks bottom position, schedules explicit xterm
  refresh frames after drained output, and preserves small input bursts across
  websocket reconnects.
- Startup now has one real splash path instead of a React-owned fake overlay.
  The boot BrowserWindow waits until the splash document is loaded before it is
  shown, and the Axon image is embedded into that document as a data URL so the
  first visible frame does not depend on renderer asset loading.
- Ayu Dark, Ayu Light, and Ayu Mirage are now built-in themes using the Zed Ayu
  theme package values from the local `ayu.json` source. Interface colors,
  syntax tokens, Monaco editor colors, and terminal ANSI palettes are mapped
  through Axon's theme system.
- Object/key-value syntax aliases were expanded so JSON, YAML, TOML, CSS, and
  object-literal keys use the theme's property color. In Ayu this makes keys
  blue like the original theme instead of falling back to plain text.

This work matters because onboarding, previews, sidebar placement, and startup
are all part of the first impression. They should feel intentional before the
user even starts writing code.

### Agent Reliability Work

Local models need stronger guardrails than hosted instruction-following models.
Axon should defend the product experience globally instead of patching only one
bad answer at a time.

Current reliability work:

- Conversation history is carried through interactive terminal sessions.
- Conversation history is sent to the local model as real user/assistant turns,
  not flattened into the latest prompt, so resumed CLI sessions preserve
  follow-up context.
- Project context is attached when the current or recent prompt needs codebase
  awareness.
- The CLI attaches deterministic project tool context for workspace visibility,
  file tree, focused reads, search prompts, Git prompts, and current Problems
  before streaming a response. This keeps small local models from pretending
  they cannot see the codebase.
- `axon resume` can reopen workspace sessions through an interactive terminal
  picker. `axon resume :id` still opens a specific session directly.
- `axon fix` reads the current workspace Problems snapshot, sends exact
  diagnostics to the local agent, validates the returned edit proposal, and
  writes only inside the active workspace.
- The CLI composer supports prompt history and multiline cursor movement while
  keeping slash-command selection inside the same Axon-styled input surface.
- System prompts explicitly forbid fake placeholder facts.
- Attached project context repeats exact workspace root and file counts.
- Workspace visibility answers must use real attached context or clearly say
  that context is unavailable.
- Edit proposals are parsed separately from normal chat text and validated
  before any file write.

Future reliability work:

- Full LSP semantic-token transport for every language server that supports it,
  so the new `SyntaxTheme` layer receives parser/LSP-level captures instead of
  relying only on Monaco's built-in tokenizers.
- Better model-specific prompt profiles for small local coding models.
- A direct deterministic answer path for simple workspace inventory questions
  when the backend already has the facts.
- More tool-call forcing for questions that require file reads or search.
- Better trace output for debugging what context and tools the model saw.

- More reliable `axon fix` edit quality across languages.
- Diagnostics export that supports multiple open workspaces at once.
- CLI installer flow for adding `axon` to PATH from the packaged app.
- Startup performance measurements and regression tracking.
- Deeper visual identity work across tabs, file tree, terminal output, and
  agent responses.
- More complete workspace edit handling for LSP refactors and code actions.
- Better test provider coverage and coverage UI.
- Full Git review workflows including richer conflict and PR review surfaces.
