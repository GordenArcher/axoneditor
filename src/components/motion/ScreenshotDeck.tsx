import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const screenshots = [
  {
    src: "/media/screenshots/captures/axon-capture-61.png",
    label: "Editor & tests",
    alt: "Axon editing a TypeScript test with the workspace tree and rich syntax highlighting visible",
  },
  {
    src: "/media/screenshots/captures/axon-capture-42.png",
    label: "Split panes",
    alt: "Axon editing TypeScript and Go code in side-by-side editor panes",
  },
  {
    src: "/media/screenshots/captures/axon-capture-57.png",
    label: "Language intelligence",
    alt: "Axon showing language intelligence and documentation inside a Go project",
  },
  {
    src: "/media/screenshots/captures/axon-capture-52.png",
    label: "Terminal & output",
    alt: "Axon showing persistent workspace and language-server output",
  },
  {
    src: "/media/screenshots/captures/axon-capture-46.png",
    label: "Project problems",
    alt: "Axon showing project diagnostics in the Problems surface",
  },
];

const restingPoses = [
  { x: "0%", y: 0, scale: 1, rotateZ: 0, rotateY: 0, opacity: 1 },
  { x: "0%", y: 16, scale: 0.975, rotateZ: 0, rotateY: 0, opacity: 0.9 },
  { x: "0%", y: 32, scale: 0.95, rotateZ: 0, rotateY: 0, opacity: 0.76 },
  { x: "0%", y: 48, scale: 0.925, rotateZ: 0, rotateY: 0, opacity: 0.62 },
  { x: "0%", y: 64, scale: 0.9, rotateZ: 0, rotateY: 0, opacity: 0.48 },
] as const;

const springEase = [0.16, 1, 0.3, 1] as const;

function queuePosition(cardIndex: number, activeIndex: number) {
  return (cardIndex - activeIndex + screenshots.length) % screenshots.length;
}

export default function ScreenshotDeck() {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [departingIndex, setDepartingIndex] = useState<number | null>(null);
  const [recyclingIndex, setRecyclingIndex] = useState<number | null>(null);
  const [manualPaused, setManualPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const animationLock = useRef(false);
  const unlockTimer = useRef<number | null>(null);
  const recycleTimer = useRef<number | null>(null);

  const showCard = useCallback((nextIndex: number) => {
    if (animationLock.current || nextIndex === activeIndex) return;

    if (reduceMotion) {
      setActiveIndex(nextIndex);
      return;
    }

    // The next card rises from the lower stack while the current card exits
    // straight upward. Once the outgoing card is completely transparent, I
    // move it to the bottom with a zero-duration hidden step, then fade it back
    // into the stack. This prevents any visible downward or sideways movement.
    animationLock.current = true;
    setDepartingIndex(activeIndex);
    setActiveIndex(nextIndex);

    unlockTimer.current = window.setTimeout(() => {
      setRecyclingIndex(activeIndex);
      setDepartingIndex(null);

      recycleTimer.current = window.setTimeout(() => {
        setRecyclingIndex(null);
        animationLock.current = false;
      }, 50);
    }, 850);
  }, [activeIndex, reduceMotion]);

  const showNextCard = useCallback(() => {
    showCard((activeIndex + 1) % screenshots.length);
  }, [activeIndex, showCard]);

  useEffect(() => {
    if (reduceMotion || manualPaused || focusPaused) return;

    const timer = window.setTimeout(showNextCard, 4600);
    return () => window.clearTimeout(timer);
  }, [activeIndex, focusPaused, manualPaused, reduceMotion, showNextCard]);

  useEffect(() => {
    return () => {
      if (unlockTimer.current !== null) {
        window.clearTimeout(unlockTimer.current);
      }
      if (recycleTimer.current !== null) {
        window.clearTimeout(recycleTimer.current);
      }
    };
  }, []);

  return (
    <div
      className="relative mx-auto mt-14 max-w-6xl pb-16 lg:mt-16"
      onFocusCapture={() => setFocusPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusPaused(false);
      }}
    >
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-[#c99a5b]/10 blur-3xl" />

      <div
        className="relative aspect-[16/10] [perspective:1800px]"
        aria-roledescription="carousel"
        aria-label="Axon editor screenshots"
      >
        {screenshots.map((screenshot, cardIndex) => {
          const position = queuePosition(cardIndex, activeIndex);
          const isDeparting = cardIndex === departingIndex;
          const isRecycling = cardIndex === recyclingIndex;
          const restingPose = restingPoses[position] ?? restingPoses.at(-1)!;

          return (
            <motion.figure
              key={screenshot.src}
              className="absolute inset-0 origin-bottom overflow-hidden rounded-xl border border-white/15 bg-[#080808] shadow-[0_40px_100px_rgba(0,0,0,0.72)] sm:rounded-2xl"
              initial={false}
              animate={isRecycling ? {
                ...restingPose,
                opacity: 0,
                zIndex: 0,
              } : isDeparting ? {
                x: "0%",
                y: [0, -32, -72],
                scale: [1, 0.985, 0.94],
                rotateZ: 0,
                rotateY: 0,
                opacity: [1, 0.72, 0],
                zIndex: [60, 60, 0],
              } : {
                ...restingPose,
                zIndex: screenshots.length - position,
              }}
              transition={isRecycling ? {
                duration: 0,
              } : isDeparting ? {
                duration: 0.85,
                times: [0, 0.4, 1],
                ease: springEase,
              } : {
                type: "spring",
                stiffness: 115,
                damping: 22,
                mass: 0.9,
              }}
              aria-hidden={position !== 0}
            >
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
                <span className="ml-auto hidden font-mono text-[10px] text-zinc-600 sm:block">
                  {screenshot.label}
                </span>
              </div>
              <img
                src={screenshot.src}
                alt={position === 0 ? screenshot.alt : ""}
                className="block h-[calc(100%-2.5rem)] w-full object-cover object-top sm:h-[calc(100%-3rem)]"
                draggable={false}
              />
            </motion.figure>
          );
        })}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[70] flex items-center justify-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#0c0c0b]/90 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl">
          {screenshots.map((screenshot, index) => (
            <button
              key={screenshot.src}
              type="button"
              onClick={() => showCard(index)}
              className="group grid h-7 w-7 cursor-pointer place-items-center rounded-full"
              aria-label={`Show ${screenshot.label}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <motion.span
                className={`block h-1.5 rounded-full transition-colors ${
                  index === activeIndex
                    ? "bg-[var(--axon-accent)]"
                    : "bg-zinc-600 group-hover:bg-zinc-400"
                }`}
                animate={{ width: index === activeIndex ? 16 : 6 }}
              />
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => setManualPaused((current) => !current)}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
            aria-label={manualPaused ? "Resume screenshot rotation" : "Pause screenshot rotation"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {manualPaused ? (
                <motion.span key="play" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                  <Play className="h-3.5 w-3.5 fill-current" />
                </motion.span>
              ) : (
                <motion.span key="pause" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            type="button"
            onClick={showNextCard}
            className="group grid h-7 w-7 cursor-pointer place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
            aria-label="Show next screenshot"
          >
            <ArrowUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {screenshots[activeIndex]?.label}
      </p>
    </div>
  );
}
