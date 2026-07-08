import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const phrases = [
  "opening fast",
  "editing TSX projects",
  "jumping across packages",
  "running terminal agents",
  "fixing Problems",
  "reviewing Git graphs",
];

const rows = [
  ["editor.file", "TokenInspectorModal.tsx", "ready"],
  ["lsp.hover", "semantic token pipeline", "warm"],
  ["git.graph", "workspace branch history", "synced"],
  ["agent.term", "long running session", "stable"],
];

export default function WritingLoop() {
  const reduceMotion = useReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const phrase = phrases[phraseIndex] ?? phrases[0];
  const visibleText = useMemo(() => phrase.slice(0, charIndex), [charIndex, phrase]);

  useEffect(() => {
    if (reduceMotion) return;

    const atEnd = charIndex >= phrase.length;
    const atStart = charIndex <= 0;
    const delay = atEnd && !deleting ? 1850 : atStart && deleting ? 340 : deleting ? 48 : 92;

    const timer = window.setTimeout(() => {
      if (!deleting && atEnd) {
        setDeleting(true);
        return;
      }

      if (deleting && atStart) {
        setPhraseIndex((current) => (current + 1) % phrases.length);
        setDeleting(false);
        return;
      }

      setCharIndex((current) => current + (deleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [charIndex, deleting, phrase.length, reduceMotion]);

  useEffect(() => {
    setCharIndex((current) => Math.min(current, phrase.length));
  }, [phrase.length]);

  return (
    <section className="px-5 py-16">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,0.68fr)] lg:items-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-axon-muted">
            Axon is built for
          </p>
          <div className="mt-4 min-h-[8.5rem] text-4xl font-semibold leading-tight text-zinc-100 md:text-6xl">
            <span className="text-[#59c2ff]">{reduceMotion ? phrases[0] : visibleText}</span>
            <span className="ml-1 inline-block h-[0.82em] w-0.5 translate-y-1 bg-zinc-100" />
          </div>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-axon-muted">
            The workbench should communicate momentum: files open, language
            tooling answers, terminals keep running, and project surfaces stay
            tied to the same workspace.
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.1, duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-white/10 bg-[#0d1117] p-4 shadow-2xl shadow-black/40"
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-mono text-xs text-axon-muted">workspace loop</span>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-[#aad94c]">
              live
            </span>
          </div>
          <div className="grid gap-2">
            {rows.map(([source, detail, state], index) => (
              <motion.div
                key={source}
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * index, duration: 0.42 }}
                className="grid grid-cols-[6rem_minmax(0,1fr)_4rem] gap-3 rounded-lg bg-white/[0.035] px-3 py-2 font-mono text-xs"
              >
                <span className="text-[#d2a6ff]">{source}</span>
                <span className="truncate text-zinc-300">{detail}</span>
                <span className="text-right text-[#aad94c]">{state}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
