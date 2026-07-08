import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

const capabilities = [
  "Editor",
  "LSP",
  "Git",
  "Tests",
  "Terminal",
  "Agent",
];

const heroLines = [
  { text: "projects move together.", color: "text-[#d2a6ff]" },
  { text: "tooling feels awake.", color: "text-[#59c2ff]" },
  { text: "agent shares context.", color: "text-[#aad94c]" },
  { text: "code color feels rich.", color: "text-[#ffd580]" },
];

export default function LandingShowcase() {
  const reduceMotion = useReducedMotion();
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const activeLine = heroLines[lineIndex] ?? heroLines[0];
  const letters = Array.from(activeLine.text);
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ["start 84%", "center center", "end 16%"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 84,
    damping: 30,
    mass: 0.28,
  });
  const mediaScaleX = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.2, 1.02]);
  const mediaScaleY = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.16, 1.02]);
  const mediaRadius = useTransform(smoothProgress, [0, 0.5, 1], [32, 12, 28]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % heroLines.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <section className="relative overflow-hidden px-5 pb-14 pt-14 md:pb-20 md:pt-20">
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-5xl text-center"
        >
          <h1 className="text-5xl font-semibold leading-[1.02] text-zinc-100 md:text-7xl">
            A local-first editor where
            <span className="relative mx-auto mt-2 block h-[2.14em] max-w-5xl overflow-hidden sm:h-[1.08em]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={lineIndex}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  variants={{
                    hidden: {},
                    show: {
                      transition: {
                        staggerChildren: reduceMotion ? 0 : 0.075,
                        delayChildren: 0.05,
                      },
                    },
                    exit: {
                      transition: {
                        staggerChildren: reduceMotion ? 0 : 0.025,
                        staggerDirection: -1,
                      },
                    },
                  }}
                  className={`absolute inset-x-0 top-0 ${activeLine.color}`}
                >
                  {letters.map((letter, index) => (
                    <motion.span
                      key={`${activeLine.text}-${index}`}
                      variants={{
                        hidden: reduceMotion
                          ? { opacity: 1, y: 0, filter: "blur(0px)" }
                          : { opacity: 0, y: 34, filter: "blur(8px)" },
                        show: { opacity: 1, y: 0, filter: "blur(0px)" },
                        exit: reduceMotion
                          ? { opacity: 1, y: 0, filter: "blur(0px)" }
                          : { opacity: 0, y: -24, filter: "blur(8px)" },
                      }}
                      transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
                      className="inline-block whitespace-pre"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-axon-muted">
            Axon brings the editor, language servers, Git, Problems, tests,
            terminal sessions, extensions, and the local agent into one
            connected workbench instead of making every panel guess alone.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/download"
              className="inline-flex items-center rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-white"
            >
              Download Axon
            </a>
            <a
              href="/docs"
              className="inline-flex items-center rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              Read docs
            </a>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {capabilities.map((capability) => (
              <motion.span
                key={capability}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-sm text-axon-muted"
              >
                {capability}
              </motion.span>
            ))}
          </div>
        </motion.div>

        <motion.div
          ref={mediaRef}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 28 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-12 flex justify-center"
        >
          <motion.div
            style={
              reduceMotion
                ? undefined
                : {
                    scaleX: mediaScaleX,
                    scaleY: mediaScaleY,
                    borderRadius: mediaRadius,
                    transformOrigin: "center center",
                    willChange: "transform, border-radius",
                  }
            }
            className="w-[84%] origin-center overflow-hidden border border-white/10 bg-white/[0.025] p-3 shadow-2xl shadow-black/50 max-lg:w-full"
          >
            <div className="flex overflow-hidden rounded-[inherit] border border-white/10 bg-[#080b10]">
              <div className="hidden w-56 shrink-0 border-r border-white/10 bg-black/30 p-3 text-left lg:block">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5eead4]" />
                </div>
                {["Explorer", "Search", "Git", "Problems", "Agent"].map((item, index) => (
                  <div
                    key={item}
                    className={`mb-1 rounded-md px-3 py-2 text-sm ${
                      index === 0 ? "bg-white/[0.07] text-zinc-100" : "text-axon-muted"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <span className="rounded bg-white/[0.07] px-2 py-1 font-mono text-[11px] text-zinc-100">
                    axon://workspace
                  </span>
                  <span className="rounded bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-axon-muted">
                    demo.playback
                  </span>
                </div>
                <video
                  src="/media/demo/axon-demo-full.mp4"
                  poster="/media/screenshots/axon-screenshot-05.png"
                  className="h-[clamp(22rem,58vw,48rem)] w-full object-cover object-left-top opacity-95"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
