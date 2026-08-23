import { ArrowUpRight, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type BlogAuthor = {
  name: string;
  avatar: string;
};

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readingTime: string;
  tags: string[];
  authors: BlogAuthor[];
  coverImage: string;
  series?: string;
  seriesOrder?: number;
};

type Props = {
  posts: BlogPost[];
};

const filters = [
  { label: "All", tags: [] },
  { label: "Architecture", tags: ["Architecture"] },
  { label: "Editor", tags: ["Editor", "Monaco", "Buffers", "Large Files", "Syntax Highlighting"] },
  { label: "Terminal", tags: ["Terminal", "PTY", "Backpressure"] },
  { label: "Languages", tags: ["LSP", "Language Tools", "Language Intelligence", "Python", "Go", "gopls"] },
  { label: "Security", tags: ["Security", "Electron"] },
  { label: "Extensions", tags: ["Extensions", "Workbench", "API"] },
];
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function BlogOverviewMotion({ posts }: Props) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const featuredPost = posts[0];
  const architecturePosts = useMemo(
    () =>
      posts
        .filter((post) => post.series === "Inside Axon's Architecture")
        .sort((left, right) => (left.seriesOrder ?? 0) - (right.seriesOrder ?? 0)),
    [posts],
  );
  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      const selectedFilter = filters.find((filter) => filter.label === activeFilter);
      const matchesFilter =
        !selectedFilter ||
        selectedFilter.tags.length === 0 ||
        post.tags.some((tag) =>
          selectedFilter.tags.some((filterTag) => filterTag.toLowerCase() === tag.toLowerCase()),
        );
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [post.title, post.excerpt, post.series ?? "", ...post.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, posts, query]);

  if (!featuredPost) return null;

  return (
    <>
      <section className="overflow-hidden border-b border-white/10 px-5 pb-14 pt-12 md:pb-20 md:pt-18">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={false}
            className="grid gap-7 border-b border-white/10 pb-9 motion-safe:animate-[reveal-up_620ms_cubic-bezier(0.16,1,0.3,1)_both] lg:grid-cols-[minmax(0,0.8fr)_minmax(24rem,1.2fr)] lg:items-end"
          >
            <div>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase text-axon-muted">
                <span>Axon Journal</span>
                <span className="h-px w-8 bg-white/20" />
                <span>{posts.length} essays</span>
              </div>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.03] text-zinc-100 md:text-7xl">
                Engineering an editor in public.
              </h1>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-axon-muted lg:justify-self-end">
              Deep technical notes about buffers, terminals, language intelligence,
              security, extensions, and the decisions behind Axon&apos;s workbench.
            </p>
          </motion.div>

          <motion.a
            href={`/blog/${featuredPost.slug}`}
            initial={false}
            className="group mt-9 grid gap-7 motion-safe:animate-[reveal-up_720ms_80ms_cubic-bezier(0.16,1,0.3,1)_both] lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)] lg:items-stretch"
          >
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#09090a]">
              <img
                src={featuredPost.coverImage}
                alt={`Axon Editor accompanying ${featuredPost.title}`}
                className="aspect-video h-full w-full object-cover object-top"
              />
              <span className="absolute left-4 top-4 rounded-md border border-white/15 bg-black/80 px-2.5 py-1 text-xs font-semibold uppercase text-zinc-200 backdrop-blur">
                Lead story
              </span>
            </div>
            <div className="flex flex-col justify-between border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-axon-muted">
                  <span>{featuredPost.series ?? featuredPost.tags[0]}</span>
                  {featuredPost.seriesOrder ? <span>Part {featuredPost.seriesOrder}</span> : null}
                </div>
                <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-100 md:text-4xl">
                  {featuredPost.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-axon-muted">{featuredPost.excerpt}</p>
              </div>
              <div className="mt-8 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                <div className="text-xs leading-5 text-axon-muted">
                  <span className="block text-zinc-200">{formatDate(featuredPost.publishedAt)}</span>
                  <span>{featuredPost.readingTime}</span>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-100 transition group-hover:border-[var(--axon-accent)] group-hover:bg-[var(--axon-accent)] group-hover:text-[var(--axon-accent-ink)]">
                  <ArrowUpRight size={17} aria-hidden="true" />
                </span>
              </div>
            </div>
          </motion.a>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--axon-accent)]">Twelve-part series</p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100">Inside Axon&apos;s Architecture</h2>
            </div>
            <span className="text-sm text-axon-muted">Read in order or enter anywhere</span>
          </div>
          <div className="mt-7 flex snap-x gap-0 overflow-x-auto border-y border-white/10 [scrollbar-width:thin]">
            {architecturePosts.map((post) => (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group min-w-[17rem] snap-start border-r border-white/10 px-4 py-5 transition hover:bg-white/[0.035]"
              >
                <span className="font-mono text-xs text-axon-muted">{String(post.seriesOrder).padStart(2, "0")}</span>
                <strong className="mt-3 block text-sm leading-6 text-zinc-300 transition group-hover:text-white">
                  {post.title}
                </strong>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="archive" className="px-5 pb-24 pt-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 border-b border-white/10 pb-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--axon-accent)]">The archive</p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-100">All field notes</h2>
              <div className="mt-5 flex flex-wrap gap-1" role="group" aria-label="Filter blog posts">
                {filters.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() => setActiveFilter(filter.label)}
                    aria-pressed={activeFilter === filter.label}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition ${
                      activeFilter === filter.label
                        ? "bg-[var(--axon-accent)] text-[var(--axon-accent-ink)]"
                        : "text-axon-muted hover:bg-white/[0.05] hover:text-zinc-100"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="relative block">
              <span className="sr-only">Search blog posts</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-axon-muted" size={16} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search articles"
                className="h-11 w-full rounded-md border border-white/10 bg-white/[0.025] pl-10 pr-10 text-sm text-zinc-100 outline-none transition placeholder:text-axon-muted focus:border-white/30 focus:bg-white/[0.04]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-axon-muted transition hover:bg-white/[0.06] hover:text-zinc-100"
                  aria-label="Clear search"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </label>
          </div>

          <motion.div layout className="divide-y divide-white/10">
            {filteredPosts.map((post, index) => (
              <motion.article
                layout
                key={post.slug}
                initial={false}
                className="group relative grid gap-5 py-8 motion-safe:animate-[reveal-up_560ms_cubic-bezier(0.16,1,0.3,1)_both] md:grid-cols-[4rem_minmax(0,1fr)_15rem] md:items-center"
                style={{ animationDelay: `${Math.min(index * 35, 200)}ms` }}
              >
                <span className="font-mono text-xs text-axon-muted">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-axon-muted">
                    <span>{post.series ?? post.tags[0]}</span>
                    <span className="text-white/20">/</span>
                    <span>{formatDate(post.publishedAt)}</span>
                    <span className="text-white/20">/</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <h3 className="mt-3 max-w-3xl text-2xl font-semibold leading-tight text-zinc-200 transition group-hover:text-white md:text-3xl">
                    <a href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                      {post.title}
                    </a>
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-axon-muted">{post.excerpt}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs text-zinc-500">#{tag.toLowerCase().replaceAll(" ", "-")}</span>
                    ))}
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-md border border-white/10">
                  <img
                    src={post.coverImage}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover object-top opacity-85"
                  />
                </div>
              </motion.article>
            ))}
          </motion.div>

          {filteredPosts.length === 0 ? (
            <div className="border-b border-white/10 py-20 text-center">
              <p className="text-lg font-medium text-zinc-200">No articles match that search.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveFilter("All");
                }}
                className="mt-4 cursor-pointer text-sm text-axon-muted underline decoration-white/20 underline-offset-4 transition hover:text-white"
              >
                Reset the archive
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
