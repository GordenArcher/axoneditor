import type { BlogAuthor, BlogPost, BlogSection } from "./blog";

const architectureSeries = "Inside Axon's Architecture";

const gorden: BlogAuthor = {
  name: "Gorden Archer",
  role: "Creator of Axon",
  avatar: "https://github.com/GordenArcher.png?size=96",
  github: "https://github.com/GordenArcher",
};

function createArchitecturePost(
  post: Omit<BlogPost, "authors" | "publishedAt" | "updatedAt" | "series"> & {
    seriesOrder: number;
  },
): BlogPost {
  return {
    ...post,
    authors: [gorden],
    publishedAt: "2026-08-09",
    updatedAt: "2026-08-09",
    series: architectureSeries,
    sections: [
      ...post.sections,
      ...(architectureDeepDives[post.seriesOrder] ?? []),
      {
        kind: "links",
        title: "Continue exploring Axon",
        items: [
          {
            label: "Read the complete architecture series",
            href: "/blog",
            description:
              "Explore the buffer, terminal, workspace, language intelligence, security, and extension systems that make up Axon's current architecture.",
          },
          {
            label: "Read the Axon documentation",
            href: "https://axoneditor-docs.vercel.app",
            description:
              "Use the product documentation for installation, daily workflows, language tools, extension APIs, and release guidance.",
          },
          {
            label: "Inspect Axon on GitHub",
            href: "https://github.com/GordenArcher/axon",
            description:
              "Follow the implementation, tests, issues, and releases in the source repository.",
          },
        ],
      },
    ],
  };
}

const bufferSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "Opening a file looks like one action, but a desktop editor has to coordinate disk I/O, decoded text, model identity, undo history, selections, language services, split panes, and React's mount cycle. Axon's first implementation treated that flow too much like a page load: select a path, read the file, create a model, show the editor. It worked, but reopening a file could briefly reveal an empty Monaco model, split panes could compete over ownership, and switching through familiar files still paid work that had already been completed.",
  },
  {
    kind: "callout",
    tone: "info",
    title: "The responsibility split",
    body: "Monaco remains Axon's proven text engine and renderer. The Axon Buffer Engine owns file identity, model reuse, references, dirty state, metadata, and bounded retention. This gives Axon control over editor behavior without replacing Monaco's editing primitives.",
  },
  {
    kind: "heading",
    kicker: "The actual problem",
    title: "A tab is not a document",
  },
  {
    kind: "paragraph",
    body: "Tabs and panes are views. A document is the path-keyed text model beneath them. That distinction matters the moment the same file is opened in two panes: both views must observe the same edits, preserve one undo history, and avoid reading or decoding the same content twice. Axon therefore keys buffers by canonical file path and gives every pane a reference to the same Monaco model. Moving or duplicating a view changes references; it does not create another document identity.",
  },
  {
    kind: "mermaid",
    title: "One document model shared by several views",
    diagram: `flowchart LR
  Disk[(File on disk)] --> Cache[Main-process text cache]
  Cache --> Buffer[Axon path-keyed buffer]
  Buffer --> Model[Monaco text model]
  Model --> PaneA[Editor pane A]
  Model --> PaneB[Editor pane B]
  Model --> LSP[Language services]
  Model --> Git[Diff and gutter state]`,
  },
  {
    kind: "heading",
    kicker: "The fast path",
    title: "Reopening an existing model is synchronous",
  },
  {
    kind: "paragraph",
    body: "The most important optimization is not a faster spinner. It is avoiding the loading state. When a retained model already exists, acquireExistingModel returns it synchronously during mount. React can attach Monaco to the real document immediately while Axon revalidates disk metadata in the background. That prevents the visible one-line placeholder that makes an editor feel slow even when the underlying read only takes a few milliseconds.",
  },
  {
    kind: "code",
    language: "ts",
    filename: "buffer lifecycle, simplified",
    code: `const existing = buffers.get(filePath);
if (existing && !existing.model.isDisposed()) {
  cancelDisposal(filePath);
  existing.references += 1;
  touch(existing);
  return existing.model;
}

return createBuffer(filePath, content, 1).model;`,
  },
  {
    kind: "heading",
    kicker: "Memory discipline",
    title: "Fast cannot mean retain everything forever",
  },
  {
    kind: "paragraph",
    body: "Axon keeps clean, unreferenced models in a bounded least-recently-used pool. The current retained budget is 64 MB across at most 48 models, and a single retained model cannot exceed 32 MB. Memory is estimated conservatively from the model's text length. When either budget is exceeded, the least recently used clean model is disposed first. Dirty models are never selected as ordinary cache eviction candidates because unsaved text has a different correctness requirement from reproducible disk content.",
  },
  {
    kind: "timeline",
    items: [
      { label: "OPEN", title: "Acquire", body: "Reuse a live path-keyed model or create one from validated text, then increment its view reference count." },
      { label: "EDIT", title: "Protect dirty state", body: "Content changes update the memory estimate and mark the model dirty so normal cache trimming cannot discard unsaved work." },
      { label: "CLOSE", title: "Release", body: "Closing a pane decrements the reference count. A short 500 ms delay absorbs split-pane and remount races." },
      { label: "IDLE", title: "Retain or evict", body: "Clean normal-sized models stay available for fast reopen until count or memory pressure evicts the oldest entry." },
    ],
  },
  {
    kind: "heading",
    kicker: "Prefetch without waste",
    title: "Priming is useful only when it remains disposable",
  },
  {
    kind: "paragraph",
    body: "The file tree can prime a likely document before the user completes the open action, but a hover sweep must not fill memory with files that were never viewed. A primed model starts with zero editor references and remains immediately eligible for LRU trimming. This keeps predictive loading cheap: it improves the common next action while preserving a hard ceiling when the prediction is wrong.",
  },
  {
    kind: "heading",
    kicker: "Correctness under change",
    title: "The buffer does not get to overrule the filesystem",
  },
  {
    kind: "paragraph",
    body: "Retention is paired with invalidation. Watcher events, saves, agent edits, formatters, renames, and deletes can make a model stale. Axon updates clean live models when the disk version changes, preserves dirty buffers instead of silently overwriting them, refreshes language identity after path changes, and disposes entries that no longer represent valid files. A cache without this invalidation contract would trade visible delay for invisible data corruption.",
  },
  {
    kind: "callout",
    tone: "success",
    title: "What this architecture buys",
    body: "Normal close-and-reopen workflows become effectively immediate, split panes share edits by construction, undo history survives view changes, and memory remains bounded by explicit policy rather than garbage-collector luck.",
  },
];

const textCacheSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "The renderer-side buffer solves repeated model creation, but it cannot make the first disk read disappear. Axon also needs a process-wide cache in the Electron main process because every renderer window, pane, preview, or rapid reopen ultimately crosses the same filesystem boundary. The main-process text cache turns those requests into one validated read and shares the result across windows.",
  },
  {
    kind: "heading",
    kicker: "Why main process",
    title: "One cache can serve every Axon window",
  },
  {
    kind: "paragraph",
    body: "A renderer-local cache would duplicate decoded strings and still allow two windows to race through the same read. Axon's TextFileCache lives beside the filesystem handlers, uses canonical paths as keys, and maintains an in-flight promise map. If several consumers request the same uncached file together, they join one promise instead of issuing several stat, read, decode, and validation operations.",
  },
  {
    kind: "mermaid",
    title: "Cold read, joined read, and warm read",
    diagram: `sequenceDiagram
  participant A as Window A
  participant B as Window B
  participant C as TextFileCache
  participant D as Disk
  A->>C: read(path)
  C->>D: stat + read + stat
  B->>C: read(path)
  Note over B,C: joins the in-flight promise
  D-->>C: stable UTF-8 bytes
  C-->>A: decoded text
  C-->>B: same decoded text
  A->>C: read(path) again
  C-->>A: warm fingerprint hit`,
  },
  {
    kind: "heading",
    kicker: "Validation",
    title: "A cache hit requires a real file identity",
  },
  {
    kind: "paragraph",
    body: "Modification time and size are useful, but they are not a complete identity. Atomic saves can replace an inode, rapid writes can preserve size, and filesystem timestamp precision varies. Axon's fingerprint includes creation time, device, inode, modification time, and byte size. The cache re-stats before accepting an entry, so a path that now points to a replacement file cannot reuse text solely because two shallow metadata fields happen to match.",
  },
  {
    kind: "code",
    language: "ts",
    filename: "file fingerprint",
    code: `type FileFingerprint = {
  ctimeMs: number;
  dev: number;
  ino: number;
  mtimeMs: number;
  size: number;
};`,
  },
  {
    kind: "heading",
    kicker: "Concurrent writers",
    title: "Agents and formatters can replace a file during the read",
  },
  {
    kind: "paragraph",
    body: "Axon stats the file before reading and again after reading. It also records an invalidation generation for watcher events that arrive while the request is in flight. If the before and after fingerprints differ, or the watcher generation changed, the bytes are not published. The read retries up to three times and then returns a clear error that the file kept changing. Publishing a torn or obsolete version would be faster only in the narrow sense that returning the wrong answer is fast.",
  },
  {
    kind: "heading",
    kicker: "Text safety",
    title: "Binary and invalid UTF-8 files are rejected before Monaco",
  },
  {
    kind: "paragraph",
    body: "The read path samples the first 8 KB for null bytes and verifies suspicious UTF-8 replacement characters by round-tripping the decoded content. Binary input and invalid UTF-8 receive focused errors instead of being converted into a giant malformed JavaScript string and handed to the editor. The cache also rejects source files over 32 MB, which bounds the decoded memory cost before renderer work begins.",
  },
  {
    kind: "heading",
    kicker: "Bounded reuse",
    title: "The cache measures decoded memory, not only source bytes",
  },
  {
    kind: "paragraph",
    body: "V8 strings can use one-byte or two-byte storage, so source byte size alone can understate memory. Axon budgets each entry as the larger of source size and twice the JavaScript string length. The default cache holds at most 96 entries and 128 MB. Map insertion order implements LRU behavior: touching a hit moves it to the newest position, and trimming removes the oldest paths until both limits are satisfied.",
  },
  {
    kind: "timeline",
    items: [
      { label: "01", title: "Stat", body: "Capture a full fingerprint and reject non-files or files beyond the text limit." },
      { label: "02", title: "Reuse", body: "Return a fingerprint-matched cached string or join an existing request for the same path." },
      { label: "03", title: "Read safely", body: "Read bytes, stat again, and retry if metadata or watcher generation changed." },
      { label: "04", title: "Validate and retain", body: "Reject binary or invalid UTF-8 input, then store within entry and memory budgets." },
    ],
  },
  {
    kind: "callout",
    tone: "warning",
    title: "Caching is not permission",
    body: "Every request still passes Axon's workspace capability checks. A cached path is an optimization for an already-authorized read, never a way to bypass the security boundary.",
  },
];

const largeDocumentSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "A 223,000-line JSON file exposed an uncomfortable truth: opening bytes from disk was not the dominant cost. Axon could read the file, then freeze while Monaco tokenization, semantic services, decorations, minimap work, code lenses, folding, diagnostics, and React updates all treated the document like an ordinary source file. Large-document performance is therefore a policy problem, not one isolated slow function.",
  },
  {
    kind: "heading",
    kicker: "Detection",
    title: "Size alone does not identify an expensive document",
  },
  {
    kind: "paragraph",
    body: "Generated data can contain hundreds of thousands of short lines without reaching a dramatic byte count. Axon enters large-document mode at either 2 MiB of text or 20,000 lines. Line detection scans characters and stops as soon as the threshold is reached instead of calling split, which would allocate an enormous array precisely when the editor is trying to reduce pressure.",
  },
  {
    kind: "mermaid",
    title: "Adaptive document opening",
    diagram: `flowchart TD
  Open[Open validated text] --> Detect{At least 2 MiB or 20,000 lines?}
  Detect -- No --> Normal[Normal language mode]
  Normal --> Rich[Tokens + LSP + guides + minimap + decorations]
  Detect -- Yes --> Large[Axon large-document mode]
  Large --> Basic[Plain scalable editing]
  Basic --> Limited[Bounded find and deferred extras]
  Large --> Restore[Return to normal mode if content drops below threshold]`,
  },
  {
    kind: "heading",
    kicker: "Feature budgeting",
    title: "Every background feature multiplies the same document",
  },
  {
    kind: "paragraph",
    body: "A text model may be scanned by syntax tokenization, semantic tokens, completion word indexing, references, symbols, diagnostics, bracket pair colorization, indentation guides, Git diffing, minimap rendering, sticky scroll, occurrences, code actions, and custom decorations. Each subsystem can be reasonable on a 500-line file and disastrous when all of them wake up on 223,000 lines. Axon's policy moves large documents to a dedicated language identity and disables or bounds expensive providers before they enqueue work.",
  },
  {
    kind: "timeline",
    items: [
      { label: "KEEP", title: "Core editing", body: "Text rendering, cursor movement, selection, direct edits, save, and bounded search remain available." },
      { label: "DEFER", title: "Language enrichment", body: "LSP completions, semantic tokens, navigation, and other whole-document analysis do not run automatically." },
      { label: "REDUCE", title: "Visual computation", body: "Minimap, rich guides, expensive decorations, and similar repaint-heavy features are suppressed." },
      { label: "BOUND", title: "Search results", body: "Find is capped at 5,000 matches so a repeated character cannot create hundreds of thousands of decorations." },
    ],
  },
  {
    kind: "heading",
    kicker: "Keeping the renderer alive",
    title: "Chunking cannot fix synchronous editor work after the read",
  },
  {
    kind: "paragraph",
    body: "Streaming a file into Monaco sounds attractive, but Monaco text models still need a coherent document and many services react to model changes. Feeding thousands of chunks can create thousands of edit events and make the result worse. Axon instead performs a bounded, validated read in the main process, avoids duplicate reads through the cache, creates one model, and selects a reduced feature profile before expensive language and decoration pipelines subscribe.",
  },
  {
    kind: "heading",
    kicker: "Dynamic behavior",
    title: "Large-document mode follows the model, not only the file open",
  },
  {
    kind: "paragraph",
    body: "A generated file can shrink after formatting, while a normal file can grow after a paste or agent operation. The policy can be evaluated from the live model using value length and line count. Axon refreshes the model language when necessary, allowing the editor to enter or leave the reduced profile without encoding the decision permanently in the file extension.",
  },
  {
    kind: "heading",
    kicker: "Honest tradeoff",
    title: "Graceful degradation is a feature",
  },
  {
    kind: "paragraph",
    body: "The wrong promise is that every feature must remain active on every file. The useful promise is that opening pathological but valid text will not freeze the application or the laptop. Axon prioritizes reading, navigating, selecting, editing, and saving the document. Rich intelligence returns for normal files, where it can deliver value without taking control away from the user.",
  },
  {
    kind: "callout",
    tone: "success",
    title: "The governing rule",
    body: "Large-file mode is decided early and enforced across subsystems. No single provider gets to assume that a model is cheap merely because it received a model reference.",
  },
];

const ptyHostSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "A terminal process has a longer and more stateful life than the panel rendering it. Shells, test runners, build tools, and coding agents should not die because a React component remounted, a renderer reloaded, or one window lost its WebSocket. Axon's dedicated PTY host separates operating-system process ownership from Electron UI ownership so the terminal becomes infrastructure instead of a widget.",
  },
  {
    kind: "heading",
    kicker: "Process boundary",
    title: "Electron no longer has to own every terminal byte",
  },
  {
    kind: "paragraph",
    body: "The Axon core starts a separate axon-pty-host process on a loopback-only port. The host creates pseudoterminals, owns shell process groups, keeps replay data, accepts input and resize commands, and exposes health and session endpoints. Electron negotiates a short-lived access ticket and the renderer connects through an authenticated local WebSocket. This removes sustained PTY streaming from the Electron main process and isolates terminal failure from the workbench lifecycle.",
  },
  {
    kind: "mermaid",
    title: "Terminal process ownership",
    diagram: `flowchart LR
  UI[Axon renderer + xterm] <-->|authenticated WebSocket| Host[Dedicated PTY host]
  Main[Electron main process] -->|request short-lived ticket| Core[Axon core]
  Core -->|spawn and supervise| Host
  Host <-->|PTY bytes, input, resize| Shell[Shell or agent process]
  UI -->|control IPC| Main
  Main --> Core`,
  },
  {
    kind: "heading",
    kicker: "Security",
    title: "Localhost is transport, not authorization",
  },
  {
    kind: "paragraph",
    body: "Binding to 127.0.0.1 prevents remote network exposure, but any local process could still probe an unprotected port. Axon uses a core token for trusted process communication and replay-resistant terminal tickets for renderer attachment. Tickets are scoped, expire, and cannot be reused. The host validates session access before accepting a stream, and HTTP/WebSocket origin checks narrow who can initiate browser-facing requests.",
  },
  {
    kind: "heading",
    kicker: "Lifecycle",
    title: "The session survives view churn but not explicit termination",
  },
  {
    kind: "paragraph",
    body: "Closing or remounting a terminal view detaches a client; it does not automatically destroy the shell. The PTY host keeps the session and its replay window available for reconnection. Explicit terminal close, process exit, application shutdown policy, and stale-session cleanup are different lifecycle events with different intent. Keeping those states separate prevents a harmless UI transition from becoming an accidental kill signal.",
  },
  {
    kind: "timeline",
    items: [
      { label: "BOOT", title: "Host supervision", body: "Core starts the PTY service, injects authentication material, and verifies health before terminal work depends on it." },
      { label: "CREATE", title: "Session creation", body: "A workspace-scoped request creates the PTY with validated cwd, environment, shell, dimensions, and ownership metadata." },
      { label: "ATTACH", title: "View attachment", body: "A renderer exchanges a short-lived ticket for a WebSocket stream and requests replay from its acknowledged byte cursor." },
      { label: "DETACH", title: "View loss", body: "The host retains the PTY and bounded history so a fresh view can reconnect without pretending the shell restarted." },
      { label: "STOP", title: "Explicit termination", body: "Axon closes the PTY and process group only when session policy or the user actually requests termination." },
    ],
  },
  {
    kind: "heading",
    kicker: "Multiple windows",
    title: "Isolation is carried through session ownership",
  },
  {
    kind: "paragraph",
    body: "Two Axon windows can share one application process while representing different workspaces and permissions. Terminal session identifiers, access tickets, and renderer capability checks stop one window from casually attaching to another window's shell. The dedicated host centralizes PTY resources without flattening the security identity of its clients.",
  },
  {
    kind: "heading",
    kicker: "Why Go",
    title: "The host favors predictable streaming and process control",
  },
  {
    kind: "paragraph",
    body: "Axon's core and PTY host use Go for long-lived concurrency, bounded channels, WebSocket pumps, process supervision, and straightforward resource ownership. The renderer remains responsible for the visual terminal and interaction. The architecture is intentionally hybrid: native process work stays in the service designed for it, while xterm stays in the browser environment where it renders best.",
  },
  {
    kind: "callout",
    tone: "success",
    title: "The durable boundary",
    body: "The PTY host owns processes and replayable bytes. The renderer owns presentation and acknowledged commits. Electron coordinates capabilities, but it is no longer the only place where terminal continuity can survive.",
  },
];

const terminalDeliverySections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "The terminal eating bug was not ordinary scrollback truncation. Output could arrive from an agent, appear live, and then become impossible to find when the reader scrolled back. The hard part was that every layer looked locally reasonable: the PTY produced bytes, the WebSocket delivered them, xterm accepted writes, and the viewport moved. Reliability failed in the gaps between receipt, parsing, painting, acknowledgement, replay, and user scroll position.",
  },
  {
    kind: "callout",
    tone: "warning",
    title: "The invariant that matters",
    body: "Within the configured 200,000-line xterm scrollback, committed output must remain in byte order and remain reachable. Axon may bound retained history, but it must never silently skip bytes inside that retained window.",
  },
  {
    kind: "heading",
    kicker: "The original race",
    title: "Received is not the same as rendered",
  },
  {
    kind: "paragraph",
    body: "WebSocket message receipt only proves that JavaScript has the payload. xterm.write is asynchronous because xterm still has to parse control sequences, update its circular buffer, wrap lines, move the cursor, and schedule paint. If the renderer acknowledges bytes to the backend before xterm's callback commits them, a disconnect can make core discard the only replayable copy of bytes the terminal never incorporated. Axon now advances its durable cursor from the xterm completion callback, not from the WebSocket event.",
  },
  {
    kind: "mermaid",
    title: "Commit acknowledgement follows xterm, not the network",
    diagram: `sequenceDiagram
  participant P as PTY host
  participant W as WebSocket
  participant Q as Renderer queue
  participant X as xterm
  P->>W: bytes [offset 4096..8192]
  W->>Q: enqueue ordered chunk
  Q->>X: write bounded batch
  Note over X: parse ANSI, wrap lines, update buffer
  X-->>Q: write callback committed
  Q->>P: acknowledge offset 8192
  Note over P: replay may now trim before 8192`,
  },
  {
    kind: "heading",
    kicker: "Backpressure",
    title: "Bounded chunks prevent freezing without dropping output",
  },
  {
    kind: "paragraph",
    body: "The renderer batches terminal output into writes of at most 128 KiB and permits at most 512 KiB to be in flight, with four write batches issued per drain. These are scheduling limits, not history limits. When an agent emits more data, the unread bytes remain queued or replayable in the PTY host. The caps give the browser event loop opportunities to process input and paint while preserving exact order; they never authorize discarding the tail of a stream.",
  },
  {
    kind: "heading",
    kicker: "Reader stability",
    title: "Live output must not steal the viewport",
  },
  {
    kind: "paragraph",
    body: "Axon tracks whether the terminal is at the bottom and records the current scroll line. If the user is reading older output, incoming writes extend the buffer without forcing a scroll-to-bottom. The renderer restores the reader-relative viewport after xterm commits a batch, accounting for circular-buffer movement. If the user is already following live output, normal bottom-follow behavior remains. This is the distinction the bug report exposed: background production and active reading are separate states.",
  },
  {
    kind: "heading",
    kicker: "Reconnect",
    title: "Replay starts from the last committed byte",
  },
  {
    kind: "paragraph",
    body: "Every client carries a byte cursor. On reconnect, the renderer requests output beginning at its last xterm-acknowledged offset. Core protects replay ranges that active clients may still need and splits replay into bounded frames. If a slow or detached client accumulates too much pending transport data, the host can detach that view and let it reconnect from its committed cursor rather than allowing unbounded per-client memory or skipping ahead.",
  },
  {
    kind: "timeline",
    items: [
      { label: "READ", title: "PTY bytes become durable", body: "The host appends output to its replay window and advances the session's total byte count." },
      { label: "SEND", title: "Frames remain ordered", body: "Each client receives bounded WebSocket frames from its requested replay offset." },
      { label: "WRITE", title: "xterm receives bounded batches", body: "The renderer queues data, pipelines a limited amount, and never starts a later batch ahead of an earlier byte range." },
      { label: "COMMIT", title: "Acknowledgement becomes truthful", body: "Only xterm's completion callback advances the acknowledged cursor sent to core." },
      { label: "PAINT", title: "One frame-coalesced refresh", body: "Axon refreshes after committed writes without turning every small chunk into a full repaint." },
    ],
  },
  {
    kind: "heading",
    kicker: "Testing the real symptom",
    title: "Tests keep the reader in scrollback while output continues",
  },
  {
    kind: "paragraph",
    body: "Unit tests that only compare concatenated strings miss terminal behavior. Axon's terminal tests use a real xterm buffer, write numbered and ANSI-rich agent output, keep the viewport above the bottom, drain queued batches, and assert that every retained line remains reachable in order. Core tests separately verify byte-exact replay, bounded frame sizes, acknowledgement, queue overflow detachment, and replay protection.",
  },
  {
    kind: "callout",
    tone: "success",
    title: "Limits are not data loss",
    body: "A 128 KiB batch and 512 KiB in-flight window regulate work on the renderer thread. The 200,000-line scrollback controls visible history. Durable replay and committed acknowledgements ensure scheduling limits never become missing output.",
  },
];

const searchSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "Workspace search feels simple until a query crosses hundreds of thousands of files. The editor must ignore generated trees, stream useful matches early, stop obsolete work when the query changes, avoid blocking the UI, and refuse to leak results from a previous workspace. Axon treats search as a cancellable service operation with an explicit request lifetime rather than a promise that is allowed to run to completion after nobody wants its answer.",
  },
  {
    kind: "heading",
    kicker: "Request identity",
    title: "The newest query owns the result surface",
  },
  {
    kind: "paragraph",
    body: "Each search request receives an identifier and a cancellable context in the Go core. When the user types again, closes search, or changes workspaces, Axon cancels the prior request and invalidates its renderer generation. This handles cancellation at both ends: the backend stops filesystem work, and the UI refuses late batches from a stale generation even if they were already in transit.",
  },
  {
    kind: "mermaid",
    title: "Latest-query search lifecycle",
    diagram: `sequenceDiagram
  participant U as User
  participant R as Search UI
  participant C as Axon core
  participant F as Filesystem
  U->>R: type "buffer"
  R->>C: search request A
  C->>F: walk and scan
  U->>R: type "buffer engine"
  R->>C: cancel A
  R->>C: search request B
  C--xF: stop request A work
  C->>F: walk and scan for B
  C-->>R: result batches tagged B
  R-->>U: only B is rendered`,
  },
  {
    kind: "heading",
    kicker: "Streaming",
    title: "Useful matches should arrive before the walk ends",
  },
  {
    kind: "paragraph",
    body: "Waiting for a full result array makes latency equal to the slowest directory and creates a large allocation spike. Axon streams bounded result batches while the search is active. The renderer can display early matches, enforce its own maximum presentation count, and remain responsive. Batching also keeps IPC and reconciliation overhead lower than sending one event per line.",
  },
  {
    kind: "heading",
    kicker: "Traversal policy",
    title: "Search has to understand repository noise",
  },
  {
    kind: "paragraph",
    body: "Generated dependency and build trees can dominate search time while producing low-value matches. Axon applies known heavy-directory exclusions and workspace ignore rules before reading file contents. It validates paths, skips non-text candidates, and checks cancellation throughout traversal and scanning. The important property is not one perfect global ignore list; it is that ignored work is rejected before expensive reads and that the user can still control workspace behavior.",
  },
  {
    kind: "heading",
    kicker: "Ordering and limits",
    title: "A search result is a user interface budget",
  },
  {
    kind: "paragraph",
    body: "A query such as a closing brace can match nearly every source line. Returning all matches would spend memory, transport bandwidth, and rendering time on an unusable answer. Axon enforces result and file-size limits, reports truncation honestly, and keeps deterministic path and line metadata so clicking a match can reveal the correct file and location in the explorer.",
  },
  {
    kind: "timeline",
    items: [
      { label: "START", title: "Create a cancellable generation", body: "The UI and core agree on request identity before traversal begins." },
      { label: "WALK", title: "Prune early", body: "Ignored directories, unsafe paths, unsuitable files, and cancelled work are removed before content scanning." },
      { label: "MATCH", title: "Stream bounded batches", body: "Matches carry path, line, range, and preview data without waiting for the entire repository." },
      { label: "REPLACE", title: "Cancel stale work", body: "A newer query terminates backend work and invalidates any late renderer batch from the old generation." },
      { label: "OPEN", title: "Reveal context", body: "Selecting a result expands the real folder chain, activates the file, and jumps to the exact range." },
    ],
  },
  {
    kind: "callout",
    tone: "info",
    title: "Responsiveness is end-to-end",
    body: "Debouncing input without backend cancellation still wastes CPU. Backend cancellation without renderer generations can still paint stale results. Axon needs both halves for search to feel immediate and correct.",
  },
];

const watcherSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "An editor is not the only writer in a workspace. Git operations, build systems, formatters, terminals, coding agents, package managers, and other editors all change disk state. If Axon only refreshes after its own commands, the file tree, open model, Git status, and language server drift apart. The watcher architecture exists to turn external disk mutation into targeted, ordered editor state changes.",
  },
  {
    kind: "heading",
    kicker: "Two observation paths",
    title: "Native events provide speed and Chokidar provides coverage",
  },
  {
    kind: "paragraph",
    body: "Axon combines a native recursive workspace watcher with Chokidar-based coverage and narrower Git discovery. Native events can report newly written files immediately while a JavaScript watcher is still discovering a deep tree. Chokidar supplies cross-platform event normalization and explicit add, change, unlink, addDir, and unlinkDir handling. Polling remains an opt-in diagnostic fallback because permanent polling would spend battery and I/O to hide architecture mistakes.",
  },
  {
    kind: "mermaid",
    title: "A disk change fans out through targeted refresh paths",
    diagram: `flowchart LR
  Writer[Agent, terminal, Git, or external editor] --> Disk[(Workspace disk)]
  Disk --> Native[Native recursive watcher]
  Disk --> Chokidar[Chokidar workspace watcher]
  Disk --> GitWatch[Narrow Git metadata watcher]
  Native --> Normalize[Normalize and deduplicate]
  Chokidar --> Normalize
  GitWatch --> Normalize
  Normalize --> Tree[Refresh affected folder]
  Normalize --> Model[Reload clean open model]
  Normalize --> Status[Refresh Git status]
  Normalize --> LSP[Send watched-file change]`,
  },
  {
    kind: "heading",
    kicker: "Incremental tree updates",
    title: "Refreshing the root for every event does not scale",
  },
  {
    kind: "paragraph",
    body: "File-tree nodes own loaded children only for expanded folders. When a deep watcher event arrives, Axon identifies the affected parent, refreshes that branch, and merges the result into the authoritative tree. Closed subtrees remain lazy. This prevents one generated file from forcing a complete recursive directory read and preserves expansion state, selection, and scroll position.",
  },
  {
    kind: "heading",
    kicker: "Git initialization",
    title: "The watcher must notice when .git did not exist at startup",
  },
  {
    kind: "paragraph",
    body: "A repository can become a Git repository after Axon opens it. Running git init creates .git, but a watcher configured only for paths discovered at startup will never subscribe to metadata that did not exist. Axon watches the workspace for .git creation, reruns Git path discovery, installs the narrow metadata watcher, and emits a Git refresh. The reverse transition is handled too, so removing or relocating metadata does not leave stale source-control state behind.",
  },
  {
    kind: "heading",
    kicker: "Multiple windows",
    title: "Shared roots still need renderer-specific ownership",
  },
  {
    kind: "paragraph",
    body: "Workspace watchers can be shared for efficiency when multiple windows observe the same root, but active-file subscriptions and delivery targets remain per renderer. Reference counting prevents one window from closing the underlying watcher while another still needs it. Renderer teardown removes only that window's subscriptions and capabilities, avoiding both leaked watchers and the earlier bug where the second window never received changes.",
  },
  {
    kind: "heading",
    kicker: "Burst control",
    title: "Atomic saves produce event storms, not one clean event",
  },
  {
    kind: "paragraph",
    body: "Many tools save by writing a temporary file, renaming it, updating metadata, and deleting the old inode. Axon normalizes and batches bursts, then uses latest-task coordination so obsolete refreshes cannot commit after a newer one. File content cache invalidation happens before reload, and dirty models are protected from blind replacement. This ordering is what keeps the tree, Git paint, and open editor from disagreeing after an agent writes quickly.",
  },
  {
    kind: "timeline",
    items: [
      { label: "EVENT", title: "Observe", body: "Receive native, Chokidar, file-specific, or Git metadata notification with renderer ownership intact." },
      { label: "COALESCE", title: "Normalize", body: "Collapse equivalent paths and event bursts without losing add, remove, or directory semantics." },
      { label: "INVALIDATE", title: "Expire stale caches", body: "Invalidate text, tree, and Git assumptions before asking any layer to reload." },
      { label: "REFRESH", title: "Update the narrowest state", body: "Refresh the affected branch, clean model, Git status, and LSP watcher notification." },
      { label: "RESYNC", title: "Recover", body: "Watcher-ready and error recovery paths perform a bounded resync so missed startup events do not remain stale forever." },
    ],
  },
  {
    kind: "callout",
    tone: "success",
    title: "The target behavior",
    body: "A file created by an agent should appear without opening Source Control, a Git repository initialized in the terminal should activate automatically, and a second Axon window should receive the same disk truth without owning duplicate recursive scans.",
  },
];

const languageToolsSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "Bundling every language server would make Axon larger for every user, even when most users need only a few languages. Requiring users to manually install and configure every server would make language intelligence fragile. Axon's managed language-tool platform takes the middle path: lightweight language recognition and syntax support can ship with the editor, while heavy analyzers are detected, offered, downloaded, verified, installed, updated, cancelled, and launched on demand.",
  },
  {
    kind: "heading",
    kicker: "Catalog, not conditionals",
    title: "Each tool is a declarative platform recipe",
  },
  {
    kind: "paragraph",
    body: "The language-tool catalog describes language IDs, executable probes, platform and architecture assets, trusted download hosts, checksums, archive type, launch paths, environment requirements, and user-facing status. The manager runs a generic lifecycle around those recipes. Adding Swift, Ruby, Dart, SQL, TOML, Zig, Terraform, LaTeX, Scala, Clojure, Haskell, Erlang, R, PowerShell, Assembly, or Makefile support should extend data and adapters rather than duplicate a bespoke downloader for every language.",
  },
  {
    kind: "mermaid",
    title: "Managed tool installation transaction",
    diagram: `flowchart TD
  Detect[Workspace language detected] --> Probe{Usable tool already present?}
  Probe -- Yes --> Start[Start language server]
  Probe -- No --> Offer[Persistent install action]
  Offer --> Download[Download to partial file]
  Download --> Verify[Verify host, size, and checksum]
  Verify --> Stage[Extract into unique staging directory]
  Stage --> Validate[Locate executable and probe version]
  Validate --> Activate[Atomically replace installed version]
  Activate --> Refresh[Refresh status and start server]
  Download -. cancel/failure .-> Clean[Remove partial and staging data]
  Stage -. cancel/failure .-> Clean`,
  },
  {
    kind: "heading",
    kicker: "Download integrity",
    title: "A progress bar is not proof of a valid tool",
  },
  {
    kind: "paragraph",
    body: "Axon follows only trusted redirects, checks declared and observed size, writes into a partial location, and verifies the expected checksum before extraction. The installer never treats 100 percent network progress as completion because verification, extraction, executable discovery, and activation are separate phases. UI state carries the active phase and processed byte count so leaving a source file does not make an installation disappear.",
  },
  {
    kind: "heading",
    kicker: "Archive safety",
    title: "Extraction is treated as untrusted input handling",
  },
  {
    kind: "paragraph",
    body: "ZIP and tar entries are validated against path traversal, absolute paths, unsafe links, excessive entry counts, and expanded-size limits before activation. On macOS, validated ZIP archives can use the native ditto extractor for large clangd packages because a JavaScript extractor can appear inactive while doing CPU-heavy work. Cancellation terminates the native child process before staging cleanup, preventing an extractor from continuing to write into a directory that the manager is deleting.",
  },
  {
    kind: "heading",
    kicker: "Transactional activation",
    title: "The live installation is replaced only after validation",
  },
  {
    kind: "paragraph",
    body: "Downloads and extraction happen in unique staging paths. Axon validates the expected executable and runs a lightweight probe before moving the staged result into the managed install location. A failed update leaves the previous working version available. This avoids the common half-installed state where a directory exists, detection says installed, and launch fails because extraction stopped before the binary arrived.",
  },
  {
    kind: "heading",
    kicker: "Cancellation and recovery",
    title: "Cancel must stop work, not only hide the UI",
  },
  {
    kind: "paragraph",
    body: "Each install has one AbortController owned by the manager. Network streams, activity watchdogs, archive extraction, and validation all receive the same signal. Cancellation remains available from the persistent bottom activity surface even when the initiating file closes. The manager emits a terminal cancelled state, removes partial and staging artifacts, clears its active-operation record, and allows a clean retry. Multiple language installations use separate operation identities and can progress in parallel.",
  },
  {
    kind: "timeline",
    items: [
      { label: "DETECT", title: "Recognize language immediately", body: "Basic tokens and file identity work before the heavy analyzer is present." },
      { label: "PROBE", title: "Prefer an existing usable tool", body: "Axon checks managed installs and compatible system executables before offering a download." },
      { label: "INSTALL", title: "Run one observable transaction", body: "Download, checksum, extraction, validation, and atomic activation report distinct progress phases." },
      { label: "RECOVER", title: "Clean every incomplete path", body: "Failure and cancellation terminate child work and remove only the operation's partial artifacts." },
      { label: "START", title: "Refresh intelligence automatically", body: "Successful activation invalidates tool status and asks the LSP lifecycle to start without reopening the workspace." },
    ],
  },
  {
    kind: "callout",
    tone: "info",
    title: "Small application, broad language reach",
    body: "The editor can recognize many languages without embedding every analyzer. Users pay the download and disk cost only for the tools their workspaces actually need, while Go and selected lightweight npm-backed services can remain bundled by product policy.",
  },
];

const lspLifecycleSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "Installing a language server is only the beginning. The editor still has to choose the right executable, start one server for the correct workspace, complete initialize, replay documents that opened during startup, refresh status, recover from crashes, and stop cleanly when ownership disappears. Most language-server bugs live in this lifecycle rather than in completion or hover rendering.",
  },
  {
    kind: "heading",
    kicker: "State machine",
    title: "Starting and running are different states",
  },
  {
    kind: "paragraph",
    body: "Axon exposes explicit unavailable, installing, starting, running, failed, and stopped states. A spawned process is not running until the JSON-RPC connection completes initialize and receives its initialized notification. This distinction prevents the UI from claiming that intelligence is ready while the server is still indexing, waiting for project configuration, or about to fail its handshake.",
  },
  {
    kind: "mermaid",
    title: "Language server lifecycle",
    diagram: `stateDiagram-v2
  [*] --> Unavailable: no usable tool
  Unavailable --> Installing: user accepts tool
  Installing --> Starting: install validated
  Stopped --> Starting: language document opens
  Starting --> Running: initialize completed
  Starting --> Failed: spawn or initialize error
  Running --> Failed: process exits or transport fails
  Failed --> Starting: refresh or bounded retry
  Running --> Stopped: workspace or ownership closes
  Installing --> Unavailable: cancel or install failure`,
  },
  {
    kind: "heading",
    kicker: "Single flight",
    title: "Several files must not spawn several servers",
  },
  {
    kind: "paragraph",
    body: "Opening several Java or TypeScript files during startup can trigger the same language need from panes, hover, completion, diagnostics, and workspace effects. Axon's lifecycle keeps one in-flight start promise per workspace and language service. Later callers join that promise. This removes duplicate processes, competing initialize requests, and the status flicker caused when one startup succeeds while another duplicate fails.",
  },
  {
    kind: "heading",
    kicker: "Document synchronization",
    title: "Files opened during startup are queued, not forgotten",
  },
  {
    kind: "paragraph",
    body: "A document can be visible before its server is ready. Axon records pending open and change synchronization while startup is in flight, then flushes the latest document versions after initialize completes. The queue is version-aware so a stale intermediate change is not replayed after newer content. That is why closing one Java file and opening another should not strand the language server in a permanent Loading state.",
  },
  {
    kind: "heading",
    kicker: "Workspace configuration",
    title: "Project discovery belongs to the server's root",
  },
  {
    kind: "paragraph",
    body: "The lifecycle resolves a workspace root, project markers, language-specific initialization options, executable environment, and watched configuration files before starting. Changes to tsconfig, pyproject, go.mod, build files, or language settings are batched because atomic saves often create several watcher events. Axon can notify, restart, or reconfigure the relevant service without restarting unrelated languages.",
  },
  {
    kind: "heading",
    kicker: "Slow analyzers",
    title: "Startup deadlines must match real server behavior",
  },
  {
    kind: "paragraph",
    body: "JVM language servers can spend meaningful time loading a workspace after process spawn. A universal short timeout turns healthy startup into false failure and encourages repeated process launches. Axon uses language-aware initialization windows, including a longer 15-second allowance for JVM-backed services, while still surfacing progress and preserving cancellation. A deadline is a failure boundary, not a substitute for status.",
  },
  {
    kind: "timeline",
    items: [
      { label: "RESOLVE", title: "Resolve tool and workspace", body: "Choose a managed or system executable, root, environment, command, and language-specific initialization contract." },
      { label: "SPAWN", title: "Start once", body: "Create one process and JSON-RPC transport while all concurrent consumers join the same promise." },
      { label: "INIT", title: "Negotiate capabilities", body: "Send initialize, validate the response, publish initialized, and register dynamic capabilities." },
      { label: "SYNC", title: "Flush current documents", body: "Open the latest version of every queued document and discard obsolete intermediate updates." },
      { label: "RUN", title: "Route intelligence", body: "Completions, hover, symbols, diagnostics, semantic tokens, and navigation use the live workspace service." },
      { label: "RECOVER", title: "Fail visibly and retry deliberately", body: "Process exit clears stale state, records a useful error, and permits refresh or bounded restart." },
    ],
  },
  {
    kind: "callout",
    tone: "success",
    title: "Automatic means lifecycle-complete",
    body: "After a managed tool installs, Axon must refresh detection, start the server, finish initialization, synchronize the open document, and update UI status. Requiring a window restart would mean the installation pipeline ended too early.",
  },
];

const pythonSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "Python import resolution depends on the interpreter environment, not merely the presence of a python command. A language server launched against the wrong interpreter can parse syntax perfectly while reporting every project dependency as missing. Axon's Python discovery architecture therefore treats environment selection as workspace state and searches for evidence of real environments rather than relying only on familiar directory names.",
  },
  {
    kind: "heading",
    kicker: "Evidence over naming",
    title: "A virtual environment can be called anything",
  },
  {
    kind: "paragraph",
    body: "Names such as .venv, venv, env, or un_venv are conventions, not guarantees. Axon identifies a virtual environment by pyvenv.cfg and then resolves the platform-specific interpreter beneath it. The workspace scan uses a bounded breadth-first traversal with depth, directory, and concurrency limits, allowing arbitrary names without recursively walking node_modules, Git objects, build output, or an entire home directory.",
  },
  {
    kind: "mermaid",
    title: "Python interpreter resolution order",
    diagram: `flowchart TD
  Start[Python file opens] --> Saved{Saved workspace selection valid?}
  Saved -- Yes --> Use[Use and probe interpreter]
  Saved -- No --> Active{VIRTUAL_ENV or CONDA_PREFIX valid?}
  Active -- Yes --> Use
  Active -- No --> Local[Bounded workspace scan for pyvenv.cfg]
  Local --> Found{Unique strong candidate?}
  Found -- Yes --> Use
  Found -- No --> Parent[Search up to three parent levels and manager metadata]
  Parent --> Managers[Probe uv, Poetry, Pipenv, pyenv, and Conda]
  Managers --> System[Fall back to usable system Python]
  Use --> Persist[Persist workspace interpreter]
  Persist --> LSP[Launch Python language service with environment]`,
  },
  {
    kind: "heading",
    kicker: "Monorepos",
    title: "The environment may live above the opened folder",
  },
  {
    kind: "paragraph",
    body: "Developers often open services/core while keeping a shared environment beside that service or at the monorepo root. Axon searches up to three parent levels under strict boundaries and evaluates nearby environment evidence. It does not blindly claim the first interpreter found: a unique strong candidate can be selected automatically, while ambiguous candidates remain visible for explicit choice.",
  },
  {
    kind: "heading",
    kicker: "Environment managers",
    title: "Modern Python projects describe environments in several ways",
  },
  {
    kind: "paragraph",
    body: "The resolver understands active VIRTUAL_ENV and CONDA_PREFIX state, local pyvenv.cfg environments, and manager-provided environments from uv, Poetry, Pipenv, pyenv, and Conda. Manager probes are bounded and cancellable because invoking a package manager during every keystroke would be worse than missing it. Results are cached per workspace and invalidated by relevant configuration or environment changes.",
  },
  {
    kind: "heading",
    kicker: "Runtime proof",
    title: "An interpreter path must actually execute",
  },
  {
    kind: "paragraph",
    body: "Directory shape alone can describe a copied, deleted, incompatible, or partially created environment. Before persisting a selection, Axon runs a lightweight interpreter probe to confirm the executable works and to capture normalized runtime details. Invalid saved paths are removed from active use rather than leaving the language server stuck behind a path that exists only in settings.",
  },
  {
    kind: "heading",
    kicker: "Settings UX",
    title: "Show Python environment controls only when Python is relevant",
  },
  {
    kind: "paragraph",
    body: "Workspace language detection drives the language status surface. A Python environment control appears when the workspace contains Python or an active Python service needs attention. The control shows the resolved environment path as well as the interpreter executable, because those answer different questions: where project packages live, and which binary the analyzer launches. Manual selection remains available when automatic evidence is ambiguous.",
  },
  {
    kind: "timeline",
    items: [
      { label: "DISCOVER", title: "Collect bounded candidates", body: "Use active environment variables, pyvenv.cfg evidence, parent roots, manager metadata, and system executables." },
      { label: "RANK", title: "Prefer workspace relevance", body: "Favor valid local or explicitly active candidates while keeping ambiguous choices visible." },
      { label: "PROBE", title: "Verify the runtime", body: "Execute a lightweight command and reject stale or incompatible interpreter paths." },
      { label: "PERSIST", title: "Scope the choice", body: "Store interpreter state by workspace instead of applying one global Python to unrelated projects." },
      { label: "LAUNCH", title: "Feed the language service", body: "Start analysis with the selected interpreter and environment so imports resolve against real project packages." },
    ],
  },
  {
    kind: "callout",
    tone: "info",
    title: "Automatic discovery must remain explainable",
    body: "Axon can select a unique strong environment automatically, but settings still show what was selected and allow correction. Invisible guessing is not a good developer-tool interface.",
  },
];

const capabilitySections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "Electron's renderer displays untrusted workspace text and runs a large browser-facing UI. It should not receive unrestricted filesystem authority simply because the user opened one folder. Axon's capability architecture grants each renderer access to explicit workspace roots and individually authorized external files, then requires main-process handlers to prove every read or write against that renderer's grants.",
  },
  {
    kind: "heading",
    kicker: "Per-window authority",
    title: "A capability belongs to the renderer that received it",
  },
  {
    kind: "paragraph",
    body: "The main process keys root and file grants by Electron renderer ID. Opening a folder authorizes its canonical root for that window. A second window receives its own grant set even if it opens the same path. When a renderer closes, Axon deletes its roots and external-file grants. This makes multi-window behavior explicit and prevents one surviving renderer from inheriting permissions that belonged to another.",
  },
  {
    kind: "mermaid",
    title: "Capability-checked filesystem access",
    diagram: `sequenceDiagram
  participant U as User action
  participant R as Renderer window 42
  participant P as Preload API
  participant M as Electron main
  participant C as Capability store
  participant F as Filesystem
  U->>R: open /workspace/src/app.ts
  R->>P: readTextFile(path)
  P->>M: IPC with sender identity
  M->>C: assertReadablePath(42, path)
  C-->>M: root capability confirmed
  M->>F: validated read
  F-->>R: text
  Note over M,C: a request from renderer 77 is checked against renderer 77's grants`,
  },
  {
    kind: "heading",
    kicker: "Canonical paths",
    title: "String prefixes are not a security boundary",
  },
  {
    kind: "paragraph",
    body: "A naive startsWith check can confuse /project with /project-backup, mishandle separators, or permit traversal. Axon resolves and normalizes candidate paths, compares real root relationships, and uses platform-aware path semantics. Symlink and external-file behavior is handled through explicit authorization rather than broadening a root until the error disappears.",
  },
  {
    kind: "heading",
    kicker: "Files outside the root",
    title: "External documents are capabilities, not accidental workspaces",
  },
  {
    kind: "paragraph",
    body: "Dragging a file into an empty editor pane or following an LSP definition can open a file outside the active folder. Axon grants that exact path as read-only or writable according to the user action. The file can receive a Monaco model and language intelligence without granting recursive access to its parent directory. Dropping onto the sidebar remains a different explicit operation that copies or moves content into the workspace.",
  },
  {
    kind: "heading",
    kicker: "IPC ownership",
    title: "The sender identity must survive every handler",
  },
  {
    kind: "paragraph",
    body: "Security checks are performed in the main process using the IPC event's sender, not a renderer-provided window number. Filesystem reads, writes, directory operations, watchers, Git commands, LSP external-file authorization, previews, and terminal working directories all need the same ownership model. A handler that validates only the path but forgets the sender would reopen the cross-window hole the capability system exists to close.",
  },
  {
    kind: "timeline",
    items: [
      { label: "GRANT", title: "User intent creates authority", body: "Folder selection, file selection, clone completion, or trusted language navigation grants a canonical root or exact file." },
      { label: "CHECK", title: "Every privileged handler validates", body: "Main-process code derives renderer identity from IPC and asserts readable or writable scope." },
      { label: "NARROW", title: "External files remain exact", body: "Opening one dependency file does not authorize browsing or modifying its entire parent tree." },
      { label: "SHARE", title: "Resources can be efficient without sharing authority", body: "Caches and watchers may reuse underlying work while delivery and permission checks remain renderer-specific." },
      { label: "REVOKE", title: "Renderer teardown releases grants", body: "Closing a window removes roots, exact-file permissions, subscriptions, and related ownership state." },
    ],
  },
  {
    kind: "callout",
    tone: "warning",
    title: "Convenience cannot erase the boundary",
    body: "When an authorized workflow fails, the fix is to grant the correct root or exact file at the point of user intent. Disabling checks or authorizing a broad parent directory would hide the symptom by weakening the application.",
  },
];

const extensionSections: BlogSection[] = [
  {
    kind: "paragraph",
    body: "An editor becomes difficult to evolve when every panel, language, theme, command, preview, debugger, and tool is hardwired into one application component. Axon's extension-oriented workbench moves product capabilities behind declarative manifests, contribution registries, activation events, and a public extension API. Built-in features use the same vocabulary that third-party extensions can use, even while trusted built-ins retain carefully scoped implementation privileges.",
  },
  {
    kind: "heading",
    kicker: "Manifest first",
    title: "Contribution metadata is the source of discoverability",
  },
  {
    kind: "paragraph",
    body: "An axon.extension.json manifest identifies the extension, activation events, and declarative contributions. Themes, icon themes, languages, snippets, commands, views, agents, terminal profiles, task providers, debugger providers, workspace index providers, and language packs enter one normalized registry. The settings picker and workbench read that registry, which is why adding a theme manifest and JSON theme contribution makes the theme appear without editing a hardcoded renderer list.",
  },
  {
    kind: "mermaid",
    title: "From extension package to visible workbench feature",
    diagram: `flowchart LR
  Package[Extension folder] --> Manifest[axon.extension.json]
  Manifest --> Discovery[Bundled, workspace, and user discovery]
  Discovery --> Normalize[Manifest validation and normalization]
  Normalize --> Registry[Contribution registry]
  Registry --> Commands[Commands]
  Registry --> Views[Panels and views]
  Registry --> Themes[Themes and icons]
  Registry --> Languages[Languages and language packs]
  Registry --> Tools[Tasks, debuggers, agents, terminal profiles]
  Events[Activation events] --> Runtime[Extension runtime host]
  Runtime --> API[Public Axon extension API]
  API --> Registry`,
  },
  {
    kind: "heading",
    kicker: "Discovery layers",
    title: "Bundled, workspace, and user extensions share one state model",
  },
  {
    kind: "paragraph",
    body: "The extension host discovers bundled packages shipped with Axon, workspace extensions used during development, and user-installed extensions. It normalizes manifests, reads disabled state, records errors without taking down unrelated packages, and produces one renderer-facing snapshot. Discovery timings are measured so a large extension set cannot become invisible startup cost.",
  },
  {
    kind: "heading",
    kicker: "Lazy activation",
    title: "Installed does not mean running at startup",
  },
  {
    kind: "paragraph",
    body: "Activation events such as onLanguage, onCommand, onFileSystem, and onStartup describe when runtime code is needed. A TypeScript language contribution can remain dormant until a TypeScript or JavaScript document opens; the code-snapshot feature can activate when its command runs. Declarative contributions remain visible before activation, allowing menus and settings to exist without eagerly executing every extension.",
  },
  {
    kind: "heading",
    kicker: "Workbench boundaries",
    title: "The shell consumes contributions instead of importing every feature",
  },
  {
    kind: "paragraph",
    body: "Terminal, search, agent, problems, debugger, tasks, preview, and snapshot features live in focused built-in extension directories with workbench contribution adapters. The application shell asks the registry whether the expected view, command, provider, or profile exists before mounting it. This reduces the pressure that previously made AxonAppView and other central components accumulate unrelated functions and HTML.",
  },
  {
    kind: "heading",
    kicker: "API versus privilege",
    title: "Extensions should depend on stable contracts, not Axon source paths",
  },
  {
    kind: "paragraph",
    body: "The @axon/extension-api package defines public manifest and contribution contracts. Runtime extensions communicate through supported APIs rather than importing renderer internals or hardcoded monorepo aliases. Trusted built-in workbench adapters may integrate more deeply, but that privilege is explicit. This separation prevents an extension project from needing Axon's source tsconfig merely to resolve types and makes ordinary external monorepos behave consistently in the editor.",
  },
  {
    kind: "timeline",
    items: [
      { label: "DISCOVER", title: "Find packages", body: "Scan bundled, workspace, and user locations under explicit extension-root policy." },
      { label: "VALIDATE", title: "Normalize manifests", body: "Reject malformed identity or contribution data while preserving useful errors per extension." },
      { label: "REGISTER", title: "Build one contribution index", body: "Expose commands, views, themes, languages, snippets, agents, profiles, tasks, debuggers, and index providers." },
      { label: "ACTIVATE", title: "Run only when needed", body: "Match startup, command, language, or filesystem events and start the appropriate runtime host." },
      { label: "CONSUME", title: "Compose the workbench", body: "Focused shell adapters render registered capabilities without embedding each implementation in the app root." },
      { label: "MANAGE", title: "Install, disable, and inspect", body: "The extension surface reports contribution counts, kind, state, errors, and available actions from the same normalized model." },
    ],
  },
  {
    kind: "callout",
    tone: "success",
    title: "Built-in does not mean hardcoded",
    body: "A feature may ship with Axon and still be extension-driven. Built-in describes distribution and trust; the manifest, registry, activation, and contribution contracts describe architecture.",
  },
];

const architectureDeepDives: Record<number, BlogSection[]> = {
  1: [
    { kind: "heading", kicker: "Save semantics", title: "The model and disk versions meet at an explicit commit point" },
    { kind: "paragraph", body: "Editing changes the in-memory model immediately and marks its buffer dirty. Saving captures the model's current version, sends the exact text through the authorized write path, records the completed write in the main-process text cache, and only clears dirty state if the model has not changed again while the write was in flight. Without that version check, typing during a slow save could make Axon label newer unsaved text as saved. Watcher echoes from Axon's own write are then reconciled against the clean model instead of triggering a destructive second update." },
    { kind: "heading", kicker: "Model identity", title: "Renames and moves are more than changing a tab label" },
    { kind: "paragraph", body: "Monaco model URIs participate in language services, diagnostics, undo history, and provider caches. A file move therefore has to migrate Axon's path-keyed ownership and notify the systems that identify the document by URI. The old path must stop resolving, the new path must carry metadata and dirty state, and split panes must converge on one destination model. Treating a move as close-old/open-new is simpler, but it can throw away view state and briefly duplicate diagnostics." },
    { kind: "heading", kicker: "Failure modes", title: "Reference counts are useful only when every exit path releases" },
    { kind: "paragraph", body: "Pane closure, tab movement, editor replacement, preview conversion, window teardown, and React error recovery can all end a model reference. Axon centralizes acquisition and release so those paths do not invent their own disposal policy. A leaked reference prevents LRU eviction and slowly raises memory use; an early release can dispose the model beneath another pane. Tests cover shared acquisition, delayed release, dirty protection, oversized-model disposal, LRU order, and listener cleanup because the dangerous regressions appear after repeated navigation rather than on the first open." },
    { kind: "callout", tone: "info", title: "Buffer Engine invariant", body: "For each canonical path there is at most one live Axon-owned Monaco model, every visible editor contributes one reference, and no dirty model is discarded by cache pressure." },
  ],
  2: [
    { kind: "heading", kicker: "Invalidation matrix", title: "Every filesystem mutation has to expire the right amount" },
    { kind: "paragraph", body: "A file change invalidates one entry. A directory rename or deletion invalidates every cached descendant. A successful Axon write can record the new content and fingerprint immediately, avoiding an unnecessary cold read on the next open. Workspace closure can release broader state without affecting another open root. These distinctions matter because clearing the entire cache on every watcher event would be correct but slow, while invalidating only exact paths would leave moved descendants stale." },
    { kind: "heading", kicker: "Multi-window pressure", title: "Sharing strings is valuable, but renderer models remain independent" },
    { kind: "paragraph", body: "The main process returns one decoded value to concurrent callers, but IPC serialization still delivers content to each renderer and each renderer maintains its own Monaco model graph. Axon does not pretend that the cache eliminates all copies. Its job is to eliminate repeated disk work and stabilize the version being distributed. Renderer-side buffer budgets then control the more expensive model and token structures inside each window." },
    { kind: "heading", kicker: "Failure behavior", title: "Errors are short, stable, and tied to the user action" },
    { kind: "paragraph", body: "Permission failures, missing paths, oversized text, binary data, invalid UTF-8, and constantly changing files are distinct conditions. Main-process handlers convert low-level exceptions into focused messages instead of exposing the entire Electron remote-invocation wrapper. A failed read never populates the cache. An in-flight promise is removed in finally, which is essential: retaining a rejected promise would make every future open fail instantly even after the underlying file was repaired." },
    { kind: "heading", kicker: "Verification", title: "Cache tests deliberately replace files without changing their size" },
    { kind: "paragraph", body: "Happy-path tests are not enough because stale caches usually pass when a write changes size or timestamp clearly. Axon's tests replace content with equal-length text, invalidate while a read is active, join concurrent requests, exceed entry and byte budgets, reject binary samples, and mutate directory trees. These cases prove that the fingerprint and generation design is carrying correctness rather than accidentally succeeding on simple fixture writes." },
  ],
  3: [
    { kind: "heading", kicker: "Threshold reasoning", title: "The policy starts conservative and remains measurable" },
    { kind: "paragraph", body: "Two MiB and 20,000 lines are product thresholds, not claims that every file below them is cheap or every file above them is impossible. They identify the point where broad language and decoration work starts becoming risky on typical hardware. Keeping the values in one shared module lets tests, renderer features, and LSP adapters agree. Future telemetry and reproducible benchmarks can tune them without searching through scattered components for hidden cutoffs." },
    { kind: "heading", kicker: "Repaint pressure", title: "Responsiveness depends on reducing subscriptions as well as computation" },
    { kind: "paragraph", body: "A feature can be cheap once and still be expensive when it subscribes to every content change. Large-document mode prevents providers from repeatedly rescanning after typing, save, external reload, or Git refresh. Decorations are especially sensitive because replacing thousands of ranges can force layout and paint even when analysis happened off-thread. Axon removes the source of those updates instead of merely debouncing a renderer that will eventually perform the same excessive work." },
    { kind: "heading", kicker: "User expectations", title: "The mode must be visible without becoming an interruption" },
    { kind: "paragraph", body: "Axon can communicate reduced intelligence through the language status surface and editor state rather than a blocking modal. The user should still be able to inspect the file immediately. Features that are unavailable need consistent disabled behavior rather than endless loading indicators. Search truncation, for example, is reported as a bounded result rather than appearing to freeze while the editor attempts to decorate every match." },
    { kind: "heading", kicker: "Regression suite", title: "The test file has to resemble the failure" },
    { kind: "paragraph", body: "Tests cover both character and line thresholds, including many short lines that would evade a byte-only policy. Editor integration tests assert that semantic tokens, completions, and navigation refuse large models before calling a server. Performance validation uses generated JSON and text with enough lines to trigger Monaco's expensive paths, then verifies opening, scrolling, find limits, and save behavior rather than measuring only the filesystem read." },
  ],
  4: [
    { kind: "heading", kicker: "Supervision", title: "A separate process creates a new failure mode that must be owned" },
    { kind: "paragraph", body: "If the PTY host fails to bind, crashes, or becomes unhealthy, Axon must not leave terminal tabs in a permanent connecting state. Core supervision captures startup errors, exposes health, and terminates dependent startup cleanly. The renderer receives a concise unavailable state and can retry after the host recovers. On application shutdown, supervision closes listeners and process groups in an order that does not strand child shells or keep the app alive invisibly." },
    { kind: "heading", kicker: "Process groups", title: "Stopping a terminal has to stop the work it launched" },
    { kind: "paragraph", body: "A shell can launch test runners, compilers, language REPLs, and agent subprocesses. Killing only the immediate shell PID may orphan descendants that continue consuming CPU or holding ports. The PTY layer uses operating-system process-group semantics where available and has platform-specific behavior for termination. Resize operations are also validated and serialized through the host because terminal dimensions affect process output and must remain ordered with session lifecycle." },
    { kind: "heading", kicker: "Resource accounting", title: "Detached does not mean immortal" },
    { kind: "paragraph", body: "Reconnect support intentionally preserves sessions through temporary view loss, but abandoned sessions cannot accumulate forever. The host records attachment state, last activity, process exit, replay bytes, pending client bytes, and protection ranges. Cleanup policy can distinguish a live detached agent from a completed stale shell. Health snapshots make that distinction inspectable instead of relying on a single terminal count." },
    { kind: "heading", kicker: "Protocol tests", title: "Security and lifecycle are tested at the socket boundary" },
    { kind: "paragraph", body: "PTY host tests create real HTTP and WebSocket requests, reject missing or replayed tickets, verify loopback-facing authorization, exercise session creation and deletion, and inspect replay behavior after detach. These tests sit below React so a renderer refactor cannot accidentally become the only proof that process ownership works." },
  ],
  5: [
    { kind: "heading", kicker: "Two different histories", title: "Core replay bytes and xterm scrollback solve different problems" },
    { kind: "paragraph", body: "Core stores a bounded byte window so a disconnected client can reconstruct the stream from a known offset. xterm stores parsed terminal lines so a connected user can scroll through visible history. Byte history includes control sequences that may not occupy lines, while a single line can be produced by many byte writes and cursor movements. Axon never converts the 200,000-line UI promise into an equivalent byte guess; each layer retains the unit required by its own correctness contract." },
    { kind: "heading", kicker: "UTF-8 boundaries", title: "A WebSocket frame can end in the middle of a character" },
    { kind: "paragraph", body: "Replay cursors count real bytes, while JavaScript strings count UTF-16 code units. Terminal output can include multibyte paths, symbols, and localized tool messages. Axon preserves binary payloads where possible and uses streaming decoding for split multibyte sequences. Acknowledgement advances by the original UTF-8 byte length, not string length, so reconnect starts at an exact protocol boundary instead of duplicating or dropping the tail of a character." },
    { kind: "heading", kicker: "ANSI behavior", title: "The terminal stream is a program, not an append-only paragraph" },
    { kind: "paragraph", body: "Carriage returns, cursor movement, alternate screens, progress bars, erase commands, and bracketed paste all mutate terminal state. Concatenating visible strings cannot prove correctness because two byte streams can render the same snapshot while producing different scrollback. This is why Axon preserves raw byte order and lets xterm parse it once. Reconnect replays the protocol stream from a committed cursor rather than attempting to serialize xterm's rendered DOM." },
    { kind: "heading", kicker: "Operational diagnosis", title: "Health counters expose where a slow stream is waiting" },
    { kind: "paragraph", body: "Sessions track queued bytes, peak queue size, in-flight writes, commit latency, drained chunks, reconnect count, close codes, and acknowledgement position. Core tracks per-client pending bytes, detached clients, replay protection, total output, and retained history. These counters separate a slow PTY producer from a congested WebSocket, a blocked renderer, or an expensive xterm commit. Without that separation every symptom looks like the same vague terminal lag." },
  ],
  6: [
    { kind: "heading", kicker: "Content safety", title: "Search does not get broader filesystem access than the workspace" },
    { kind: "paragraph", body: "The renderer cannot submit an arbitrary root and ask core to scan it. Electron validates the workspace capability before proxying the request, and core resolves paths beneath that root. Result paths are normalized before returning to the UI. This matters because search touches many files at once; a path-validation mistake here would have a much larger disclosure surface than one failed editor read." },
    { kind: "heading", kicker: "Cancellation granularity", title: "Context checks have to sit inside the expensive loops" },
    { kind: "paragraph", body: "Cancelling only between directories still allows one large file to monopolize a request. Axon's search path checks context during traversal, before reads, and while processing candidate content. Channels and batch sends also select on cancellation so a backend cannot remain blocked trying to deliver results to a renderer that has already moved on. Cleanup always unregisters the active request ID, allowing a later query to reuse the surface cleanly." },
    { kind: "heading", kicker: "Result stability", title: "Navigation metadata is produced with the match" },
    { kind: "paragraph", body: "Each result carries a normalized file path, one-based line context, exact range, and preview text. The UI does not re-search the file after click, which could land on a different occurrence if an agent edited the file between query and navigation. The editor still validates the current model and adjusts gracefully when the range is no longer valid, but the original result remains a precise statement about the searched version." },
    { kind: "heading", kicker: "Testing", title: "Race tests intentionally let an old query finish late" },
    { kind: "paragraph", body: "The critical renderer test starts request A, starts request B before A resolves, then resolves A last. Only B may update visible results. Core tests cancel during traversal and delivery, verify ignored directories are not scanned, enforce match limits, and ensure active request maps are cleaned after success, error, and cancellation. These are the cases that protect typing responsiveness under real repository load." },
  ],
  7: [
    { kind: "heading", kicker: "Ignore policy", title: "Ignoring heavy trees cannot hide their parent events" },
    { kind: "paragraph", body: "Axon ignores contents such as node_modules, .git internals, build output, caches, and virtual environments for broad recursive work, but it still observes enough parent structure to notice meaningful creation and deletion. Git needs a dedicated narrow watcher because globally ignoring .git contents while expecting source-control refreshes is contradictory. The policy distinguishes workspace tree visibility, Git metadata, active-file updates, and language-server watched files instead of forcing one ignore predicate onto every consumer." },
    { kind: "heading", kicker: "Dirty-file protection", title: "An external change cannot silently replace unsaved editor text" },
    { kind: "paragraph", body: "When a watched path changes, Axon first asks whether its live buffer is dirty. Clean models can reload the validated disk version directly. Dirty models retain user content and surface the conflict path rather than calling setValue with external text. This is especially important when an agent and the user edit the same file: immediate watchers improve freshness only if they do not turn concurrency into silent data loss." },
    { kind: "heading", kicker: "Feedback loops", title: "Axon's own writes still generate watcher events" },
    { kind: "paragraph", body: "Save, rename, create, delete, and move operations update workbench state optimistically, then the operating system reports the same mutation. The refresh coordinator treats those events as confirmation and revalidation, not a second user action. Idempotent tree merges, cache fingerprints, and latest-generation tasks prevent duplicate tabs, repeated Git scans, or old folder snapshots from winning after the direct operation already completed." },
    { kind: "heading", kicker: "Resilience", title: "Ready and error events trigger bounded resynchronization" },
    { kind: "paragraph", body: "Watcher startup is itself asynchronous, so files can change between the initial tree read and the watcher's ready event. Axon performs a targeted resync once coverage becomes ready. If native or Chokidar observation fails, the editor reports the failure and can rebuild watcher state rather than remaining silently stale. Tests simulate startup gaps, event bursts, new .git directories, multiple renderer references, native fallback, and teardown ordering." },
  ],
  8: [
    { kind: "heading", kicker: "Persistent state", title: "Installation progress belongs to the tool manager, not the current file" },
    { kind: "paragraph", body: "The file that triggered an offer can close while a 150 MB archive is downloading or extracting. If progress state lived in that editor component, the UI would vanish and cancellation would lose its controller. Axon stores active operations in the main-process manager and broadcasts snapshots to a persistent bottom activity surface. Any matching language view can observe the same operation, and several independent installs can appear together without merging their progress or cancellation." },
    { kind: "heading", kicker: "Progress semantics", title: "One percentage cannot represent every phase honestly" },
    { kind: "paragraph", body: "Network download has a total byte count when the server provides one. Checksum verification and extraction may have processed-byte counters but no trustworthy percentage, especially for compressed archives whose expanded size is not known in advance. Axon labels phases such as downloading, verifying, extracting, validating, and activating instead of resetting a misleading bar to zero after it reaches 100 percent. A watchdog observes real activity, not just percentage changes." },
    { kind: "heading", kicker: "Platform variance", title: "The same language can require different assets and launch adapters" },
    { kind: "paragraph", body: "Tool releases vary by operating system, CPU architecture, archive layout, executable suffix, runtime dependency, and command arguments. The catalog resolves an exact supported asset and refuses unsupported combinations before downloading. Launch adapters can inject a JDK, Node runtime, dotnet host, or environment variables when the server requires them. Keeping those differences declarative makes support reviewable and testable rather than hiding platform branches throughout the LSP service." },
    { kind: "heading", kicker: "Recovery tests", title: "Every phase is interrupted on purpose" },
    { kind: "paragraph", body: "Manager tests cancel during download, abort an activity watchdog, fail checksum verification, reject unsafe archive paths, and verify staging cleanup. Archive tests enforce entry and expanded-byte limits. Integration checks ensure a previous installation survives a failed replacement and that a successful activation invalidates status so the language server can start immediately. The installer is complete only when interruption leaves a deterministic next attempt." },
  ],
  9: [
    { kind: "heading", kicker: "Transport ownership", title: "JSON-RPC messages need ordering and disposal guarantees" },
    { kind: "paragraph", body: "Language servers communicate over stdio using framed JSON-RPC. Axon owns request IDs, pending-response promises, notification routing, cancellation, and process stderr capture. Shutdown rejects unresolved requests with one terminal cause and removes listeners before killing the process. Without that cleanup, a restart can leave old callbacks receiving new diagnostics or make completion promises wait forever on a transport that no longer exists." },
    { kind: "heading", kicker: "Feature isolation", title: "One slow provider must not block ordinary editing" },
    { kind: "paragraph", body: "Completion, hover, symbols, navigation, semantic tokens, formatting, and diagnostics have different latency and cancellation behavior. Renderer adapters issue cancellable requests and verify that the model version and cursor context still match before applying a response. Large-document policy can reject expensive features before IPC. The editor model remains usable even if the server is starting, indexing, unavailable, or failed; intelligence enriches editing but does not own it." },
    { kind: "heading", kicker: "External definitions", title: "Navigation can cross the workspace without expanding its authority" },
    { kind: "paragraph", body: "A server may return a definition in a package cache, SDK, generated directory, or standard library outside the open root. Main process validates that the location came from the trusted language-server response and grants the requesting renderer access to that exact file. Axon can then open a read-only model with normal syntax and hover support while preserving the workspace capability boundary described later in the series." },
    { kind: "heading", kicker: "Observability", title: "Spawn, initialize, and feature failures must remain distinguishable" },
    { kind: "paragraph", body: "Axon logs spawn success, initialization success, process exit, stderr summaries, and actionable failure state by language and workspace. The bolt language surface shows what is detected, installed, starting, running, or unavailable. This prevents a missing executable, invalid project root, initialize timeout, and one failed hover request from collapsing into the same endless Loading label." },
  ],
  10: [
    { kind: "heading", kicker: "Candidate ranking", title: "Nearest is useful, but nearest alone is not enough" },
    { kind: "paragraph", body: "A monorepo can contain several service environments and a root tooling environment. Axon ranks candidates using workspace containment, distance, explicit activation, manager association, saved selection, and runtime validity. It auto-selects only when the evidence produces one strong choice. When two sibling environments are equally plausible, the language surface asks rather than silently choosing whichever directory enumeration returned first." },
    { kind: "heading", kicker: "Search bounds", title: "Arbitrary names do not require arbitrary recursion" },
    { kind: "paragraph", body: "The workspace scanner uses breadth-first traversal so nearby environments are found before deep incidental ones. It caps traversal depth at four levels, inspects at most 800 directories, and limits filesystem concurrency to 32 operations. Known dependency, cache, VCS, and build directories are pruned. Parent discovery is separately capped at three levels. These controls make name-independent discovery predictable on large repositories." },
    { kind: "heading", kicker: "Import resolution", title: "The selected path has to reach the analyzer's configuration" },
    { kind: "paragraph", body: "Showing an interpreter in settings is not sufficient. Axon passes the resolved executable and environment information into Python language-server initialization and workspace configuration, then restarts or reconfigures the service when the selection changes. Open documents are resynchronized after restart. This closes the gap where the UI displayed the right virtual environment but diagnostics continued using the system interpreter." },
    { kind: "heading", kicker: "Lifecycle tests", title: "Discovery fixtures use deliberately unusual environment names" },
    { kind: "paragraph", body: "Tests create valid environments under arbitrary names, place them above and beside opened roots, provide stale saved paths, simulate active environment variables, and create decoy folders without pyvenv.cfg. They verify bounded traversal, uniqueness rules, interpreter probing, and workspace scoping. The unusual names are important because a test suite containing only .venv would accidentally validate hardcoding instead of discovery." },
  ],
  11: [
    { kind: "heading", kicker: "Read versus write", title: "External access is intentionally split by operation" },
    { kind: "paragraph", body: "A definition file supplied by an LSP normally needs read-only access. A file explicitly selected through the operating-system dialog can be writable. Axon stores those grants separately, upgrades an exact file only through a writable user action, and checks the stronger permission for save, rename, delete, or move. This avoids turning every dependency navigation into permission to modify SDK or package-cache content." },
    { kind: "heading", kicker: "User-facing errors", title: "Security failures should explain the missing grant, not expose IPC plumbing" },
    { kind: "paragraph", body: "The main process may throw while an Electron invoke wrapper adds method names and stack text. Axon's renderer extracts the stable cause and presents a concise message such as the file being outside the active workspace. The workflow can then offer the correct folder or file selection path. Clear errors are part of security because developers are less likely to weaken checks when the authorization model tells them exactly what action is required." },
    { kind: "heading", kicker: "Shared services", title: "Optimization state cannot become authorization state" },
    { kind: "paragraph", body: "The text cache may already contain a path because another window read it, and a watcher may already observe a root because another renderer opened it. Neither fact grants access. Each request rechecks the sender's capabilities before consulting shared data, and events are delivered only to subscribed authorized renderers. This separation lets Axon reduce duplicate work without creating a confused-deputy path across windows." },
    { kind: "heading", kicker: "Security tests", title: "The negative cases define the boundary" },
    { kind: "paragraph", body: "Tests authorize one root, attempt sibling-prefix escapes, traverse with dot segments, access files through the wrong renderer, upgrade read-only files, release renderers, and verify that exact external grants do not authorize parents. Handler tests derive ownership from fake IPC senders and confirm watcher sharing does not merge capabilities. These failures are more valuable than a single successful workspace read because they prove where authority stops." },
  ],
  12: [
    { kind: "heading", kicker: "Contribution conflicts", title: "Normalization makes collisions visible and deterministic" },
    { kind: "paragraph", body: "Two extensions can contribute the same command, language ID, view, or theme identifier. The registry retains extension ownership for every contribution and applies deterministic conflict rules instead of letting import order silently choose a winner. Errors are attached to the responsible extension and surfaced in management UI. Built-ins are not allowed to bypass identity rules merely because they ship with the app." },
    { kind: "heading", kicker: "Runtime isolation", title: "Extension code should fail without taking down the workbench" },
    { kind: "paragraph", body: "Manifest discovery is separated from runtime activation, and runtime work is hosted behind a service boundary. Activation errors, missing entry points, and rejected API calls update extension state while unrelated contributions remain available. Disposable registrations are collected and released on disable, reload, workspace change, or host shutdown. This lifecycle prevents a failed optional extension from leaving commands and listeners half-registered." },
    { kind: "heading", kicker: "Performance", title: "A registry makes startup cost inspectable" },
    { kind: "paragraph", body: "Axon records timing for disabled-state reads, bundled discovery, workspace discovery, user discovery, manifest parsing, registry assembly, and runtime activation. Declarative contributions can be rendered from data without importing feature code. Language and command activation keep heavy modules off the startup path until needed. These measurements matter as the built-in registry grows beyond fifty manifests and user extensions add unknown work." },
    { kind: "heading", kicker: "Developer contract", title: "Examples and schemas are part of the architecture" },
    { kind: "paragraph", body: "The public extension package, JSON schema, typed manifest definitions, and root examples describe the supported surface. Extension authors should receive completion and validation in an ordinary external project without extending Axon's own source tsconfig. Keeping examples aligned with the registry is not documentation cleanup; it is how the architecture prevents private imports from becoming accidental public API." },
    { kind: "heading", kicker: "Direction", title: "The workbench can become more modular without becoming fragmented" },
    { kind: "paragraph", body: "Not every internal React component needs to become a marketplace extension. The useful boundary is where a capability can declare identity, activation, contribution, and lifecycle through a stable contract. Axon can keep cohesive internal libraries for editor mechanics while moving product features into focused contribution packages. The goal is understandable ownership and replaceable surfaces, not abstraction for its own sake." },
  ],
};

export const architectureBlogPosts: BlogPost[] = [
  createArchitecturePost({
    seriesOrder: 1,
    slug: "axon-buffer-engine-path-keyed-models",
    title: "Inside the Axon Buffer Engine",
    animatedTitles: ["Inside the Axon Buffer Engine", "A Tab Is Not a Document", "Fast Reopen Without Unbounded Memory"],
    excerpt: "How Axon separates document identity from editor views, reuses Monaco models synchronously, protects dirty state, and keeps memory under explicit limits.",
    readingTime: "24 min read",
    tags: ["Architecture", "Performance", "Monaco", "Buffers"],
    coverImage: "/media/screenshots/captures/axon-capture-19.png",
    conclusion: "The Buffer Engine makes file identity an Axon concern and editing mechanics a Monaco concern. That boundary gives panes one shared source of truth, makes familiar files appear immediately, preserves unsaved work, and keeps retained memory bounded. It is the foundation for every later file-loading optimization because it removes duplicated document ownership before trying to make I/O faster.",
    sections: bufferSections,
  }),
  createArchitecturePost({
    seriesOrder: 2,
    slug: "main-process-text-cache-fast-safe-file-reads",
    title: "The Main-Process Text Cache Behind Fast File Opens",
    animatedTitles: ["The Main-Process Text Cache Behind Fast File Opens", "One Validated Read Across Every Window", "Caching Without Serving Stale Files"],
    excerpt: "A detailed look at Axon's process-wide file cache, in-flight request joining, fingerprint validation, UTF-8 safety, and bounded LRU policy.",
    readingTime: "22 min read",
    tags: ["Architecture", "Filesystem", "Caching", "Performance"],
    coverImage: "/media/screenshots/captures/axon-capture-61.png",
    conclusion: "Axon's text cache is intentionally more than a map from path to string. It combines shared in-flight work, strong fingerprints, watcher generations, before-and-after validation, text safety, and conservative memory accounting. Warm reads become fast because the cache can prove what it is returning, not because it ignores changes on disk.",
    sections: textCacheSections,
  }),
  createArchitecturePost({
    seriesOrder: 3,
    slug: "adaptive-large-document-architecture",
    title: "How Axon Stays Responsive on Huge Files",
    animatedTitles: ["How Axon Stays Responsive on Huge Files", "The 223,000-Line JSON Test", "Large Documents Need a Different Feature Budget"],
    excerpt: "Why huge-file performance requires an editor-wide policy, how Axon detects expensive models, and which features are reduced to preserve control.",
    readingTime: "21 min read",
    tags: ["Architecture", "Large Files", "Performance", "Monaco"],
    coverImage: "/media/screenshots/captures/axon-capture-34.png",
    conclusion: "Large-document mode accepts that rich analysis has a cost and spends the budget on the actions users need first: open, navigate, edit, search, and save. By detecting size and line pressure early, then applying one shared policy across language and visual services, Axon avoids the freeze caused by dozens of individually reasonable features all analyzing the same enormous model.",
    sections: largeDocumentSections,
  }),
  createArchitecturePost({
    seriesOrder: 4,
    slug: "dedicated-pty-host-terminal-process-architecture",
    title: "Why Axon Moved Terminals Into a Dedicated PTY Host",
    animatedTitles: ["Why Axon Moved Terminals Into a Dedicated PTY Host", "A Terminal Process Is Bigger Than Its Panel", "Separating Shell Lifetime From Renderer Lifetime"],
    excerpt: "The process, security, and lifecycle architecture that keeps shells and agent sessions independent from Electron renderer churn.",
    readingTime: "25 min read",
    tags: ["Architecture", "Terminal", "PTY", "Security"],
    coverImage: "/media/screenshots/captures/axon-capture-08.png",
    conclusion: "A dedicated PTY host gives terminal sessions an owner whose lifetime and responsibilities match the shell. Authenticated attachment, explicit session lifecycle, bounded replay, and renderer-independent process control provide a stronger base than tying every terminal to Electron UI state. This process boundary is what makes the reliable delivery pipeline in the next article possible.",
    sections: ptyHostSections,
  }),
  createArchitecturePost({
    seriesOrder: 5,
    slug: "reliable-terminal-delivery-byte-acknowledgements",
    title: "Fixing Terminal Output Loss With Committed Byte Acknowledgements",
    animatedTitles: ["Fixing Terminal Output Loss With Committed Byte Acknowledgements", "Received Bytes Are Not Rendered Bytes", "How Axon Preserves Output While You Read Scrollback"],
    excerpt: "The complete terminal delivery pipeline: durable replay, bounded writes, xterm commit callbacks, viewport stability, reconnect cursors, and real-buffer tests.",
    readingTime: "29 min read",
    tags: ["Architecture", "Terminal", "Reliability", "Backpressure"],
    coverImage: "/media/screenshots/captures/axon-capture-52.png",
    conclusion: "Axon's terminal pipeline now treats output delivery as a committed-byte protocol. Core retains replayable bytes, the renderer schedules bounded ordered work, xterm decides when a byte range is truly committed, and acknowledgements advance only after that point. The design preserves reader position without confusing scheduling limits with data limits, which is the central requirement behind fixing output that previously appeared to be eaten.",
    sections: terminalDeliverySections,
  }),
  createArchitecturePost({
    seriesOrder: 6,
    slug: "cancellable-workspace-search-architecture",
    title: "Building Workspace Search That Cancels Old Work",
    animatedTitles: ["Building Workspace Search That Cancels Old Work", "The Newest Query Owns the Search UI", "Streaming Results Without Blocking the Editor"],
    excerpt: "How Axon combines cancellable Go contexts, renderer generations, early pruning, bounded batches, and precise file reveal behavior.",
    readingTime: "20 min read",
    tags: ["Architecture", "Search", "Concurrency", "Performance"],
    coverImage: "/media/screenshots/captures/axon-capture-37.png",
    conclusion: "Fast search is not only a fast scanner. It is a contract that obsolete work stops, early matches can stream, pathological queries remain bounded, and stale responses cannot overwrite the latest query. Axon's paired backend cancellation and renderer generations make that contract explicit across the process boundary.",
    sections: searchSections,
  }),
  createArchitecturePost({
    seriesOrder: 7,
    slug: "incremental-workspace-watchers-external-changes",
    title: "How Axon Keeps Workspace State Fresh",
    animatedTitles: ["How Axon Keeps Workspace State Fresh", "Watching Agents, Git, and External Editors", "Incremental Refresh Across Multiple Windows"],
    excerpt: "A deep look at native and Chokidar watchers, targeted tree refresh, Git initialization discovery, cache invalidation, and multi-window ownership.",
    readingTime: "26 min read",
    tags: ["Architecture", "Filesystem", "Watchers", "Git"],
    coverImage: "/media/screenshots/captures/axon-capture-52.png",
    conclusion: "The workspace watcher is Axon's disk-consistency layer. Combining immediate native events, normalized Chokidar coverage, dynamic Git discovery, targeted tree refresh, cache invalidation, and renderer-aware ownership lets external changes become visible without manual source-control refreshes or full workspace reloads.",
    sections: watcherSections,
  }),
  createArchitecturePost({
    seriesOrder: 8,
    slug: "managed-language-tools-on-demand-installation",
    title: "The Architecture of Axon's On-Demand Language Tools",
    animatedTitles: ["The Architecture of Axon's On-Demand Language Tools", "Broad Language Support Without Bundling Everything", "Safe Downloads, Atomic Installs, and Real Cancellation"],
    excerpt: "How Axon detects languages, offers missing analyzers, verifies archives, installs transactionally, reports persistent progress, and recovers from cancellation.",
    readingTime: "28 min read",
    tags: ["Architecture", "Language Tools", "LSP", "Security"],
    coverImage: "/media/screenshots/captures/axon-capture-26.png",
    conclusion: "Managed language tools separate recognition from heavyweight intelligence. Axon can understand that a file is Swift, Java, C++, or Erlang immediately, then install the appropriate analyzer through a secure, observable, cancellable transaction. The result is a smaller baseline application without turning language setup into manual configuration work.",
    sections: languageToolsSections,
  }),
  createArchitecturePost({
    seriesOrder: 9,
    slug: "language-server-lifecycle-from-install-to-intelligence",
    title: "From Installed Tool to Working Language Intelligence",
    animatedTitles: ["From Installed Tool to Working Language Intelligence", "Spawned Is Not the Same as Ready", "The State Machine Behind Hover and Completion"],
    excerpt: "How Axon resolves, starts, initializes, synchronizes, monitors, and recovers language servers across real workspace lifecycles.",
    readingTime: "25 min read",
    tags: ["Architecture", "LSP", "Language Intelligence", "Lifecycle"],
    coverImage: "/media/screenshots/captures/axon-capture-58.png",
    conclusion: "Reliable language intelligence requires a lifecycle that remains honest from tool resolution through process shutdown. Axon's explicit states, single-flight startup, queued document synchronization, workspace-aware configuration, useful deadlines, and recoverable failures prevent the familiar situation where a server process exists but hover and completion never become ready.",
    sections: lspLifecycleSections,
  }),
  createArchitecturePost({
    seriesOrder: 10,
    slug: "project-aware-python-environment-discovery",
    title: "How Axon Finds the Right Python Environment",
    animatedTitles: ["How Axon Finds the Right Python Environment", "Virtual Environments Can Be Named Anything", "Project-Aware Imports Without Manual Path Guessing"],
    excerpt: "A detailed tour of pyvenv.cfg discovery, parent-root search, environment managers, runtime probing, workspace persistence, and LSP launch.",
    readingTime: "24 min read",
    tags: ["Architecture", "Python", "Environments", "LSP"],
    coverImage: "/media/screenshots/captures/axon-capture-25.png",
    conclusion: "Axon resolves Python by evidence: workspace relevance, pyvenv.cfg, active environment state, manager metadata, and a successful interpreter probe. Bounded search supports arbitrary environment names and monorepo layouts without crawling the machine, while workspace-scoped persistence keeps one project's interpreter from contaminating another.",
    sections: pythonSections,
  }),
  createArchitecturePost({
    seriesOrder: 11,
    slug: "per-window-workspace-capability-security",
    title: "The Per-Window Capability Model Protecting Axon Workspaces",
    animatedTitles: ["The Per-Window Capability Model Protecting Axon Workspaces", "Opening a Folder Is a Security Grant", "Multiple Windows Without Shared Filesystem Authority"],
    excerpt: "How Axon ties filesystem permissions to renderer identity, canonical roots, exact external files, trusted IPC, and lifecycle revocation.",
    readingTime: "23 min read",
    tags: ["Architecture", "Security", "Electron", "Workspaces"],
    coverImage: "/media/screenshots/captures/axon-capture-66.png",
    conclusion: "Axon's capability model turns user intent into narrow, renderer-specific filesystem authority. Main-process validation, canonical path checks, exact external-file grants, and teardown revocation let powerful editor workflows operate without handing every window unrestricted disk access. Shared caches and watchers improve efficiency, but they never replace per-client authorization.",
    sections: capabilitySections,
  }),
  createArchitecturePost({
    seriesOrder: 12,
    slug: "extension-oriented-workbench-architecture",
    title: "Building Axon as an Extension-Oriented Workbench",
    animatedTitles: ["Building Axon as an Extension-Oriented Workbench", "Built-In Does Not Have to Mean Hardcoded", "From One App Component to Declarative Contributions"],
    excerpt: "How manifests, discovery, normalized registries, lazy activation, public APIs, and focused workbench adapters let Axon grow without centralizing every feature.",
    readingTime: "27 min read",
    tags: ["Architecture", "Extensions", "Workbench", "API"],
    coverImage: "/media/screenshots/captures/axon-capture-35.png",
    conclusion: "The extension-oriented workbench gives Axon a scalable composition model. Declarative contributions provide immediate discoverability, activation events defer runtime cost, public packages define stable contracts, and focused adapters keep the application shell from owning every feature. That architecture supports both bundled product capabilities and a future ecosystem without treating either as an afterthought.",
    sections: extensionSections,
  }),
];
