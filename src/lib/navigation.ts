export interface NavItem {
  href: string;
  label: string;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export function getSidebarNav(): NavSection[] {
  return [
    {
      section: "Get started",
      items: [
        { href: "/docs", label: "Introduction" },
        { href: "/docs/getting-started/installation", label: "Installation" },
        { href: "/docs/getting-started/first-project", label: "First project" },
      ],
    },
    {
      section: "Learn",
      items: [
        { href: "/docs/features/editor", label: "Editor" },
        { href: "/docs/features/split-panes", label: "Split panes" },
        { href: "/docs/features/terminal", label: "Terminal" },
        { href: "/docs/features/axon-agent", label: "Axon Agent" },
        { href: "/docs/features/git", label: "Git integration" },
        { href: "/docs/features/search", label: "Search" },
      ],
    },
    {
      section: "Language servers",
      items: [
        { href: "/docs/language-servers", label: "Overview" },
        {
          href: "/docs/language-servers/typescript",
          label: "TypeScript/JavaScript",
        },
        { href: "/docs/language-servers/html", label: "HTML" },
        { href: "/docs/language-servers/css", label: "CSS/SCSS/Less" },
        { href: "/docs/language-servers/json", label: "JSON/JSONC" },
        { href: "/docs/language-servers/yaml", label: "YAML" },
        { href: "/docs/language-servers/tailwind", label: "Tailwind CSS" },
        { href: "/docs/language-servers/docker", label: "Docker" },
        { href: "/docs/language-servers/go", label: "Go" },
        { href: "/docs/language-servers/python", label: "Python" },
        { href: "/docs/language-servers/rust", label: "Rust" },
        { href: "/docs/language-servers/cpp", label: "C/C++" },
        { href: "/docs/language-servers/java", label: "Java" },
        { href: "/docs/language-servers/csharp", label: "C#" },
        { href: "/docs/language-servers/kotlin", label: "Kotlin" },
        { href: "/docs/language-servers/php", label: "PHP" },
        { href: "/docs/language-servers/lua", label: "Lua" },
      ],
    },
    {
      section: "Customization",
      items: [
        { href: "/docs/customization/themes", label: "Themes" },
        { href: "/docs/customization/settings", label: "Settings" },
        { href: "/docs/customization/keybindings", label: "Keybindings" },
        { href: "/docs/customization/extensions", label: "Extensions" },
      ],
    },
    {
      section: "Development",
      items: [
        { href: "/docs/development/building", label: "Building from source" },
        { href: "/docs/development/contributing", label: "Contributing" },
        { href: "/docs/development/release-process", label: "Release process" },
      ],
    },
  ];
}
