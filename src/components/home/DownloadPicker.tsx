import type { ReleaseAsset } from "@data/releases";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Download,
} from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface Props {
  assets: ReleaseAsset[];
  releaseTag?: string;
  menuPlacement?: "top" | "bottom";
}

type PlatformKey = "mac-arm" | "mac-intel" | "windows" | "linux" | "other";

function platformKey(platform: string): PlatformKey {
  const value = platform.toLowerCase();

  if (value.includes("apple silicon")) return "mac-arm";
  if (value.includes("intel")) return "mac-intel";
  if (value.includes("windows")) return "windows";
  if (value.includes("linux") || value.includes("debian") || value.includes("ubuntu")) return "linux";
  return "other";
}

function shortPlatform(platform: string) {
  if (platform === "macOS Apple Silicon") return "Mac Apple Silicon";
  if (platform === "macOS Intel") return "Mac Intel";
  return platform;
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const key = platformKey(platform);

  // These are the same recognizable platform marks used by the original
  // download control. Keeping them as React SVGs preserves the product-specific
  // identity while allowing color and size to follow the animated button state.
  if (key.startsWith("mac")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M16.6 13.2c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.1-1.8-1.3-.1-2.6.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.5 0 0-2.4-.9-2.4-3.2ZM14.5 6.8c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7 1 0 1.9-.5 2.5-1.3Z" />
      </svg>
    );
  }

  if (key === "windows") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M3 5.1 10.7 4v7.3H3V5.1Zm0 7.6h7.7V20L3 18.9v-6.2Zm9-8.9L21 2.5v8.8h-9V3.8Zm0 8.9h9v8.8l-9-1.3v-7.5Z" />
      </svg>
    );
  }

  if (key === "linux") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M12 2.5c-2.1 0-3.6 1.6-3.6 4.1 0 1.3.4 2.5.8 3.6-.9 1.3-1.6 3-2 4.8-.6.3-1.5 1-2.2 2.1-.7 1.2-.8 2.5-.3 3 .5.6 1.7.2 2.9-.6.4.8 1.7 1.4 4.4 1.4s4-.6 4.4-1.4c1.2.8 2.4 1.2 2.9.6.5-.5.4-1.8-.3-3-.7-1.1-1.6-1.8-2.2-2.1-.4-1.8-1.1-3.5-2-4.8.4-1.1.8-2.3.8-3.6 0-2.5-1.5-4.1-3.6-4.1Zm-1.4 4.3c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9Zm2.8 0c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9ZM12 9.2c.6 0 1 .3 1 .7 0 .5-.4.9-1 .9s-1-.4-1-.9c0-.4.4-.7 1-.7Z" />
      </svg>
    );
  }

  return <Download className={className} />;
}

function formattedSize(size: number) {
  return size > 0 ? `${(size / 1024 / 1024).toFixed(1)} MB` : "Release build";
}

async function detectPlatform(): Promise<PlatformKey> {
  const browserNavigator = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
      getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>;
    };
  };
  const uaData = browserNavigator.userAgentData;
  const platform = (uaData?.platform || navigator.platform || navigator.userAgent).toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes("win") || userAgent.includes("windows")) return "windows";
  if (platform.includes("linux") || userAgent.includes("linux")) return "linux";

  if (platform.includes("mac") || userAgent.includes("mac os")) {
    const details = uaData?.getHighEntropyValues
      ? await uaData.getHighEntropyValues(["architecture"]).catch(() => null)
      : null;
    return details?.architecture?.toLowerCase().includes("x86") ? "mac-intel" : "mac-arm";
  }

  return "other";
}

export default function DownloadPicker({
  assets,
  releaseTag,
  menuPlacement = "top",
}: Props) {
  const reduceMotion = useReducedMotion();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedAsset = assets[selectedIndex] ?? assets[0];

  useEffect(() => {
    // Browser platform detection runs after hydration because the server cannot
    // know which machine will render this static page. I only change the default
    // selection; every release asset remains available in the menu so detection
    // can never prevent someone from choosing a different architecture.
    void detectPlatform().then((detected) => {
      const exactIndex = assets.findIndex((asset) => platformKey(asset.platform) === detected);
      const macFallbackIndex = detected.startsWith("mac")
        ? assets.findIndex((asset) => platformKey(asset.platform).startsWith("mac"))
        : -1;
      const nextIndex = exactIndex >= 0 ? exactIndex : macFallbackIndex;
      if (nextIndex >= 0) setSelectedIndex(nextIndex);
    });
  }, [assets]);

  useEffect(() => {
    if (!open) return;

    // The old Astro dropdown depended on one document-level click handler and
    // data attributes shared by every instance. Scoping these listeners to this
    // open React component makes outside clicks and Escape deterministic, and
    // the cleanup prevents duplicate handlers after Astro page transitions.
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const focusOption = (index: number) => {
    const wrappedIndex = (index + assets.length) % assets.length;
    optionRefs.current[wrappedIndex]?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setOpen(true);
    window.requestAnimationFrame(() => focusOption(selectedIndex));
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(assets.length - 1);
    }
  };

  if (!selectedAsset) {
    return (
      <a
        href="/releases"
        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-semibold text-zinc-100 transition hover:border-white/25"
      >
        View release assets
        <Download className="h-4 w-4" />
      </a>
    );
  }

  return (
    <div ref={rootRef} className="relative z-50 w-full sm:w-[22rem]">
      <div className="axon-primary flex overflow-hidden rounded-xl border border-[var(--axon-accent)] shadow-[0_16px_48px_rgba(227,182,111,0.16)] transition">
        <motion.a
          href={selectedAsset.downloadUrl}
          className="group flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 text-left text-[#17120c]"
          whileHover={reduceMotion ? undefined : { x: 2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/10">
            <PlatformIcon platform={selectedAsset.platform} className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Download for {shortPlatform(selectedAsset.platform)}</span>
            <span className="mt-0.5 block truncate text-[11px] text-black/55">
              {releaseTag ? `${releaseTag} · ` : ""}{formattedSize(selectedAsset.size)}
            </span>
          </span>
        </motion.a>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
          className="grid w-13 cursor-pointer place-items-center border-l border-black/15 text-[#17120c] transition hover:bg-black/10"
          aria-label="Choose another download"
          aria-haspopup="listbox"
          aria-controls={menuId}
          aria-expanded={open}
        >
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: springEase }}>
            <ChevronDown className="h-4.5 w-4.5" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="listbox"
            aria-label="Choose a platform download"
            initial={reduceMotion ? false : {
              opacity: 0,
              y: menuPlacement === "top" ? 10 : -10,
              scale: 0.975,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : {
              opacity: 0,
              y: menuPlacement === "top" ? 8 : -8,
              scale: 0.98,
            }}
            transition={{ duration: 0.24, ease: springEase }}
            className={`absolute right-0 z-[60] w-full overflow-hidden rounded-xl border border-white/12 bg-[#0c0c0b]/98 p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
              menuPlacement === "top"
                ? "bottom-[calc(100%+0.65rem)] origin-bottom"
                : "top-[calc(100%+0.65rem)] origin-top"
            }`}
          >
            <div className="px-2.5 pb-2 pt-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">Choose your build</p>
            </div>
            {assets.map((asset, index) => {
              const selected = index === selectedIndex;

              return (
                <button
                  key={asset.downloadUrl}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setSelectedIndex(index);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className="group grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-white/[0.055] focus:bg-white/[0.055] focus:outline-none"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.07] bg-white/[0.025] text-zinc-500 group-hover:text-zinc-200">
                    <PlatformIcon platform={asset.platform} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-200">{shortPlatform(asset.platform)}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-zinc-600">{asset.name}</span>
                  </span>
                  <span className="grid h-5 w-5 place-items-center text-[var(--axon-accent)]">
                    {selected && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const springEase = [0.16, 1, 0.3, 1] as const;
