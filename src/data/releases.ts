export const githubOwner = "GordenArcher";
export const githubRepo = "axon";
export const githubReleasesUrl = `https://github.com/${githubOwner}/${githubRepo}/releases`;
export const githubReleaseDocsUrl = `https://github.com/${githubOwner}/${githubRepo}/tree/main/docs/releases`;

export interface ReleaseAsset {
  name: string;
  platform: string;
  downloadUrl: string;
  size: number;
  contentType: string;
}

export interface Release {
  tag: string;
  title: string;
  summary: string;
  body: string;
  htmlUrl: string;
  publishedAt: string | null;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

const rawReleaseDocsBase = `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/main/docs/releases`;
const fallbackReleaseTags = [
  "v1.1.9",
  "v1.1.8",
  "v1.1.7",
  "v1.1.6",
  "v1.1.5",
  "v1.1.4",
  "v1.1.3",
  "v1.1.2",
  "v1.1.1",
  "v1.1.0",
  "v1.0.9",
  "v1.0.8",
  "v1.0.7",
  "v1.0.6",
  "v1.0.5",
  "v1.0.4",
  "v1.0.3",
  "v1.0.2",
  "v1.0.1",
  "v1.0.0",
];

function excerpt(body: string) {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return lines[0] ?? "";
}

function semverParts(tag: string) {
  const [, major = "0", minor = "0", patch = "0"] = tag.match(/^v?(\d+)\.(\d+)\.(\d+)/) ?? [];
  return [Number(major), Number(minor), Number(patch)];
}

function compareTags(left: string, right: string) {
  const leftParts = semverParts(left);
  const rightParts = semverParts(right);

  for (let index = 0; index < 3; index += 1) {
    const delta = rightParts[index] - leftParts[index];
    if (delta !== 0) return delta;
  }

  return right.localeCompare(left);
}

function titleFromMarkdown(tag: string, body: string) {
  const heading = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));

  return heading?.replace(/^#\s+/, "").trim() || `Axon ${tag}`;
}

function releaseAssetsForTag(tag: string): ReleaseAsset[] {
  const version = tag.replace(/^v/, "");
  const base = `${githubReleasesUrl}/download/${encodeURIComponent(tag)}`;
  const assets = [
    {
      name: `Axon-${version}-arm64.dmg`,
      platform: "macOS Apple Silicon",
      contentType: "application/x-apple-diskimage",
    },
    {
      name: `Axon-${version}.dmg`,
      platform: "macOS Intel",
      contentType: "application/x-apple-diskimage",
    },
    {
      name: `Axon.Setup.${version}.exe`,
      platform: "Windows",
      contentType: "application/vnd.microsoft.portable-executable",
    },
    {
      name: `Axon-${version}.AppImage`,
      platform: "Linux AppImage",
      contentType: "application/octet-stream",
    },
    {
      name: `axon_${version}_amd64.deb`,
      platform: "Debian / Ubuntu",
      contentType: "application/vnd.debian.binary-package",
    },
  ];

  return assets.map((asset) => ({
    ...asset,
    downloadUrl: `${base}/${encodeURIComponent(asset.name)}`,
    size: 0,
  }));
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function releaseTagsFromTreeHtml(html: string) {
  const tags = new Set<string>();
  const pattern = /(?:docs\/releases\/)?(v\d+\.\d+\.\d+(?:[-\w]*)?)\.md/g;

  for (const match of html.matchAll(pattern)) {
    tags.add(match[1]);
  }

  return [...tags].sort(compareTags);
}

async function loadReleaseBody(tag: string) {
  return fetchText(`${rawReleaseDocsBase}/${encodeURIComponent(tag)}.md`);
}

async function loadReleaseFromDoc(tag: string): Promise<Release | null> {
  const body = await loadReleaseBody(tag) ?? `## Axon ${tag}

Release notes for ${tag} are stored in the Axon repository under docs/releases.
Open the GitHub release for the complete published notes when the Markdown file
cannot be loaded during this build.`;

  return {
    tag,
    title: titleFromMarkdown(tag, body),
    summary: excerpt(body) || `Release notes for ${tag}.`,
    body,
    htmlUrl: `${githubReleasesUrl}/tag/${encodeURIComponent(tag)}`,
    publishedAt: null,
    prerelease: false,
    assets: releaseAssetsForTag(tag),
  };
}

export async function loadReleases(): Promise<Release[]> {
  const html = await fetchText(githubReleaseDocsUrl);
  const tags = html ? releaseTagsFromTreeHtml(html) : fallbackReleaseTags;
  const releases = await Promise.all(tags.map(loadReleaseFromDoc));

  return releases
    .filter((release): release is Release => Boolean(release))
    .sort((left, right) => compareTags(left.tag, right.tag));
}

export async function loadRelease(tag: string): Promise<Release | null> {
  return loadReleaseFromDoc(tag);
}
