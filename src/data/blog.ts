export type BlogAuthor = {
  name: string;
  role: string;
  avatar: string;
  github: string;
};

export type BlogSection =
  | {
      kind: "paragraph";
      body: string;
      hoverPhrases?: Array<{
        text: string;
        note: string;
      }>;
    }
  | {
      kind: "heading";
      title: string;
      kicker?: string;
    }
  | {
      kind: "code";
      language: string;
      filename?: string;
      code: string;
    }
  | {
      kind: "callout";
      title: string;
      body: string;
      tone: "info" | "warning" | "success";
    }
  | {
      kind: "timeline";
      items: Array<{
        label: string;
        title: string;
        body: string;
      }>;
    }
  | {
      kind: "links";
      title: string;
      items: Array<{
        label: string;
        href: string;
        description: string;
      }>;
    };

export type BlogPost = {
  slug: string;
  title: string;
  animatedTitles: string[];
  excerpt: string;
  authors: BlogAuthor[];
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  tags: string[];
  coverImage: string;
  conclusion: string;
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "the-go-lsp-fix-that-finally-worked",
    title: "The Go LSP Fix That Finally Worked",
    animatedTitles: [
      "The Go LSP Fix That Finally Worked",
      "When gopls Started, Initialized, and Still Did Nothing",
      "The Bug Was Not Go. It Was the Launch Environment.",
      "Dock Launches Are Not Terminal Launches",
    ],
    excerpt:
      "Rust, Python, and C++ were coming alive in Axon, but Go kept acting like it had joined the meeting and muted itself. This is the full story of the fix that finally made gopls work in the packaged app.",
    authors: [
      {
        name: "Gorden Archer",
        role: "Creator of Axon",
        avatar: "https://github.com/GordenArcher.png?size=96",
        github: "https://github.com/GordenArcher",
      },
    ],
    publishedAt: "2026-06-16",
    updatedAt: "2026-06-16",
    readingTime: "16 min read",
    tags: ["Axon", "Go", "gopls", "LSP", "Electron", "Debugging"],
    coverImage: "/media/screenshots/axon-screenshot-05.png",
    conclusion:
      "The final lesson was simple but painful: a bundled language server is only truly bundled when the process you spawn has the environment it needs to behave like the user's real development machine. gopls was present. gopls was executable. gopls initialized. But until Axon gave it the same shell environment I had in Terminal, it could not complete the job. Now Go works from the packaged app, and that one stubborn bug made the whole LSP layer stronger.",
    sections: [
      {
        kind: "paragraph",
        body: "I had one of those bugs that looks fixed three different times before it finally admits what it really is. Go LSP in Axon was that bug. In development it looked fine. When I launched the packaged app from Terminal, it looked fine. Rust was coming up. Python was working. C++ had its own noise, but it was at least showing life. Then I opened Axon like a normal person from the Applications folder and Go just sat there like it had no plans for the day.",
        hoverPhrases: [
          {
            text: "looks fixed three different times",
            note: "This is the exact kind of bug that makes a developer start negotiating with the machine.",
          },
          {
            text: "Go just sat there",
            note: "The server was not fully dead. That was the annoying part.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "The confusing part",
        body: "The packaged app could spawn gopls and initialize it, but the editor still had no useful Go intelligence. That meant the first obvious explanations were wrong.",
      },
      {
        kind: "code",
        language: "txt",
        filename: "packaged Axon logs",
        code: `[LSP INIT FAIL] go go language server stopped.
[LSP SPAWN OK] go
[LSP INIT OK] go`,
      },
      {
        kind: "paragraph",
        body: "Those logs were both useful and rude. Useful because they proved gopls was in the app and could run. Rude because they removed the easy answer. I could no longer say, 'Ah, the binary is missing.' The binary was there. The wrapper was there. The process started. The initialize request even came back successfully on the second attempt.",
        hoverPhrases: [
          {
            text: "useful and rude",
            note: "Good logs are honest, but sometimes honesty is disrespectful.",
          },
          {
            text: "The binary was there",
            note: "This ruled out the packaging path and extraResources as the main issue.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "That was the moment the bug stopped being a simple packaging failure. If the binary could not spawn, I would know where to look. If initialize failed every time, I would know where to look. But this was worse: the first start failed, the second start looked healthy, and the editor still behaved like Go had no language intelligence behind it. That meant the failure was hiding between layers, not sitting neatly in one file waiting to be deleted.",
        hoverPhrases: [
          {
            text: "hiding between layers",
            note: "The main process, renderer, language-server process, and Monaco bridge all had to agree before completions could feel alive.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "The trap",
        body: "A language server can be installed, found, spawned, and initialized while the editor still feels dead if the renderer is holding stale state or the child process launched with a weak environment.",
      },
      {
        kind: "heading",
        kicker: "First wrong turn",
        title: "I thought this was still a bundling problem",
      },
      {
        kind: "paragraph",
        body: "The first suspicion made sense: managed language servers live inside the packaged app, and if the release did not include the correct platform bundle, Go would fail. Axon resolves native servers from the app resources path in production, so I checked whether gopls was actually present inside the app bundle.",
      },
      {
        kind: "code",
        language: "txt",
        filename: "expected packaged path",
        code: `/Applications/Axon.app/Contents/Resources/language-servers/darwin-x64/go/bin/gopls`,
      },
      {
        kind: "paragraph",
        body: "But that path existed. The local packaged build also had gopls inside release/mac/Axon.app. So the bug moved from 'the app cannot find gopls' to 'gopls starts, but Go intelligence still does not arrive in the editor.' That is a completely different class of problem.",
        hoverPhrases: [
          {
            text: "completely different class of problem",
            note: "The bug had left packaging and entered runtime behavior.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "That distinction matters. Packaged does not automatically mean usable. A binary sitting inside Contents/Resources only proves electron-builder copied it. It does not prove the child process wakes up with a useful HOME, PATH, TMPDIR, workspace cwd, or enough project context to do real analysis. At this point I had to stop asking whether gopls existed and start asking what kind of world Axon was launching it into.",
        hoverPhrases: [
          {
            text: "Packaged does not automatically mean usable",
            note: "This became the main lesson of the whole fix.",
          },
          {
            text: "what kind of world",
            note: "A process environment is the world a language server wakes up inside.",
          },
        ],
      },
      {
        kind: "heading",
        kicker: "What I had to prove",
        title: "The question changed from where is gopls to how is gopls launched",
      },
      {
        kind: "paragraph",
        body: "Once I knew the binary was there, the checklist changed. I had to verify the resolved command path, the launch args, the cwd, the inherited environment, and the renderer retry behavior. Any one of those could produce the same user-facing symptom: no completion popup, no hover, no Go intelligence, just vibes and disappointment.",
        hoverPhrases: [
          {
            text: "just vibes and disappointment",
            note: "Not a language-server architecture I recommend.",
          },
        ],
      },
      {
        kind: "timeline",
        items: [
          {
            label: "Path",
            title: "The executable path was valid",
            body: "Axon resolved the managed bundle path inside the packaged app, so the release asset was not simply missing gopls.",
          },
          {
            label: "Args",
            title: "Launch flags had to be language-specific",
            body: "C++ made this obvious when clangd rejected a server flag that another language server might accept. Every server has its own expectations.",
          },
          {
            label: "Env",
            title: "The process environment was suspicious",
            body: "Terminal launches inherited my shell setup. Dock launches did not. That one difference explained why the same app behaved differently.",
          },
          {
            label: "Retry",
            title: "The renderer could lock itself out",
            body: "If the first start failed and the UI remembered that it had already tried, the next file open could be blocked from requesting a clean restart.",
          },
        ],
      },
      {
        kind: "timeline",
        items: [
          {
            label: "01",
            title: "Dev mode worked",
            body: "Running Axon through the development command inherited my normal shell setup, so gopls had access to the same PATH and Go tooling I use every day.",
          },
          {
            label: "02",
            title: "Terminal launch worked",
            body: "Opening the packaged binary from Terminal also worked because the app inherited the terminal environment.",
          },
          {
            label: "03",
            title: "Dock launch failed",
            body: "Opening the same app from Finder, Dock, or Applications gave Electron a much smaller macOS environment. That was the real split.",
          },
        ],
      },
      {
        kind: "heading",
        kicker: "The loop",
        title: "The fix was not one commit. It was a whole argument with reality.",
      },
      {
        kind: "paragraph",
        body: "The funny part is that every fix made sense at the time. I fixed packaging so Node-backed language servers could run outside asar. I added a richer environment for managed native LSP servers. I added debug logs because guessing was getting embarrassing. I fixed the retry gate because gopls could fail once during cold start and the renderer would hold onto a stale start key like it was a family heirloom. Then I fixed active-file routing so YAML, Docker, shell files, env files, and ignore files went to the right server instead of sitting in plaintext.",
        hoverPhrases: [
          {
            text: "guessing was getting embarrassing",
            note: "At some point logs are not optional. They are self-respect.",
          },
          {
            text: "family heirloom",
            note: "A stale Set key can hold a bug hostage longer than expected.",
          },
        ],
      },
      {
        kind: "code",
        language: "txt",
        filename: "the fix trail",
        code: `32f9732 fix: package node language servers outside asar
412081a fix: pass enriched env to managed native LSP servers on spawn
1e25694 fix: add managed LSP startup debug logs
e757fdd fix: retry Go LSP after cold-start exit and fix C++ stdio flag
a3b5758 fix: start bundled LSPs for active config files
f9fa4a7 fix: stabilize bundled LSPs across workspaces`,
      },
      {
        kind: "paragraph",
        body: "Each one removed a real bug. That is what made the final problem so irritating. It was not that the earlier fixes were useless. They were necessary. They moved the system closer to the truth. But Go still refused to fully work in the one place that mattered: the released desktop app opened normally.",
        hoverPhrases: [
          {
            text: "closer to the truth",
            note: "Debugging is often less about one magic fix and more about removing wrong explanations.",
          },
          {
            text: "the one place that mattered",
            note: "Dev mode passing is nice. Packaged app passing is the actual product.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "From the outside it can sound like I fixed the same issue over and over. From inside the codebase, it felt more like peeling layers off one stubborn system. First the app needed to package the right files. Then Node-backed servers had to run outside asar. Then native servers needed a usable environment. Then failed starts needed to unlock the renderer retry gate. Then config files like Docker, YAML, env files, and ignore files needed to stop falling back to plaintext.",
        hoverPhrases: [
          {
            text: "peeling layers",
            note: "Not glamorous, but accurate. Each layer exposed the next actual failure.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "The painful part was the feedback cycle. Patch it. Build it. Push it. Retag it. Wait for GitHub Actions. Download the app. Replace the local copy. Open it from Applications. Try a real Go project. Watch completions still not show. Then take a deep breath and pretend I was not personally offended by a child process.",
        hoverPhrases: [
          {
            text: "personally offended",
            note: "A professional engineering feeling, obviously.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "The annoying release loop",
        body: "I would patch it, build it, push it, retag it, wait for GitHub Actions, download it, open it, and then Go would still not behave. At that point the bug was no longer just technical; it was personal.",
      },
      {
        kind: "heading",
        kicker: "The actual clue",
        title: "Terminal launch and Dock launch are not the same thing",
      },
      {
        kind: "paragraph",
        body: "This was the part that finally made the bug make sense. When I started Axon from Terminal, Go worked. When I opened Axon like a normal desktop app, Go did not. Same code. Same gopls bundle. Same workspace. Different parent environment.",
        hoverPhrases: [
          {
            text: "Different parent environment",
            note: "This is the entire bug in four words.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "macOS does not launch GUI apps with the same environment as an interactive shell. The Dock does not care what my .zshrc lovingly prepared. It does not wake up and say, 'Let me load Gorden's Homebrew path before I launch this editor.' It gives the app a small, clean environment. That is fine for many apps, but language servers are not normal little apps. They inspect projects, read caches, sometimes shell out, and often expect basic developer paths to exist.",
        hoverPhrases: [
          {
            text: "lovingly prepared",
            note: "My shell config did its best. The Dock simply ignored the family meeting.",
          },
          {
            text: "language servers are not normal little apps",
            note: "They behave more like project analysis engines than simple child processes.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "That explained why my tests kept disagreeing with each other. Terminal launch was useful, but it was also accidentally generous. It handed Axon the same shell environment I use every day. Finder and Dock were stricter. They launched the app like a desktop app, not like a child of my carefully prepared terminal session. The product has to survive that stricter path.",
        hoverPhrases: [
          {
            text: "accidentally generous",
            note: "Terminal was giving Axon help that normal users do not know they are supposed to provide.",
          },
        ],
      },
      {
        kind: "code",
        language: "txt",
        filename: "the behavior split",
        code: `Launched from Terminal:
  Axon inherits shell PATH
  gopls gets the environment it expects
  Go completions show up

Launched from Finder or Dock:
  Axon receives a stripped GUI environment
  native servers get fewer assumptions for free
  Go can start, but the editor experience can still look dead`,
      },
      {
        kind: "callout",
        tone: "info",
        title: "The important distinction",
        body: "gopls is bundled, but it still needs a realistic process environment. It can be present and executable while still failing to analyze a real Go workspace properly.",
      },
      {
        kind: "heading",
        kicker: "The fix",
        title: "Axon now rebuilds the shell environment before spawning native LSPs",
      },
      {
        kind: "paragraph",
        body: "The final clue came from testing the same build two ways. I ran the packaged binary from Terminal and Go worked. I opened the app bundle from Finder and Go did not. That made the bug brutally specific. The code path was the same. The binary was the same. The bundled gopls path was the same. The only meaningful difference was the environment inherited by the Axon process.",
        hoverPhrases: [
          {
            text: "two ways",
            note: "This was the test that finally split the bug cleanly.",
          },
          {
            text: "brutally specific",
            note: "The best kind of clue: narrow enough to act on, rude enough to remember.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "The final fix was not to download Go, inject GOPATH, or pretend every user has the same machine. The fix was to make Axon recover the login-shell environment on macOS, merge that PATH with safe fallback paths, and pass HOME, PATH, and TMPDIR into managed native language server spawns.",
      },
      {
        kind: "paragraph",
        body: "I did not want the fix to depend on my laptop. That would have been another fake win. Axon should not hardcode my personal Homebrew path as the whole truth, and it should not expose local machine paths just to make a demo pass. The app needs to reconstruct a useful environment from the user's actual shell, then add conservative fallbacks only where the OS launch path is too empty.",
        hoverPhrases: [
          {
            text: "another fake win",
            note: "A fix that only works on the developer's machine is just a bug wearing a new shirt.",
          },
        ],
      },
      {
        kind: "code",
        language: "ts",
        filename: "the important idea",
        code: `const shell = process.env.SHELL || "/bin/zsh";
const loginEnv = await readLoginShellEnvironment(shell);

spawn(goplsPath, args, {
  cwd: folderPath,
  env: {
    ...loginEnv,
    ...process.env,
    HOME,
    PATH: mergePathValues(loginEnv.PATH, process.env.PATH, fallbackPath),
    TMPDIR,
  },
});`,
      },
      {
        kind: "paragraph",
        body: "That changed the packaged app behavior immediately. gopls still came from Axon's bundled language server folder, but it now launched with the kind of environment it expects on a developer machine. The server could initialize, analyze the workspace, and actually provide useful completions and hover information.",
        hoverPhrases: [
          {
            text: "actually provide useful completions",
            note: "The part I wanted from the beginning. Imagine that.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "The important part is that this did not weaken the bundled-LSP story. Users still do not need to install gopls globally for Axon to locate the language server binary. The managed server still ships with the app. The environment fix simply gives that bundled process the operating context it needs: a home directory for cache, a temp directory for temporary work, and a PATH that reflects how developers actually configure macOS machines.",
      },
      {
        kind: "timeline",
        items: [
          {
            label: "A",
            title: "gopls stayed bundled",
            body: "The fix did not make users install gopls globally. Axon still launches the managed binary from Contents/Resources/language-servers.",
          },
          {
            label: "B",
            title: "The child process got a real environment",
            body: "HOME, PATH, and TMPDIR became explicit, and the macOS login shell PATH was merged into the spawn environment.",
          },
          {
            label: "C",
            title: "The editor stopped lying to itself",
            body: "LSP config requests now get a useful empty object instead of null, and failed starts can unlock the renderer retry gate.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "The moment it worked from the local packaged app, I knew the release fix was real. Not 'it works in dev' real. Not 'it works if I launch it from Terminal' real. Actual desktop app real. That is the difference between a feature and a feature-shaped rumor.",
        hoverPhrases: [
          {
            text: "feature-shaped rumor",
            note: "If it only works in the perfect dev path, it is still campaigning for feature status.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "success",
        title: "The test that mattered",
        body: "The final passing test was not npm run dev. It was opening the built Axon.app normally, loading a Go workspace, typing real code, and watching gopls answer like it belonged there.",
      },
      {
        kind: "heading",
        kicker: "The second fix",
        title: "Python also needed workspace-aware environment selection",
      },
      {
        kind: "paragraph",
        body: "While fixing Go, I also tightened Python. Python has a different problem: the interpreter is usually workspace-specific. A virtual environment from one project should not quietly follow me into another project. That would make imports look broken in a way that feels random.",
      },
      {
        kind: "paragraph",
        body: "Axon now detects common workspace virtual environments like .venv, venv, env, .env, and virtualenv. If a workspace has its own axon.json, that workspace setting wins. If it does not, Axon detects fresh from the active folder instead of reusing a stale user-level interpreter from a different project.",
        hoverPhrases: [
          {
            text: "detects fresh from the active folder",
            note: "This is the behavior I expect when switching projects.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "That workspace boundary is what makes Python feel sane. A Django REST Framework backend, a small script folder, and a quick experiment project should not all inherit the same interpreter just because I selected one yesterday. When the workspace changes, Axon needs to detect again before it assumes anything.",
        hoverPhrases: [
          {
            text: "workspace boundary",
            note: "This is the rule that keeps Python imports from feeling haunted.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "success",
        title: "What finally worked",
        body: "Go now works from the packaged app opened normally from Finder/Dock, and Python interpreter selection is tied to the active workspace instead of leaking across projects.",
      },
      {
        kind: "heading",
        kicker: "Why this mattered",
        title: "An editor is not serious until language intelligence works outside dev mode",
      },
      {
        kind: "paragraph",
        body: "This mattered because Axon is not supposed to be a toy that only behaves when I run it from a terminal with perfect conditions. I want to use Axon to build Axon. That means the packaged app has to behave like the development app. If LSP only works in dev, the editor is pretending.",
        hoverPhrases: [
          {
            text: "I want to use Axon to build Axon",
            note: "That is the real test. If I cannot live in it, it is not ready.",
          },
          {
            text: "the editor is pretending",
            note: "Strong wording, but fair.",
          },
        ],
      },
      {
        kind: "paragraph",
        body: "A real editor has to survive boring, normal usage. Open it from the Dock. Switch projects. Close it. Reopen it. Use a virtual environment. Open a Go file. Open a YAML file. Jump between tabs. Expect completions without performing a ritual first. That is the standard I wanted Axon to move toward with this fix.",
        hoverPhrases: [
          {
            text: "without performing a ritual first",
            note: "No developer should need a secret launch sequence for autocomplete.",
          },
        ],
      },
      {
        kind: "heading",
        kicker: "What changed in my head",
        title: "This bug made the LSP architecture better, not just Go",
      },
      {
        kind: "paragraph",
        body: "The best outcome is that this did not only fix Go. It forced the LSP layer to become more honest. Status messages had to mean something. Spawn failures had to be visible. Retry behavior had to recover instead of quietly locking the user out. File language detection had to respect real config files. Python interpreter state had to be scoped to the workspace. All of those are editor-quality details.",
      },
      {
        kind: "paragraph",
        body: "So yes, I was annoyed while fixing it. Very annoyed. But technically, the pain was useful. It exposed the difference between a feature that works in the happy path and infrastructure that holds up when the app is packaged, moved, relaunched, and used like a normal tool.",
        hoverPhrases: [
          {
            text: "Very annoyed",
            note: "Calmly. Professionally. With only a small amount of staring at the screen.",
          },
          {
            text: "infrastructure that holds up",
            note: "This is the kind of foundation Axon needs before bigger AI work can sit on top of it.",
          },
        ],
      },
      {
        kind: "links",
        title: "Related pieces",
        items: [
          {
            label: "Axon releases",
            href: "/releases",
            description: "The release notes where these fixes are shipped.",
          },
          {
            label: "Language server docs",
            href: "/docs/language-servers",
            description: "How Axon treats language servers as real editor infrastructure.",
          },
          {
            label: "Axon on GitHub",
            href: "https://github.com/GordenArcher/axon",
            description: "The source code and release builds.",
          },
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null;
}
