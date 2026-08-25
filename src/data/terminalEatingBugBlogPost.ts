import type { BlogPost } from "./blog";

export const terminalEatingBugBlogPost: BlogPost = {
  slug: "how-we-fixed-the-terminal-eating-output-bug",
  title: "How We Fixed Axon's Terminal Eating Output",
  animatedTitles: [
    "How We Fixed Axon's Terminal Eating Output",
    "The Resize Clue That Changed the Investigation",
    "When Delivered Bytes Still Disappear",
    "Why One Terminal Symptom Had Three Causes",
  ],
  excerpt:
    "A detailed debugging story about missing agent logs, misleading WebGL symptoms, xterm scroll regions, the VS Code comparison, and the tests that finally proved old output stayed visible.",
  authors: [
    {
      name: "Gorden Archer",
      role: "Creator of Axon",
      avatar: "https://github.com/GordenArcher.png?size=96",
      github: "https://github.com/GordenArcher",
    },
  ],
  publishedAt: "2026-08-25",
  updatedAt: "2026-08-25",
  readingTime: "26 min read",
  tags: ["Terminal", "xterm", "Electron", "WebGL", "Debugging", "Reliability"],
  coverImage: "/media/screenshots/captures/axon-capture-08.png",
  conclusion:
    "The terminal stopped eating output when we stopped treating missing text as one generic rendering problem. Axon now acknowledges only xterm-committed bytes, delegates ordinary scheduling to xterm, uses the stable DOM renderer by default, preserves explicitly enabled WebGL contexts, and corrects the top-anchored CSI scroll path so displaced rows enter scrollback instead of being deleted. The lasting lesson is simple: prove transport, buffer, viewport, and pixels independently. A terminal is reliable only when all four agree.",
  sections: [
    {
      kind: "paragraph",
      body: "Yes, this is the bug we fixed in the long Axon terminal debugging conversation. It started with a brutal observation: while an agent produced new output, text that had already rendered moved upward and vanished. Sometimes the new output vanished too. The missing rows were not merely above the viewport, because scrolling could not recover them. Resizing the terminal could temporarily make the screen look correct, which made the failure look like a renderer problem, but later screenshots proved that rendering was only one part of it.",
      hoverPhrases: [
        {
          text: "Resizing the terminal could temporarily make the screen look correct",
          note: "That was the first hard clue that the PTY and xterm buffer could be healthier than the pixels on screen.",
        },
        {
          text: "rendering was only one part of it",
          note: "The final reproduction exposed a separate parser path that really removed rows from scrollback.",
        },
      ],
    },
    {
      kind: "callout",
      tone: "info",
      title: "One conversation, several terminal fixes",
      body: "The eating-output investigation fixed the delivery, renderer, and scrollback paths. The same conversation also fixed terminal link selection, Codex shortcut focus, and a packaged-build ticket socket failure. Those were real terminal bugs, but they were separate from the disappearing-row mechanism described here.",
    },
    {
      kind: "heading",
      kicker: "The symptom",
      title: "Old rows were overwritten instead of being pushed into history",
    },
    {
      kind: "paragraph",
      body: "The most useful description was not simply that output disappeared. The failure happened at the live viewport boundary. New agent output arrived at the bottom. Previously visible rows travelled toward the top. At that moment, both old and newly arriving content could become unreachable. A normal terminal should move completed rows into scrollback and keep accepting new rows at the tail. Axon behaved as if the top of the live region were a deletion boundary.",
      hoverPhrases: [
        {
          text: "the top of the live region were a deletion boundary",
          note: "That wording eventually matched the exact xterm branch responsible for the remaining data loss.",
        },
      ],
    },
    {
      kind: "code",
      language: "txt",
      filename: "the required terminal invariant",
      code: `new output arrives
old visible rows move upward
rows crossing the viewport top enter scrollback
scrolling up can still reach every retained row

Never: crossing the viewport top deletes the row`,
    },
    {
      kind: "heading",
      kicker: "Why it resisted fixes",
      title: "A terminal has more than one definition of delivered",
    },
    {
      kind: "paragraph",
      body: "A terminal row crosses several ownership boundaries before it becomes something a person can scroll back to. The PTY emits bytes. The Go host stores replayable history. A WebSocket delivers frames. xterm parses ANSI control sequences and mutates its circular buffer. Its renderer converts buffer cells into DOM rows or WebGL glyphs. Chromium composites those pixels into the Electron window. A green check at one layer says nothing about the next layer.",
    },
    {
      kind: "mermaid",
      title: "The full path from process output to visible history",
      diagram: `flowchart LR
  Process[Shell or agent process] --> PTY[PTY byte stream]
  PTY --> Replay[Go host replay window]
  Replay --> Socket[Authenticated WebSocket]
  Socket --> Parser[xterm parser + write queue]
  Parser --> Buffer[xterm circular buffer]
  Buffer --> Viewport[xterm viewport scheduler]
  Viewport --> Paint[DOM or WebGL renderer]
  Paint --> Pixels[Chromium compositor]
  Parser -->|write callback| Ack[Committed byte acknowledgement]
  Ack --> Replay`,
    },
    {
      kind: "timeline",
      items: [
        {
          label: "01",
          title: "Transport loss",
          body: "If Axon acknowledged a WebSocket frame before xterm committed it, reconnect replay could trim bytes that had never entered the terminal buffer.",
        },
        {
          label: "02",
          title: "Paint loss",
          body: "If xterm's buffer retained the rows but WebGL or Chromium stopped painting glyphs, resize could rebuild the surface and make the text appear again.",
        },
        {
          label: "03",
          title: "Scrollback loss",
          body: "If an ANSI scroll-region command took xterm's deletion branch, the rows were removed from the circular buffer and no repaint could recover them.",
        },
      ],
    },
    {
      kind: "callout",
      tone: "warning",
      title: "Why plausible fixes kept failing",
      body: "Each attempted fix addressed a real failure mode. None could solve the entire symptom because the reproductions were crossing different layers. The investigation only converged after buffer contents and rendered pixels were tested separately.",
    },
    {
      kind: "heading",
      kicker: "The first correctness boundary",
      title: "WebSocket receipt could not be the acknowledgement point",
    },
    {
      kind: "paragraph",
      body: "Axon already had replay and backpressure work before the final rendering fix. That work mattered. WebSocket receipt proves only that JavaScript owns a frame; xterm.write remains asynchronous while the parser handles control sequences, wrapping, cursor movement, synchronized-output markers, and buffer mutation. The durable replay cursor therefore advances from xterm's write callback. If the socket disconnects earlier, the host still owns the uncommitted byte range and can replay it.",
    },
    {
      kind: "code",
      language: "ts",
      filename: "terminalSessionIo.ts, simplified",
      code: `pendingXtermWriteBytes += byteLength;

term.write(frame, () => {
  receivedBytes += byteLength;
  pendingXtermWriteBytes -= byteLength;
  acknowledge(receivedBytes);
});`,
    },
    {
      kind: "paragraph",
      body: "That fixed a real reconnect race, but it did not prove the pixels stayed present. A terminal buffer test could show every numbered row while the screenshot still contained blank bands. That distinction became essential once resize entered the report.",
    },
    {
      kind: "heading",
      kicker: "The resize clue",
      title:
        "If resize restores text, inspect the paint path before changing the PTY",
    },
    {
      kind: "paragraph",
      body: "A resize makes xterm recompute columns and rows, reflow wrapped content, dirty the viewport, and schedule a broad repaint. When that restored output, it was strong evidence that at least some missing rows were still in xterm's model. The WebGL surface or invalidation state had become stale. The browser could keep backgrounds or fragments while glyph rows disappeared, then a full fit made everything look healthy again.",
      hoverPhrases: [
        {
          text: "strong evidence",
          note: "Not absolute proof: later we found a different reproduction where the rows were truly deleted. That is why the tests needed both buffer and pixel assertions.",
        },
      ],
    },
    {
      kind: "paragraph",
      body: "The first response was to force recovery: coalesced refresh calls, quiet-period hard invalidation, texture-atlas clearing, viewport restoration, and health-driven redraws. Those mechanisms could make a stale frame recover, but they also created a second renderer scheduler beside xterm's own scheduler. More code now guessed when xterm was finished, when a reader was at the bottom, which rows were dirty, and when a WebGL cache should be rebuilt.",
    },
    {
      kind: "callout",
      tone: "warning",
      title: "A redraw is evidence, not a durable architecture",
      body: "Calling refresh after every suspicious state can hide a compositor problem while introducing timing conflicts, scroll jumps, excess work, and new assumptions about xterm internals. The terminal looked better in some cases, but the ownership boundary became less trustworthy.",
    },
    {
      kind: "heading",
      kicker: "The VS Code comparison",
      title:
        "The same xterm stack worked when the host stopped competing with it",
    },
    {
      kind: "paragraph",
      body: "VS Code was the useful control case because it uses the same xterm ecosystem without Axon's disappearing-row behavior. The important difference was not a secret renderer. VS Code lets xterm own its parser queue, invalidation cadence, viewport observation, and WebGL lifecycle. Axon had wrapped those mechanisms in a custom output pipeline. The fix moved the boundary back: authenticated delivery and byte acknowledgement remain Axon responsibilities; normal parsing and rendering remain xterm responsibilities.",
    },
    {
      kind: "code",
      language: "txt",
      filename: "ownership before and after",
      code: `Before
WebSocket -> Axon split queue -> Axon batching -> Axon viewport tracking
          -> xterm.write -> Axon refresh -> Axon WebGL invalidation

After
WebSocket -> xterm.write queue -> xterm parser -> xterm renderer
          -> callback -> Axon committed-byte acknowledgement`,
    },
    {
      kind: "paragraph",
      body: "The simplification removed manual output splitting, a second drain timer, in-flight batching state, forced redraw scheduling, custom scroll-position restoration, and render-health recovery. Binary WebSocket frames now arrive as ArrayBuffer values and enter xterm's ordered write queue directly. Axon keeps only the byte count needed to delay acknowledgements and reconnect until pending writes settle.",
    },
    {
      kind: "heading",
      kicker: "Renderer policy",
      title:
        "Automatic mode now chooses stability; WebGL remains an explicit option",
    },
    {
      kind: "paragraph",
      body: "Axon's automatic GPU setting now keeps xterm's DOM renderer. Terminal tabs remain mounted while hidden, and Electron may discard an unpreserved GPU surface without reporting a clean context-loss event. The xterm buffer stays correct, but foreground glyph rows can remain blank until resize. DOM rows live in the document and do not depend on that retained drawing surface, making them the safer automatic choice.",
    },
    {
      kind: "paragraph",
      body: "WebGL is still available when the user explicitly enables it. Axon loads the standard addon configuration, refits after renderer changes, listens for real context loss, falls back to DOM if initialization or context ownership fails, and keeps the active addon attached across panel and tab visibility transitions. Repeatedly disposing and recreating the addon had allowed unreleased contexts to accumulate until Chromium evicted a live surface.",
    },
    {
      kind: "callout",
      tone: "success",
      title: "What this part fixed",
      body: "The resize-only recovery symptom stopped being normal behavior. xterm owns routine invalidation again, automatic mode avoids fragile GPU-surface retention, and explicit WebGL has one context lifecycle with a defined fallback.",
    },
    {
      kind: "heading",
      kicker: "The screenshot that reopened the case",
      title: "The buffer was still losing rows after the renderer cleanup",
    },
    {
      kind: "paragraph",
      body: "After the VS Code-aligned renderer work, another screenshot showed the eating bug was still active. This time both old and new output became unreachable exactly as an agent interface moved content through the top of its live region. The key was the terminal program's ANSI behavior. Coding agents and other TUIs do not always print with ordinary linefeeds. They can protect a composer or status area with a scroll region, then send CSI S—Scroll Up—to move completed rows out of that region.",
      hoverPhrases: [
        {
          text: "CSI S—Scroll Up",
          note: "The captured failure used a full multi-row displacement, not an ordinary newline at the bottom margin.",
        },
      ],
    },
    {
      kind: "paragraph",
      body: "The installed xterm runtime handled ordinary terminal scrolling correctly: a row leaving the top of a full-screen buffer entered scrollback. But its CSI scroll-up handler used direct circular-buffer splices for a top-anchored region. Those splices removed the departing row and inserted a blank row at the region bottom. For a partial region that behavior can be appropriate. For a region anchored at row zero, it meant completed output was deleted instead of becoming history.",
    },
    {
      kind: "mermaid",
      title: "Why the same upward movement had two outcomes",
      diagram: `flowchart TD
  Move[Row leaves top of live region] --> Kind{How was it moved?}
  Kind -->|Normal bottom-margin scroll| History[BufferService scroll]
  History --> Keep[Row enters scrollback]
  Kind -->|CSI S in top-anchored region| Old[Direct line splice]
  Old --> Delete[Row removed from buffer]
  Kind -->|Corrected CSI S path| Fixed[BufferService scroll]
  Fixed --> Keep`,
    },
    {
      kind: "code",
      language: "ts",
      filename: "the corrected scroll decision, simplified",
      code: `if (buffer.scrollTop === 0) {
  const previousBaseY = buffer.ybase;
  bufferService.scroll(eraseAttributes);
  buffer.savedY += buffer.ybase - previousBaseY;
} else {
  scrollPartialRegionWithLineSplices();
}`,
    },
    {
      kind: "paragraph",
      body: "Axon's build patch changes only that top-anchored branch. It routes the movement through xterm's normal BufferService scroll operation so the row is retained exactly like a linefeed at the bottom margin. Partial scroll regions keep their existing splice behavior. The saved cursor position is adjusted by the base offset so switching buffer state does not introduce a second cursor bug.",
    },
    {
      kind: "heading",
      kicker: "The development trap",
      title: "A correct patch is useless if Vite serves yesterday's xterm",
    },
    {
      kind: "paragraph",
      body: "The scrollback correction initially appeared inconsistent between production and development. The source package had been patched, but Vite dependency optimization could keep serving a prebundled copy created before the patch ran. Restarting the development command did not guarantee that optimized artifact changed. Axon now excludes @xterm/xterm from dependency optimization, and the patch runs during install, development preparation, renderer builds, and tests.",
    },
    {
      kind: "callout",
      tone: "info",
      title: "Fail loudly when the dependency changes",
      body: "The patch script searches for the exact installed scroll-up implementation. If a future xterm release changes that code, the build stops and asks for review instead of silently shipping an unpatched or incorrectly patched runtime.",
    },
    {
      kind: "heading",
      kicker: "Regression proof",
      title: "The tests had to inspect bytes, buffer rows, and pixels",
    },
    {
      kind: "paragraph",
      body: "The earlier tests were too willing to declare victory. A concatenated string test proves ordering but not terminal semantics. An xterm buffer test proves parsing and retention but not Electron compositing. A screenshot proves pixels at one moment but not byte-exact replay. The final suite divides those responsibilities so a future failure says which boundary broke.",
    },
    {
      kind: "timeline",
      items: [
        {
          label: "BYTES",
          title: "Commit and reconnect accounting",
          body: "UTF-8 byte counts advance only from xterm write callbacks, and reconnect waits until pending writes settle before requesting replay from the committed offset.",
        },
        {
          label: "BUFFER",
          title: "Twenty thousand retained lines",
          body: "A real xterm instance receives numbered and ANSI-rich output while the reader remains in scrollback; every retained line is checked in order.",
        },
        {
          label: "CONTROL",
          title: "Exact CSI scroll-region reproductions",
          body: "Tests send both a two-row top-anchored scroll and the captured twelve-row full-viewport displacement, then assert baseY and historical rows.",
        },
        {
          label: "PIXELS",
          title: "Electron compositor coverage",
          body: "The fixture streams 1,200 lines in bursts, captures the live view and every historical viewport, and rejects blank glyph rows even when the buffer itself is correct.",
        },
      ],
    },
    {
      kind: "code",
      language: "txt",
      filename: "the captured scroll-region regression",
      code: `22 visible rows
CSI 1;12 r   -> protect a top-anchored 12-row region
CSI 12 S     -> move all 12 completed rows upward
CSI r        -> restore the normal region

Expected: all 12 departing rows are reachable in scrollback
Broken:   all 12 rows are splice-deleted`,
    },
    {
      kind: "heading",
      kicker: "A later terminal failure",
      title:
        "The packaged app's dead ticket socket was a different lifecycle race",
    },
    {
      kind: "paragraph",
      body: "The same debugging conversation later uncovered a separate installed-build failure: existing terminal streams stayed alive, but Axon could no longer create a new ticket. Electron's before-quit event does not await an async listener. The controller could time out a child stop, clear its process reference, and unlink a control socket even though the PTY host still owned its TCP stream port. A replacement then published a new socket, lost the port race, and exited, leaving old streams alive beside a refused ticket socket.",
    },
    {
      kind: "paragraph",
      body: "That lifecycle fix now holds the first quit request until cleanup settles, waits for real child exit state, escalates stuck children to forced termination, refuses to discard a live process reference, binds the stream port before publishing the private control socket, and ends both transports together. It belongs in the same terminal reliability story, but it did not cause rows to disappear from xterm scrollback.",
    },
    {
      kind: "heading",
      kicker: "What changed permanently",
      title: "Axon now draws a smaller and more testable ownership boundary",
    },
    {
      kind: "paragraph",
      body: "Axon still owns what only Axon can own: authenticated tickets, workspace-scoped sessions, replay offsets, reconnect policy, explicit renderer selection, and application shutdown. xterm owns what xterm is designed to own: ordered writes, ANSI parsing, the live circular buffer, viewport scheduling, and normal renderer invalidation. The one patched parser branch is narrow, reproducible, guarded by exact runtime matching, and covered by a control-sequence test.",
    },
    {
      kind: "paragraph",
      body: "The emotional lesson mattered too. Repeated reports that the bug was still present were not noise; they disproved incomplete theories. The resize observation separated paint from delivery. The before-and-after screenshots separated stale pixels from deleted history. Comparing another agent and ordinary terminals prevented the diagnosis from becoming Codex-specific. The bug became fixable when the evidence forced the architecture to admit that more than one layer was wrong.",
      hoverPhrases: [
        {
          text: "disproved incomplete theories",
          note: "A passing unit test was never stronger evidence than output still disappearing in the real terminal.",
        },
      ],
    },
    {
      kind: "links",
      title: "Implementation and related reading",
      items: [
        {
          label: "Final long-stream fix",
          href: "https://github.com/axon-editor/axon/commit/080d57141c27568b5aa98e93f39337e78d4ce437",
          description:
            "The direct xterm write path, renderer policy, scrollback correction, and end-to-end regressions.",
        },
        {
          label: "VS Code-aligned renderer cleanup",
          href: "https://github.com/axon-editor/axon/commit/eb31eacaa41d52949aa53b5d24113eb2129e76d9",
          description:
            "The commit that removed manual refresh and texture-atlas behavior before the control-sequence loss was isolated.",
        },
        {
          label: "Development runtime correction",
          href: "https://github.com/axon-editor/axon/commit/f35894b9aade089d6f890091483927ad3aa6c993",
          description:
            "The Vite optimization exclusion that keeps development on the patched xterm runtime.",
        },
        {
          label: "Packaged host lifecycle fix",
          href: "https://github.com/axon-editor/axon/commit/f56de1b3d96cbe03f7eb2de93770dd06f0635866",
          description:
            "The later fix for existing streams surviving beside a dead new-ticket control socket.",
        },
        {
          label: "Terminal delivery architecture",
          href: "/blog/reliable-terminal-delivery-byte-acknowledgements",
          description:
            "The companion deep dive into replay windows, committed byte acknowledgements, and backpressure.",
        },
      ],
    },
  ],
};
