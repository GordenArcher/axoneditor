import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  Bot,
  Braces,
  Check,
  GitBranch,
  Play,
  Search,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { useEffect, useState } from "react";

const workbenchTools = [
  { label: "Editor", icon: Braces },
  { label: "Search", icon: Search },
  { label: "Git", icon: GitBranch },
  { label: "Tests", icon: Play },
  { label: "Terminal", icon: TerminalSquare },
  { label: "Agent", icon: Bot },
];

const heroLines = [
  { text: "moves together.", highlight: "#e3b66f" },
  { text: "stays in context.", highlight: "#73b7d6" },
  { text: "keeps its momentum.", highlight: "#9dcc82" },
  { text: "is fully in view.", highlight: "#d8b4e2" },
];

const springEase = [0.16, 1, 0.3, 1] as const;

export default function LandingShowcase() {
  const reduceMotion = useReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const activeLine = heroLines[lineIndex] ?? heroLines[0];

  useEffect(() => {
    // The changing line is the hero's signature moment, but it must never make
    // the page harder to read for people who request reduced motion. Keeping the
    // first phrase static in that mode preserves the message without movement.
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % heroLines.length);
    }, 4100);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <section className="relative isolate overflow-hidden px-5 pb-16 pt-16 sm:pt-20 lg:pb-24 lg:pt-24">
      <div className="hero-grid pointer-events-none absolute inset-0 -z-20" />
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[34rem] w-[48rem] -translate-x-1/2 rounded-full bg-[#c99a5b]/[0.09] blur-[120px]" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: springEase }}
          className="mx-auto max-w-5xl text-center"
        >
          <a
            href="/releases"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-[#c99a5b]/40 hover:text-zinc-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#d5a45f] shadow-[0_0_12px_#d5a45f]" />
            Axon is shipping fast
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1 className="mt-7 text-balance text-[clamp(3.2rem,8vw,7.2rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-zinc-100">
            Your project
            <span className="relative mx-auto mt-2 block h-[1.9em] max-w-5xl overflow-hidden sm:h-[0.98em]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={activeLine.text}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{
                    hidden: {},
                    visible: {
                      transition: {
                        delayChildren: 0.08,
                        staggerChildren: reduceMotion ? 0 : 0.065,
                      },
                    },
                    exit: {
                      transition: {
                        staggerChildren: reduceMotion ? 0 : 0.022,
                        staggerDirection: -1,
                      },
                    },
                  }}
                  className="absolute inset-x-0 top-0 flex justify-center"
                >
                  <span className="relative inline-block px-[0.08em] pb-[0.06em] text-[#17120c]">
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 z-0"
                      style={{
                        backgroundColor: activeLine.highlight,
                        transformOrigin: "left center",
                      }}
                      initial={reduceMotion ? false : { opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scaleX: 0.94 }}
                      transition={{ duration: 0.62, ease: springEase }}
                    />
                    {Array.from(activeLine.text).map((letter, index) => (
                      <motion.span
                        key={`${activeLine.text}-${index}`}
                        variants={{
                          hidden: reduceMotion
                            ? { opacity: 1, y: 0, filter: "blur(0px)" }
                            : { opacity: 0, y: 34, filter: "blur(8px)" },
                          visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                          exit: reduceMotion
                            ? { opacity: 1, y: 0, filter: "blur(0px)" }
                            : { opacity: 0, y: -24, filter: "blur(8px)" },
                        }}
                        transition={{ duration: 0.55, ease: springEase }}
                        className="relative z-10 inline-block whitespace-pre"
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </span>
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            A local-first code editor where language tooling, Git, tests,
            terminals, and your AI agent work from the same project context.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/download"
              className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e6b76f] px-5 text-sm font-semibold text-[#17120c] shadow-[0_12px_40px_rgba(201,154,91,0.18)] transition hover:bg-[#f1c37e] sm:w-auto"
            >
              Download Axon
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://axoneditor-docs.vercel.app"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-white/12 bg-white/[0.025] px-5 text-sm font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.05] sm:w-auto"
            >
              Explore the docs
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-600">Available for macOS, Windows, and Linux</p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 34, scale: 0.985 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.9, ease: springEase }}
          className="relative mx-auto mt-14 max-w-6xl lg:mt-16"
        >
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[#c99a5b]/10 blur-3xl" />
          <div className="overflow-hidden rounded-xl border border-white/15 bg-[#080808] shadow-[0_40px_100px_rgba(0,0,0,0.75)] sm:rounded-2xl">
            <div className="relative flex h-10 items-center border-b border-white/[0.08] bg-[#101010] px-3 sm:h-12 sm:px-4">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-[11px] text-zinc-500 sm:text-xs">
                <img src="/media/icons/axon.png" alt="" className="h-4 w-4 rounded" />
                axon / workspace
              </div>
            </div>
            <img
              src="/media/screenshots/captures/axon-capture-61.png"
              alt="Axon editing a TypeScript project with the workspace tree, tabs, tests, and syntax highlighting visible"
              className="block aspect-[16/9] w-full object-cover object-top"
            />
          </div>

          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-7 right-3 hidden w-64 rounded-xl border border-white/10 bg-[#11110f]/95 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl md:block lg:-right-8 lg:bottom-10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                <Sparkles className="h-3.5 w-3.5 text-[#d5a45f]" />
                Project context
              </div>
              <span className="rounded-full bg-[#8fbf74]/10 px-2 py-0.5 text-[10px] text-[#9dcc82]">ready</span>
            </div>
            <div className="mt-3 space-y-2 font-mono text-[10px] text-zinc-500">
              <p className="flex items-center gap-2"><Check className="h-3 w-3 text-[#9dcc82]" /> workspace indexed</p>
              <p className="flex items-center gap-2"><Check className="h-3 w-3 text-[#9dcc82]" /> language server warm</p>
              <p className="flex items-center gap-2"><Check className="h-3 w-3 text-[#9dcc82]" /> git state synchronized</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="mx-auto mt-14 max-w-5xl border-y border-white/[0.07] py-5 lg:mt-20">
          <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
            One workbench · shared context
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {workbenchTools.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Icon className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.7} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
