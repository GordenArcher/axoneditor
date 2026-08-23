import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const heroLines = [
  { text: "moves together.", highlight: "#e3b66f" },
  { text: "stays in context.", highlight: "#73b7d6" },
  { text: "keeps its momentum.", highlight: "#9dcc82" },
  { text: "is fully in view.", highlight: "#d8b4e2" },
];

const springEase = [0.16, 1, 0.3, 1] as const;

export default function HeroPhrase() {
  const reduceMotion = useReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [hasRotated, setHasRotated] = useState(false);
  const activeLine = heroLines[lineIndex] ?? heroLines[0];

  useEffect(() => {
    // The first phrase is already present in Astro's server-rendered HTML, so I
    // leave it in its finished visual state through hydration. Starting it from
    // an invisible animation state would make the text flash when React claims
    // the island. Only subsequent phrases enter from below, which preserves the
    // intended motion without changing anything during the initial hand-off.
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setHasRotated(true);
      setLineIndex((current) => (current + 1) % heroLines.length);
    }, 4100);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <span className="relative mx-auto mt-2 block h-[1.9em] max-w-5xl overflow-hidden sm:h-[0.98em]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={activeLine.text}
          initial={!hasRotated || reduceMotion ? false : "hidden"}
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
              initial={!hasRotated || reduceMotion ? false : { opacity: 0, scaleX: 0 }}
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
  );
}
