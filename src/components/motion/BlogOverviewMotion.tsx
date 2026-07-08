import { motion, useReducedMotion } from "framer-motion";

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
};

type Props = {
  posts: BlogPost[];
};

const categoryLabels = ["Architecture", "Editor", "Debugging", "Release", "Workbench"];

export default function BlogOverviewMotion({ posts }: Props) {
  const reduceMotion = useReducedMotion();
  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  if (!featuredPost) {
    return null;
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 px-5 py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-axon-muted">
              Axon Blog
            </div>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] text-zinc-100 md:text-7xl">
              Field notes from building a serious editor.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-axon-muted">
              Architecture writeups, release stories, debugging trails, and the
              hard-won details behind Axon’s editor, terminal, extension,
              language, and workbench systems.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {categoryLabels.map((label, index) => (
                <motion.a
                  key={label}
                  href="#latest"
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index, duration: 0.48 }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-sm text-axon-muted transition hover:border-white/25 hover:text-zinc-100"
                >
                  {label}
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.a
            href={`/blog/${featuredPost.slug}`}
            initial={reduceMotion ? false : { opacity: 0, x: 30 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ delay: 0.14, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            whileHover={reduceMotion ? undefined : { y: -5 }}
            className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] p-5 shadow-2xl shadow-black/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-axon-muted">
                Featured
              </span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-axon-muted">
                {featuredPost.readingTime}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-zinc-100">
              {featuredPost.title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-axon-muted">{featuredPost.excerpt}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {featuredPost.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-1 text-[11px] text-axon-muted">
                  {tag}
                </span>
              ))}
            </div>
            <span className="mt-6 inline-flex text-sm font-semibold text-zinc-100 transition group-hover:translate-x-1">
              Read the story →
            </span>
          </motion.a>
        </div>
      </section>

      <section id="latest" className="px-5 pb-24 pt-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-axon-muted">
                Latest notes
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100 md:text-3xl">
                What changed, broke, and finally worked
              </h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-axon-muted">
              {posts.length} posts
            </span>
          </div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: 0.09,
                },
              },
            }}
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {otherPosts.map((post, index) => (
              <motion.article
                key={post.slug}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
                className="group relative min-h-[22rem] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/25 hover:bg-white/[0.045]"
              >
                <div className="pointer-events-none absolute right-5 top-5 font-mono text-xs text-white/15 transition group-hover:text-white/30">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-axon-muted">
                  <span>{post.publishedAt}</span>
                  <span className="text-white/20">/</span>
                  <span>{post.readingTime}</span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold leading-tight text-zinc-100">
                  <a href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                    {post.title}
                  </a>
                </h3>
                <p className="mt-4 text-sm leading-6 text-axon-muted">{post.excerpt}</p>

                <div className="absolute inset-x-5 bottom-5">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-axon-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex -space-x-2">
                      {post.authors.map((author) => (
                        <img
                          key={author.name}
                          src={author.avatar}
                          alt={author.name}
                          className="h-7 w-7 rounded-full border border-[#0d1117]"
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-zinc-100 transition group-hover:translate-x-1">
                      Open →
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}
