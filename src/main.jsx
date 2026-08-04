import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const operatorGroups = [
  {
    category: "Domain scope",
    operators: [
      {
        token: "site:",
        syntax: "site:example.com",
        example: "site:example.com",
        explanation: "Limits results to one domain or subdomain.",
        combine: "Pair with content operators to keep reviews tightly scoped.",
        limitations: "This only reflects pages currently indexed by Google.",
      },
      {
        token: "related:",
        syntax: "related:example.com",
        example: "related:example.com",
        explanation: "Shows sites Google considers related to a domain.",
        combine:
          "Use as a discovery prompt, then return to a specific domain for focused results.",
        limitations:
          "Results are not a definitive list of related organizations.",
      },
    ],
  },
  {
    category: "Content",
    operators: [
      {
        token: "filetype:",
        syntax: "filetype:pdf",
        example: "site:example.com filetype:pdf",
        explanation: "Filters results by a file extension.",
        combine: "Use after site:example.com to focus on one type of document.",
        limitations: "Extensions and indexing can be incomplete.",
      },
      {
        token: "intext:",
        syntax: 'intext:"help center"',
        example: 'site:example.com intext:"help center"',
        explanation: "Finds pages containing a word or phrase in body text.",
        combine: "Quotes make multi-word terms more precise.",
        limitations: "Google controls how it interprets page text.",
      },
      {
        token: "allintext:",
        syntax: "allintext: support status",
        example: "site:example.com allintext: support status",
        explanation: "Requests all terms appear in the page text.",
        combine: "Use short, descriptive terms after the operator.",
        limitations:
          "Avoid mixing it with unrelated operators in the same clause.",
      },
    ],
  },
  {
    category: "URL/path",
    operators: [
      {
        token: "inurl:",
        syntax: "inurl:help",
        example: "site:example.com inurl:help",
        explanation: "Finds a term in a result URL.",
        combine: "Use a recognizable public route such as help or support.",
        limitations: "URL structure varies and some URLs are normalized.",
      },
      {
        token: "allinurl:",
        syntax: "allinurl: docs api",
        example: "site:example.com allinurl: docs api",
        explanation: "Requests every following term appear in the URL.",
        combine: "Keep the path terms brief and intentional.",
        limitations: "Google may treat punctuation and URL words differently.",
      },
    ],
  },
  {
    category: "Title",
    operators: [
      {
        token: "intitle:",
        syntax: 'intitle:"release notes"',
        example: 'site:example.com intitle:"release notes"',
        explanation: "Finds pages with a term or phrase in the title.",
        combine: "Pair with site:example.com to inventory public page types.",
        limitations: "Titles may not match the visible page heading.",
      },
      {
        token: "allintitle:",
        syntax: "allintitle: product updates",
        example: "site:example.com allintitle: product updates",
        explanation: "Requests all following terms appear in a result title.",
        combine: "Use it for a concise, specific title phrase.",
        limitations: "Results depend on Google’s title processing.",
      },
    ],
  },
  {
    category: "Boolean logic",
    operators: [
      {
        token: "OR",
        syntax: "support OR help",
        example: "site:example.com (support OR help)",
        explanation: "Matches either of two alternatives. Use uppercase OR.",
        combine: "Wrap alternatives in parentheses for readable grouped logic.",
        limitations: "Very broad alternatives can dilute scoped results.",
      },
      {
        token: "quotes",
        syntax: '"exact phrase"',
        example: 'site:example.com "release notes"',
        explanation: "Looks for an exact phrase.",
        combine: "Combine with site: to make a narrow, specific search.",
        limitations: "Small wording changes may omit useful pages.",
      },
      {
        token: "parentheses",
        syntax: "(support OR help)",
        example: "site:example.com (inurl:help OR inurl:support)",
        explanation: "Groups clauses so the query’s logic is clear.",
        combine: "Use around OR clauses or paired route alternatives.",
        limitations:
          "Nested logic is interpreted by the search engine, not this app.",
      },
    ],
  },
  {
    category: "Exclusions",
    operators: [
      {
        token: "minus exclusion",
        syntax: "-blog",
        example: "site:example.com -blog",
        explanation: "Excludes a word or route from results.",
        combine:
          "Use to remove a known public section from a focused domain search.",
        limitations: "An exclusion may not remove every related result.",
      },
    ],
  },
];

const navigation = [
  ["Dashboard", "grid"],
  ["Query Builder", "spark"],
  ["Operator Library", "library"],
  ["Saved Queries", "bookmark"],
  ["History", "clock"],
  ["Settings", "settings"],
];

const engineLibraries = {
  Google: {
    label: "Google Search",
    operators: operatorGroups.flatMap((group) =>
      group.operators.map((operator) => ({
        ...operator,
        category: group.category,
      })),
    ),
  },
  Bing: {
    label: "Bing Search",
    operators: [
      {
        token: "site:",
        category: "Domain scope",
        syntax: "site:example.com",
        example: "site:example.com support",
        explanation: "Restricts results to one website or subdomain.",
        combine: "Add a public topic or a file filter after the domain.",
        limitations:
          "Results depend on Bing indexing and regional availability.",
      },
      {
        token: "filetype:",
        category: "Content",
        syntax: "filetype:pdf",
        example: "site:example.com filetype:pdf",
        explanation: "Limits results to a file extension.",
        combine: "Pair it with site: for a focused document review.",
        limitations: "Not every published file is indexed.",
      },
      {
        token: "ext:",
        category: "Content",
        syntax: "ext:pdf",
        example: "site:example.com ext:pdf",
        explanation: "Filters results by file extension.",
        combine: "Use it as an alternative to filetype: for common documents.",
        limitations: "Use one extension per filter.",
      },
      {
        token: "intitle:",
        category: "Title",
        syntax: "intitle:help",
        example: "site:example.com intitle:help",
        explanation: "Finds a word in the page title.",
        combine: "Repeat the operator for additional title words.",
        limitations: "Bing accepts one term per intitle: keyword.",
      },
      {
        token: "inbody:",
        category: "Text",
        syntax: "inbody:support",
        example: "site:example.com inbody:support",
        explanation: "Finds a word in the page body.",
        combine: "Use a distinctive public term to keep results useful.",
        limitations: "Bing accepts one term per inbody: keyword.",
      },
      {
        token: "contains:",
        category: "Content",
        syntax: "contains:pdf",
        example: "site:example.com contains:pdf",
        explanation: "Finds pages linking to a chosen file type.",
        combine: "Add site: to limit linked files to one website.",
        limitations:
          "It matches links in indexed pages, not the files themselves.",
      },
      {
        token: "language:",
        category: "Language",
        syntax: "language:en",
        example: "site:example.com language:en",
        explanation: "Prefers a language for results.",
        combine: "Place it beside a scoped domain and topic.",
        limitations: "Language detection can be imperfect.",
      },
      {
        token: "url:",
        category: "URL/path",
        syntax: "url:example.com/docs",
        example: "url:example.com/docs",
        explanation: "Finds an exact URL or URL path.",
        combine: "Use an exact public path when you know it.",
        limitations: "Exact matching can omit alternate URL forms.",
      },
    ],
  },
  Yandex: {
    label: "Yandex Search",
    operators: [
      {
        token: "site:",
        category: "Domain scope",
        syntax: "site:example.com",
        example: "site:example.com support",
        explanation: "Limits results to a domain, host, or part of a URL.",
        combine: "Add a public topic after the scope.",
        limitations: "Results depend on Yandex indexing.",
      },
      {
        token: "host:",
        category: "Domain scope",
        syntax: "host:www.example.com",
        example: "host:www.example.com help",
        explanation: "Limits results to one exact host.",
        combine: "Use it when a subdomain matters.",
        limitations: "It does not include other subdomains.",
      },
      {
        token: "url:",
        category: "URL/path",
        syntax: "url:example.com/docs/*",
        example: "url:example.com/docs/* guide",
        explanation: "Matches a URL pattern.",
        combine: "Use a simple public path and an optional keyword.",
        limitations: "Pattern matching follows Yandex URL rules.",
      },
      {
        token: "domain:",
        category: "Domain scope",
        syntax: "domain:com",
        example: 'domain:com "example"',
        explanation: "Limits results by domain-zone suffix.",
        combine: "Use it with a distinctive public topic.",
        limitations: "This is broader than a single website.",
      },
      {
        token: "mime:",
        category: "Content",
        syntax: "mime:pdf",
        example: "site:example.com mime:pdf",
        explanation: "Filters results by document MIME type.",
        combine: "Pair it with site: for public documents on one domain.",
        limitations: "Availability depends on indexed document metadata.",
      },
      {
        token: "lang:",
        category: "Language",
        syntax: "lang:en",
        example: "site:example.com lang:en",
        explanation: "Limits results to a language.",
        combine: "Use it beside a domain and content term.",
        limitations: "Language classification is determined by Yandex.",
      },
      {
        token: "date:",
        category: "Date",
        syntax: "date:20250101..20251231",
        example: "site:example.com date:20250101..20251231",
        explanation: "Filters results to a date or date range.",
        combine: "Use YYYYMMDD ranges when comparing recent public pages.",
        limitations: "Dates are based on search-engine metadata.",
      },
    ],
  },
  GitHub: {
    label: "GitHub Code Search",
    operators: [
      {
        token: "repo:",
        category: "Repository scope",
        syntax: "repo:octocat/Hello-World",
        example: "repo:octocat/Hello-World path:README",
        explanation: "Restricts code search to one public repository.",
        combine: "Pair it with path:, language:, or a normal search term.",
        limitations: "Only content GitHub makes searchable is returned.",
      },
      {
        token: "org:",
        category: "Repository scope",
        syntax: "org:github",
        example: "org:github language:javascript",
        explanation:
          "Restricts code search to repositories in an organization.",
        combine: "Add language: or path: to narrow public code.",
        limitations: "Results depend on repository visibility and indexing.",
      },
      {
        token: "user:",
        category: "Repository scope",
        syntax: "user:octocat",
        example: "user:octocat path:docs",
        explanation: "Restricts code search to repositories owned by one user.",
        combine: "Pair with a public directory or language.",
        limitations: "Only searchable repositories are included.",
      },
      {
        token: "path:",
        category: "Path",
        syntax: "path:docs",
        example: "repo:octocat/Hello-World path:README",
        explanation: "Matches files under a path or with a matching filename.",
        combine: "Use it with repo: or org: for a clear scope.",
        limitations: "Path matching follows GitHub Code Search rules.",
      },
      {
        token: "language:",
        category: "Language",
        syntax: "language:javascript",
        example: "org:github language:javascript",
        explanation: "Filters code by programming language.",
        combine: "Use it with a repository scope when possible.",
        limitations: "Language recognition is based on GitHub classification.",
      },
      {
        token: "content:",
        category: "Content",
        syntax: 'content:"getting started"',
        example: 'repo:octocat/Hello-World content:"getting started"',
        explanation: "Makes a term or phrase apply to file content.",
        combine: "Use quoted phrases for exact public wording.",
        limitations:
          "It searches indexed code content, not repository metadata.",
      },
      {
        token: "symbol:",
        category: "Symbols",
        syntax: "symbol:main",
        example: "repo:octocat/Hello-World symbol:main",
        explanation: "Searches for a named code symbol.",
        combine:
          "Pair with repo: and language: when looking through a known project.",
        limitations: "Support varies by language and symbol indexing.",
      },
      {
        token: "is:",
        category: "Repository state",
        syntax: "is:archived",
        example: "org:github is:archived",
        explanation: "Filters by repository state, such as archived or forked.",
        combine: "Use is:archived or is:fork with an organization scope.",
        limitations: "Use one supported state value at a time.",
      },
    ],
  },
  "Wayback Machine": {
    label: "Wayback Machine CDX",
    operators: [
      {
        token: "url=",
        category: "URL scope",
        syntax: "url=example.com",
        example: "url=example.com&matchType=domain",
        explanation: "Sets the site or URL pattern for a CDX index lookup.",
        combine: "Use it with matchType=domain for a whole public domain.",
        limitations:
          "This is a URL parameter for the CDX index, not a web-search operator.",
      },
      {
        token: "matchType=",
        category: "URL scope",
        syntax: "matchType=domain",
        example: "url=example.com&matchType=domain",
        explanation: "Chooses exact, prefix, host, or domain URL matching.",
        combine: "Add it after url= to control the archival scope.",
        limitations: "Match behavior follows the CDX server implementation.",
      },
      {
        token: "from=",
        category: "Time range",
        syntax: "from=2020",
        example: "url=example.com&from=2020&to=2021",
        explanation: "Sets the start of an archival time range.",
        combine: "Use it with to= to compare two years.",
        limitations: "Dates limit index records, not page content.",
      },
      {
        token: "to=",
        category: "Time range",
        syntax: "to=2021",
        example: "url=example.com&from=2020&to=2021",
        explanation: "Sets the end of an archival time range.",
        combine: "Pair it with from= for a bounded range.",
        limitations: "Available captures vary by URL and time.",
      },
      {
        token: "output=",
        category: "Response format",
        syntax: "output=json",
        example: "url=example.com&output=json",
        explanation: "Chooses the response format from the CDX index.",
        combine:
          "Use output=json when working with a response programmatically.",
        limitations: "This changes the response format only.",
      },
      {
        token: "filter=",
        category: "Results",
        syntax: "filter=statuscode:200",
        example: "url=example.com&filter=statuscode:200",
        explanation: "Filters index records by a field and value.",
        combine:
          "Use a simple status filter when reviewing successful captures.",
        limitations: "Filtering depends on indexed capture fields.",
      },
      {
        token: "collapse=",
        category: "Results",
        syntax: "collapse=timestamp:8",
        example: "url=example.com&collapse=timestamp:8",
        explanation: "Collapses near-duplicate captures by a field prefix.",
        combine:
          "Use a timestamp collapse to make long timelines easier to review.",
        limitations:
          "Collapsing removes repeated index rows from the response.",
      },
      {
        token: "limit=",
        category: "Results",
        syntax: "limit=10",
        example: "url=example.com&limit=10",
        explanation: "Limits the number of returned index records.",
        combine: "Use a small limit while inspecting a new query.",
        limitations: "It does not change which records exist in the archive.",
      },
    ],
  },
  "Social platforms": {
    label: "Social platform paths",
    operators: [
      {
        token: "Instagram posts (/p/)",
        insert: 'site:instagram.com/p/ ""',
        category: "Instagram",
        syntax: 'site:instagram.com/p/ "yourusername"',
        example: 'site:instagram.com/p/ "yourusername"',
        explanation: "Searches Google results limited to Instagram post URLs.",
        combine: "Replace yourusername with a distinct public name or phrase.",
        limitations:
          "Results only include public post pages Google has indexed.",
      },
      {
        token: "Instagram reels (/reel/)",
        insert: 'site:instagram.com/reel/ ""',
        category: "Instagram",
        syntax: 'site:instagram.com/reel/ "yourusername"',
        example: 'site:instagram.com/reel/ "yourusername"',
        explanation: "Searches Google results limited to Instagram reel URLs.",
        combine:
          "Use an exact username or a phrase from a public caption or comment.",
        limitations:
          "Instagram may limit what search engines can crawl or retain.",
      },
      {
        token: "Instagram public pages",
        insert: 'site:instagram.com ""',
        category: "Instagram",
        syntax: 'site:instagram.com "yourusername"',
        example: 'site:instagram.com "yourusername"',
        explanation:
          "Searches public Instagram pages without restricting the URL type.",
        combine:
          "Use this first, then switch to /p/ or /reel/ when results are too broad.",
        limitations:
          "It does not confirm that every visible Instagram page is indexed.",
      },
      {
        token: "Facebook public posts",
        insert: 'site:facebook.com inurl:posts ""',
        category: "Facebook",
        syntax: 'site:facebook.com inurl:posts "yourusername"',
        example: 'site:facebook.com inurl:posts "yourusername"',
        explanation: "Focuses on Facebook URLs that contain the posts route.",
        combine: "Add a public name or a distinctive post phrase in quotes.",
        limitations:
          "Facebook visibility settings and indexing can leave gaps in results.",
      },
      {
        token: "Facebook reels (/reel/)",
        insert: 'site:facebook.com/reel/ ""',
        category: "Facebook",
        syntax: 'site:facebook.com/reel/ "yourusername"',
        example: 'site:facebook.com/reel/ "yourusername"',
        explanation: "Searches Google results limited to Facebook reel URLs.",
        combine:
          "Use a public creator name or a phrase from the reel description.",
        limitations: "Only public reels that Google indexed can appear.",
      },
      {
        token: "X posts (/status/)",
        insert: 'site:x.com inurl:status ""',
        category: "X / Twitter",
        syntax: 'site:x.com inurl:status "yourusername"',
        example: 'site:x.com inurl:status "yourusername"',
        explanation: "Focuses on X post URLs that contain the status route.",
        combine:
          "Pair it with an exact public handle or a distinctive post phrase.",
        limitations: "X indexing and result visibility can change over time.",
      },
      {
        token: "Legacy Twitter posts (/status/)",
        insert: 'site:twitter.com inurl:status ""',
        category: "X / Twitter",
        syntax: 'site:twitter.com inurl:status "yourusername"',
        example: 'site:twitter.com inurl:status "yourusername"',
        explanation:
          "Searches older Twitter-domain post URLs that remain in Google.",
        combine:
          "Use alongside the X query when looking at older indexed pages.",
        limitations:
          "The older twitter.com domain may return fewer or redirected results.",
      },
    ],
  },
};

const allLibraryOperators = Object.entries(engineLibraries).flatMap(
  ([engine, library]) =>
    library.operators.map((operator) => ({ ...operator, engine })),
);

function buildEngineSearchUrl(engine, rawQuery) {
  const query = rawQuery.trim();
  if (engine === "Bing")
    return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  if (engine === "Yandex")
    return `https://yandex.com/search/?text=${encodeURIComponent(query)}`;
  if (engine === "GitHub")
    return `https://github.com/search?type=code&q=${encodeURIComponent(query)}`;
  if (engine === "Wayback Machine") {
    const parameters = new URLSearchParams(query.replace(/^\?/, ""));
    return `https://web.archive.org/cdx/search/cdx?${parameters.toString()}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

const defaultPrefs = {
  comfortable: true,
  reminders: true,
  history: true,
  theme: "dark",
};

function useBackendWorkspace() {
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/workspace")
      .then((response) => {
        if (!response.ok)
          throw new Error("The local data service is unavailable.");
        return response.json();
      })
      .then((data) => {
        if (active) setWorkspace(data);
      })
      .catch(() => {
        if (active)
          setError(
            "Could not reach the local data service. Start dorkA with the desktop launcher and refresh this page.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const updateCollection =
    (key, endpoint, bodyKey = key) =>
    (updater) => {
      setWorkspace((current) => {
        if (!current) return current;
        const value =
          typeof updater === "function" ? updater(current[key]) : updater;
        const next = { ...current, [key]: value };
        fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [bodyKey]: value }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("Save failed");
            setError("");
          })
          .catch(() =>
            setError(
              "That change is visible here, but could not be saved to the local data service.",
            ),
          );
        return next;
      });
    };

  return {
    workspace,
    error,
    clearError: () => setError(""),
    setSaved: updateCollection("saved", "/api/saved-queries"),
    setHistory: updateCollection("history", "/api/history"),
    setPrefs: updateCollection("prefs", "/api/preferences"),
  };
}

function Icon({ name, size = 18, stroke = 1.8 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3-1.9 6.1L4 11l6.1 1.9L12 19l1.9-6.1L20 11l-6.1-1.9L12 3Z" />
        <path d="m19 16-.6 1.8L17 18.5l1.4.6L19 21l.6-1.9 1.4-.6-1.4-.7L19 16Z" />
      </>
    ),
    library: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H21" />
        <path d="M6.5 2H21v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    bookmark: (
      <path d="M6 3.8A1.8 1.8 0 0 1 7.8 2h8.4A1.8 1.8 0 0 1 18 3.8V22l-6-3.6L6 22V3.8Z" />
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    moon: (
      <path d="M20.5 15.1A8.8 8.8 0 0 1 8.9 3.5 8.9 8.9 0 1 0 20.5 15.1Z" />
    ),
    external: (
      <>
        <path d="M14 4h6v6" />
        <path d="m20 4-9 9" />
        <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="11" height="12" rx="1.5" />
        <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    filter: <path d="M4 5h16l-6.2 7v5.2l-3.6 1.8V12L4 5Z" />,
    heart: (
      <path d="M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6A4.4 4.4 0 0 1 11 5.8L12 7l1-1.2a4.4 4.4 0 0 1 7.8 2.8Z" />
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 14h10l1-14" />
      </>
    ),
    duplicate: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="1" />
        <path d="M16 8V5h-11a1 1 0 0 0-1 1v11h4" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    shield: (
      <path d="M12 3 20 6v5.7c0 5-3.4 8.1-8 9.9-4.6-1.8-8-4.9-8-9.9V6l8-3Z" />
    ),
    alert: (
      <>
        <path d="M12 3 2.8 19h18.4L12 3Z" />
        <path d="M12 9v4M12 16.5v.1" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8v.1" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    eye: (
      <>
        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  };
  return <svg {...props}>{paths[name] || paths.info}</svg>;
}

function BrandMark({ small = false }) {
  return (
    <svg
      className={`brand-mark ${small ? "brand-mark-small" : ""}`}
      viewBox="0 0 64 64"
      aria-label="dA app mark"
      role="img"
    >
      <rect x="2" y="2" width="60" height="60" rx="17" fill="#0e0e11" />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="16.25"
        stroke="#e53935"
        strokeOpacity="0.34"
        strokeWidth="1.5"
      />
      <path
        d="M34 13v20.8c0 10.1-5.5 16.3-14.1 16.3C11.9 50.1 6 43.8 6 34.7s5.9-15.3 13.9-15.3c5.8 0 10.2 2.8 14.1 7.4"
        fill="none"
        stroke="#e53935"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6.3"
      />
      <path
        d="M34 49 46.5 14l11.8 35M39.2 36.5h14.5"
        fill="none"
        stroke="#ff8d89"
        strokeLinecap="round"
        strokeLinejoin="miter"
        strokeWidth="5.2"
      />
      <circle cx="34" cy="13" r="3.15" fill="#ff6b66" />
    </svg>
  );
}

function formatDate(date) {
  const value = new Date(date);
  const diff = Math.floor((Date.now() - value.getTime()) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function extractScope(query, engine = "Google") {
  if (engine === "GitHub")
    return query.match(/\b(?:repo|org|user):([^\s)]+)/i)?.[1] || "";
  if (engine === "Wayback Machine")
    return query.match(/(?:^|&)url=([^&\s]+)/i)?.[1] || "";
  if (engine === "Yandex")
    return query.match(/\b(?:site|host|url):([^\s)]+)/i)?.[1] || "";
  return query.match(/\bsite:([^\s)]+)/i)?.[1] || "";
}

function validateQuery(query, engine = "Google") {
  const warnings = [];
  const trimmed = query.trim();
  if (!trimmed) return warnings;
  if ((trimmed.match(/(?<!\\)"/g) || []).length % 2)
    warnings.push("Unbalanced quotation marks - add a closing quote.");
  const opens = (trimmed.match(/\(/g) || []).length;
  const closes = (trimmed.match(/\)/g) || []).length;
  if (opens !== closes)
    warnings.push("Unbalanced parentheses - check grouped conditions.");
  if (engine === "Wayback Machine") {
    if (/(?:^|&)url=(?=&|$)/i.test(trimmed))
      warnings.push("url= needs a domain or URL value.");
    if (!/(?:^|&)url=[^&\s]+/i.test(trimmed))
      warnings.push("Add url=example.com to define the archive scope.");
    return warnings;
  }
  const emptyCommand = engineLibraries[engine].operators
    .filter((operator) => operator.token.endsWith(":"))
    .map((operator) => operator.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (
    emptyCommand &&
    new RegExp(`\\b(?:${emptyCommand})(?=\\s|$)`, "i").test(trimmed)
  )
    warnings.push("One or more commands need a value after the colon.");
  const scopeExamples = {
    Google: "site:example.com",
    Bing: "site:example.com",
    Yandex: "site:example.com",
    GitHub: "repo:octocat/Hello-World",
    "Social platforms": "site:instagram.com/p/",
  };
  if (!extractScope(trimmed, engine))
    warnings.push(
      `This is broad. Add ${scopeExamples[engine]} to make the result set more focused.`,
    );
  return warnings;
}

function Tag({ children, muted = false }) {
  return <span className={`tag ${muted ? "tag-muted" : ""}`}>{children}</span>;
}

function Button({
  children,
  className = "",
  variant = "secondary",
  icon,
  ...props
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </button>
  );
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  return (
    <div className={`toast toast-${type}`} role="status">
      <Icon name={type === "error" ? "alert" : "check"} size={17} />
      <span>{message}</span>
      <button aria-label="Dismiss notification" onClick={onDismiss}>
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}

function EmptyState({ icon = "bookmark", title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

function QueryComposer({
  query,
  setQuery,
  onOpen,
  onCopy,
  onClear,
  onSave,
  compact = false,
}) {
  const warnings = validateQuery(query);
  return (
    <section className={`composer panel ${compact ? "composer-compact" : ""}`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Manual query composer</span>
        </div>
        <span className="key-hint">
          <kbd>⌘</kbd>
          <kbd>↵</kbd> to open
        </span>
      </div>
      <div
        className={`query-input-wrap ${warnings.length ? "has-warning" : ""}`}
      >
        <Icon name="search" size={18} />
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search query"
          placeholder="site:example.com filetype:pdf"
          rows={compact ? 2 : 3}
        />
        {query && (
          <button
            className="input-clear"
            aria-label="Clear query"
            onClick={onClear}
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </div>
      {warnings.length > 0 && (
        <div className="validation-line">
          <Icon name="alert" size={15} />
          <span>{warnings[0]}</span>
        </div>
      )}
      <div className="composer-actions">
        <Button variant="primary" icon="external" onClick={() => onOpen(query)}>
          Open in browser
        </Button>
        <Button icon="copy" onClick={() => onCopy(query)}>
          Copy query
        </Button>
        <Button icon="bookmark" onClick={() => onSave(query)}>
          Save
        </Button>
        <button className="text-button" onClick={onClear}>
          Clear
        </button>
      </div>
      {!compact && (
        <div className="composer-note">
          <Icon name="external" size={16} />
          <span>The browser opens only the exact query you choose.</span>
        </div>
      )}
    </section>
  );
}

function Dashboard({
  query,
  setQuery,
  saved,
  history,
  onOpen,
  onCopy,
  onClear,
  onSave,
  setPage,
}) {
  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero">
        <div className="hero-kicker">
          <span className="pulse-dot"></span>SEARCH-OPERATOR WORKSPACE
        </div>
        <h1>
          Search with clarity.
          <br />
          <span>Find what matters.</span>
        </h1>
        <p>
          Build focused queries, compare commands across engines, and keep the
          useful ones close at hand.
        </p>
      </section>
      <QueryComposer
        {...{ query, setQuery, onOpen, onCopy, onClear, onSave }}
      />
      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Activity</span>
              <h2>Recent queries</h2>
            </div>
            <button className="link-button" onClick={() => setPage("History")}>
              View history <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="recent-list">
            {history.slice(0, 4).map((item) => (
              <button
                className="recent-row"
                key={item.id}
                onClick={() => setQuery(item.query)}
              >
                <div className="recent-query">
                  <code>{item.query}</code>
                  <span>{item.scope || "Unscoped"}</span>
                </div>
                <time>{formatDate(item.timestamp)}</time>
                <Icon name="arrow" size={15} />
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="summary-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">Your workspace</span>
            <h2>Saved query overview</h2>
          </div>
          <Button icon="arrow" onClick={() => setPage("Saved Queries")}>
            View all
          </Button>
        </div>
        <div className="summary-grid">
          <div className="summary-card panel">
            <div className="summary-head">
              <span>Saved queries</span>
              <Icon name="bookmark" size={17} />
            </div>
            <strong>{saved.length.toString().padStart(2, "0")}</strong>
            <p>Reusable, scoped search recipes</p>
          </div>
          <div className="summary-card panel">
            <div className="summary-head">
              <span>Favorites</span>
              <Icon name="heart" size={17} />
            </div>
            <strong>
              {saved
                .filter((item) => item.favorite)
                .length.toString()
                .padStart(2, "0")}
            </strong>
            <p>Quick access to important reviews</p>
          </div>
          <div className="summary-card panel">
            <div className="summary-head">
              <span>Active scopes</span>
              <Icon name="shield" size={17} />
            </div>
            <strong>
              {new Set(saved.map((item) => item.scope).filter(Boolean)).size
                .toString()
                .padStart(2, "0")}
            </strong>
            <p>Domains represented in saved work</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function QueryBuilder({
  query,
  setQuery,
  onCopy,
  onOpen,
  onSave,
  builderEngine,
  setBuilderEngine,
}) {
  const [activeGroup, setActiveGroup] = useState("All");
  const library = engineLibraries[builderEngine];
  const categories = [
    ...new Set(library.operators.map((operator) => operator.category)),
  ];
  const filteredGroups = categories
    .filter((category) => activeGroup === "All" || activeGroup === category)
    .map((category) => ({
      category,
      operators: library.operators.filter(
        (operator) => operator.category === category,
      ),
    }));
  const chooseEngine = (event) => {
    setBuilderEngine(event.target.value);
    setActiveGroup("All");
  };
  const insertOperator = (operator) => {
    const googleInsertions = {
      "site:": "site:",
      "filetype:": "filetype:",
      "intitle:": 'intitle:"" ',
      "allintitle:": "allintitle: ",
      "inurl:": "inurl:",
      "allinurl:": "allinurl: ",
      "intext:": 'intext:"" ',
      "allintext:": "allintext: ",
      "related:": "related:",
      OR: "OR",
      quotes: '""',
      "minus exclusion": "-",
      parentheses: "()",
    };
    const insertion =
      operator.insert ??
      (builderEngine === "Google"
        ? (googleInsertions[operator.token] ?? operator.token)
        : operator.token);
    setQuery((current) => {
      if (!current) return insertion;
      const separator =
        builderEngine === "Wayback Machine"
          ? current.endsWith("&")
            ? ""
            : "&"
          : current.endsWith(" ")
            ? ""
            : " ";
      return `${current}${separator}${insertion}`;
    });
  };
  const warnings = validateQuery(query, builderEngine);
  return (
    <div className="page builder-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">Operator studio</span>
          <h1>Query Builder</h1>
          <p>
            Choose an engine, compose its commands, then open it when ready.
          </p>
        </div>
      </div>
      <div className="builder-layout">
        <section className="panel operator-picker">
          <div className="panel-heading builder-heading">
            <div>
              <h2>Choose a command</h2>
              <p>Click a command to add its syntax to the query.</p>
            </div>
            <label className="engine-picker builder-engine-picker">
              <span>Search engine</span>
              <select
                value={builderEngine}
                onChange={chooseEngine}
                aria-label="Choose a search engine for Query Builder"
              >
                {Object.entries(engineLibraries).map(([name, item]) => (
                  <option key={name} value={name}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={15} />
            </label>
          </div>
          <div className="category-tabs" aria-label="Command categories">
            {["All", ...categories].map((category) => (
              <button
                key={category}
                onClick={() => setActiveGroup(category)}
                className={activeGroup === category ? "active" : ""}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="operator-stack">
            {filteredGroups.map((group) => (
              <div className="operator-group" key={group.category}>
                <span className="group-label">{group.category}</span>
                {group.operators.map((operator) => (
                  <button
                    className="operator-chip"
                    key={operator.token}
                    onClick={() => insertOperator(operator)}
                  >
                    <span>
                      <code>{operator.token}</code>
                      <small>{operator.explanation}</small>
                    </span>
                    <Icon name="plus" size={16} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
        <aside className="builder-preview">
          <section className="panel preview-panel">
            <div className="preview-top">
              <span className="eyebrow">Editable query</span>
              <span className="dot-online">{builderEngine}</span>
            </div>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={`${library.label} query editor`}
              placeholder="Type or edit your query here…"
              rows="7"
            />
            <div className="preview-scope">
              <span>Scope</span>
              <strong>
                {extractScope(query, builderEngine) || "Not scoped"}
              </strong>
            </div>
            <div className="composer-actions">
              <Button
                variant="primary"
                icon="external"
                onClick={() => onOpen(query, builderEngine)}
              >
                Open in browser
              </Button>
              <Button icon="copy" onClick={() => onCopy(query)}>
                Copy
              </Button>
              <button
                className="icon-button"
                aria-label="Save query"
                onClick={() => onSave(query, undefined, builderEngine)}
              >
                <Icon name="bookmark" size={17} />
              </button>
            </div>
          </section>
          <section className="validation-panel panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Local syntax check</span>
                <h3>
                  {warnings.length
                    ? `${warnings.length} item${warnings.length > 1 ? "s" : ""} to review`
                    : "Query structure is clear"}
                </h3>
              </div>
              {warnings.length ? (
                <span className="warning-badge">
                  <Icon name="alert" size={14} /> Review
                </span>
              ) : (
                <span className="local-badge">
                  <Icon name="info" size={14} /> Local
                </span>
              )}
            </div>
            {warnings.length ? (
              <ul className="warning-list">
                {warnings.map((item) => (
                  <li key={item}>
                    <Icon name="alert" size={15} />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="validation-ok">
                <Icon name="info" size={16} /> Syntax and scope update as you
                type. Results are checked after you open this in {library.label}
                .
              </p>
            )}
          </section>
        </aside>
      </div>
      <section className="syntax-guide panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">{library.label}</span>
            <h2>Syntax at a glance</h2>
          </div>
        </div>
        <div className="syntax-grid">
          {library.operators.slice(0, 6).map((operator) => (
            <div key={operator.token}>
              <code>{operator.syntax}</code>
              <p>{operator.combine}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OperatorLibrary({ setQuery }) {
  const [engine, setEngine] = useState("Google");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const library = engineLibraries[engine];
  const categories = [
    ...new Set(library.operators.map((operator) => operator.category)),
  ];
  const operators =
    category === "All"
      ? library.operators
      : library.operators.filter((operator) => operator.category === category);
  const chooseEngine = (event) => {
    setEngine(event.target.value);
    setCategory("All");
    setSelected(null);
  };
  return (
    <div className="page library-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">Engine reference</span>
          <h1>Operator Library</h1>
          <p>Commands and filters for the selected search engine.</p>
        </div>
        <div className="library-count">
          {engine.toUpperCase()} · {operators.length} COMMANDS
        </div>
      </div>
      <div className="library-toolbar">
        <label className="engine-picker">
          <span>Search engine</span>
          <select
            value={engine}
            onChange={chooseEngine}
            aria-label="Choose a search engine"
          >
            {Object.entries(engineLibraries).map(([name, item]) => (
              <option key={name} value={name}>
                {item.label}
              </option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <div className="library-filter">
          {["All", ...categories].map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="library-layout">
        <section className="operator-table panel">
          <div className="table-header">
            <span>COMMAND</span>
            <span>WHAT IT DOES</span>
            <span>EXAMPLE</span>
            <span></span>
          </div>
          {operators.map((operator) => (
            <button
              className="table-row"
              key={operator.token}
              onClick={() => setSelected(operator)}
            >
              <code>{operator.token}</code>
              <span>{operator.explanation}</span>
              <code className="safe-code">{operator.example}</code>
              <Icon name="chevron" size={17} />
            </button>
          ))}
        </section>
        <aside
          className={`detail-drawer panel ${selected ? "has-selection" : ""}`}
        >
          {selected ? (
            <>
              <button
                className="drawer-close"
                aria-label="Close command details"
                onClick={() => setSelected(null)}
              >
                <Icon name="close" size={17} />
              </button>
              <span className="eyebrow">
                {library.label} · {selected.category}
              </span>
              <h2>
                <code>{selected.token}</code>
              </h2>
              <div className="detail-block">
                <span>Syntax</span>
                <code>{selected.syntax}</code>
              </div>
              <div className="detail-block">
                <span>Example</span>
                <code>{selected.example}</code>
              </div>
              <div className="detail-block">
                <span>How to use it</span>
                <p>{selected.explanation}</p>
              </div>
              <div className="detail-block">
                <span>Combine thoughtfully</span>
                <p>{selected.combine}</p>
              </div>
              <div className="detail-block">
                <span>Limitation</span>
                <p>{selected.limitations}</p>
              </div>
              {(engine === "Google" || engine === "Social platforms") && (
                <Button
                  icon="plus"
                  onClick={() =>
                    setQuery(
                      (current) =>
                        `${current}${current ? " " : ""}${selected.insert ?? selected.example}`,
                    )
                  }
                >
                  Add to Google builder
                </Button>
              )}
            </>
          ) : (
            <EmptyState
              icon="library"
              title="Select a command"
              body={`Choose a ${library.label} command to see its syntax, example, and limitations.`}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function SavedQueries({
  saved,
  setSaved,
  setQuery,
  setPage,
  setBuilderEngine,
  onOpen,
  onCopy,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const items = saved.filter(
    (item) =>
      (filter === "Favorites" ? item.favorite : true) &&
      `${item.name} ${item.query} ${item.tags.join(" ")} ${item.scope}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const remove = (id) =>
    setSaved((items) => items.filter((item) => item.id !== id));
  const duplicate = (item) =>
    setSaved((items) => [
      {
        ...item,
        id: crypto.randomUUID(),
        name: `${item.name} copy`,
        timestamp: new Date().toISOString(),
        favorite: false,
      },
      ...items,
    ]);
  const toggleFavorite = (id) =>
    setSaved((items) =>
      items.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item,
      ),
    );
  return (
    <div className="page saved-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">Your reusable work</span>
          <h1>Saved Queries</h1>
          <p>
            Keep query names, notes, tags, and scope together in your local
            workspace.
          </p>
        </div>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => {
            setQuery("site:example.com ");
            setBuilderEngine("Google");
            setPage("Query Builder");
          }}
        >
          New query
        </Button>
      </div>
      <div className="list-controls panel">
        <div className="inline-search">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved queries"
            aria-label="Search saved queries"
          />
        </div>
        <div className="segmented">
          <button
            className={filter === "All" ? "active" : ""}
            onClick={() => setFilter("All")}
          >
            All <span>{saved.length}</span>
          </button>
          <button
            className={filter === "Favorites" ? "active" : ""}
            onClick={() => setFilter("Favorites")}
          >
            Favorites{" "}
            <span>{saved.filter((item) => item.favorite).length}</span>
          </button>
        </div>
      </div>
      {items.length ? (
        <div className="saved-list">
          {items.map((item) => (
            <article className="saved-row panel" key={item.id}>
              <div className="saved-main">
                <div className="saved-name">
                  <button
                    className={`favorite-button ${item.favorite ? "active" : ""}`}
                    aria-label={
                      item.favorite ? "Remove favorite" : "Add favorite"
                    }
                    onClick={() => toggleFavorite(item.id)}
                  >
                    <Icon name="heart" size={16} />
                  </button>
                  <h2>{item.name}</h2>
                  <span className="scope-pill">{item.scope || "No scope"}</span>
                </div>
                <code>{item.query}</code>
                <p>{item.notes}</p>
                <div className="row-meta">
                  {item.tags.map((tag) => (
                    <Tag muted key={tag}>
                      {tag}
                    </Tag>
                  ))}
                  <span>Saved {formatDate(item.timestamp)}</span>
                </div>
              </div>
              <div className="row-actions">
                <button
                  title="Use query"
                  aria-label="Use query"
                  className="icon-button"
                  onClick={() => {
                    setQuery(item.query);
                    setBuilderEngine(item.engine || "Google");
                    setPage("Query Builder");
                  }}
                >
                  <Icon name="spark" size={17} />
                </button>
                <button
                  title="Open in browser"
                  aria-label="Open in browser"
                  className="icon-button"
                  onClick={() => onOpen(item.query, item.engine || "Google")}
                >
                  <Icon name="external" size={17} />
                </button>
                <button
                  title="Copy query"
                  aria-label="Copy query"
                  className="icon-button"
                  onClick={() => onCopy(item.query)}
                >
                  <Icon name="copy" size={17} />
                </button>
                <button
                  title="Duplicate query"
                  aria-label="Duplicate query"
                  className="icon-button"
                  onClick={() => duplicate(item)}
                >
                  <Icon name="duplicate" size={17} />
                </button>
                <button
                  title="Delete query"
                  aria-label="Delete query"
                  className="icon-button dangerous"
                  onClick={() => remove(item.id)}
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No saved queries found"
          body="Try a different keyword or create a new scoped query."
          action={
            <Button
              icon="plus"
              onClick={() => {
                setQuery("site:example.com ");
                setBuilderEngine("Google");
                setPage("Query Builder");
              }}
            >
              Create a query
            </Button>
          }
        />
      )}
    </div>
  );
}

function History({
  history,
  setHistory,
  setQuery,
  setPage,
  setBuilderEngine,
  onOpen,
}) {
  const [search, setSearch] = useState("");
  const items = history.filter((item) =>
    item.query.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page history-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">Manual activity</span>
          <h1>Query History</h1>
          <p>A local record of the queries you chose to open from dorkA.</p>
        </div>
        {history.length > 0 && (
          <Button icon="trash" onClick={() => setHistory([])}>
            Clear history
          </Button>
        )}
      </div>
      <div className="list-controls panel">
        <div className="inline-search">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter history"
            aria-label="Filter query history"
          />
        </div>
        <span className="history-total">
          {items.length} {items.length === 1 ? "query" : "queries"}
        </span>
      </div>
      {items.length ? (
        <div className="history-timeline">
          {items.map((item) => (
            <article className="history-item" key={item.id}>
              <div className="timeline-dot"></div>
              <div className="history-time">
                <time>{formatDate(item.timestamp)}</time>
                <span>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="history-card panel">
                <code>{item.query}</code>
                <div>
                  <Tag muted>{item.scope || "Unscoped"}</Tag>
                  <button
                    className="link-button"
                    onClick={() => {
                      setQuery(item.query);
                      setBuilderEngine(item.engine || "Google");
                      setPage("Query Builder");
                    }}
                  >
                    Use in builder <Icon name="arrow" size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Open this query in browser"
                    onClick={() => onOpen(item.query, item.engine || "Google")}
                  >
                    <Icon name="external" size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="clock"
          title="No manual searches yet"
          body="Queries you choose to open from dorkA will appear here."
        />
      )}
    </div>
  );
}

function Settings({ prefs, setPrefs, resetWorkspace }) {
  const toggle = (field) =>
    setPrefs((current) => ({ ...current, [field]: !current[field] }));
  return (
    <div className="page settings-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">Local preferences</span>
          <h1>Settings</h1>
          <p>Personalize the workspace on this computer.</p>
        </div>
      </div>
      <section className="settings-panel panel">
        <div className="settings-row">
          <div>
            <h3>Comfortable density</h3>
            <p>
              Use spacious cards and readable metadata across the workspace.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={prefs.comfortable}
            className={`toggle ${prefs.comfortable ? "on" : ""}`}
            onClick={() => toggle("comfortable")}
          >
            <span />
          </button>
        </div>
        <div className="settings-row">
          <div>
            <h3>Composer hint</h3>
            <p>
              Show a quick reminder that searches open only when you choose.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={prefs.reminders}
            className={`toggle ${prefs.reminders ? "on" : ""}`}
            onClick={() => toggle("reminders")}
          >
            <span />
          </button>
        </div>
        <div className="settings-row">
          <div>
            <h3>History retention</h3>
            <p>Keep a local record of the queries you open from dorkA.</p>
          </div>
          <button
            role="switch"
            aria-checked={prefs.history}
            className={`toggle ${prefs.history ? "on" : ""}`}
            onClick={() => toggle("history")}
          >
            <span />
          </button>
        </div>
      </section>
      <section className="danger-zone panel">
        <span className="eyebrow">Local data</span>
        <h2>Reset workspace</h2>
        <p>
          Remove saved queries, history, and preferences from this computer.
          This cannot be undone.
        </p>
        <Button icon="trash" className="danger-button" onClick={resetWorkspace}>
          Reset local data
        </Button>
      </section>
    </div>
  );
}

function SaveQueryModal({ draft, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: draft.name,
    tags: draft.tags,
    scope: draft.scope,
    notes: draft.notes,
  }));
  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onSave({ ...form, query: draft.query });
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="save-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-query-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="drawer-close"
          aria-label="Close save query dialog"
          onClick={onClose}
        >
          <Icon name="close" size={17} />
        </button>
        <span className="eyebrow">Save to local workspace</span>
        <h2 id="save-query-title">Save query details</h2>
        <p className="modal-intro">
          Keep useful context with this query. It is saved by the local dorkA
          service on this computer.
        </p>
        <form onSubmit={submit}>
          <label>
            <span>Name</span>
            <input
              autoFocus
              value={form.name}
              onChange={update("name")}
              required
              placeholder="e.g. Public documentation review"
            />
          </label>
          <div className="form-grid">
            <label>
              <span>Scope / domain</span>
              <input
                value={form.scope}
                onChange={update("scope")}
                placeholder="example.com"
              />
            </label>
            <label>
              <span>
                Tags <small>comma separated</small>
              </span>
              <input
                value={form.tags}
                onChange={update("tags")}
                placeholder="documentation, review"
              />
            </label>
          </div>
          <label>
            <span>Notes</span>
            <textarea
              value={form.notes}
              onChange={update("notes")}
              placeholder="What should this query help you review?"
              rows="3"
            />
          </label>
          <div className="saved-query-preview">
            <span>QUERY</span>
            <code>{draft.query}</code>
          </div>
          <div className="modal-actions">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon="bookmark">
              Save query
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ServiceError({ message }) {
  return (
    <main className="service-error">
      <BrandMark />
      <span className="eyebrow">Local service unavailable</span>
      <h1>Couldn’t load your workspace.</h1>
      <p>{message}</p>
      <Button
        variant="primary"
        icon="arrow"
        onClick={() => window.location.reload()}
      >
        Try again
      </Button>
    </main>
  );
}

function LoadingShell() {
  return (
    <div className="app loading-app">
      <aside className="sidebar">
        <div className="skeleton brand-skeleton"></div>
        <div className="skeleton-lines">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <span className="skeleton" key={i} />
          ))}
        </div>
      </aside>
      <main className="main">
        <div className="topbar skeleton"></div>
        <div className="loading-page">
          <span className="loading-brand">
            <BrandMark />
            <i></i>
          </span>
          <div className="skeleton loading-title"></div>
          <div className="skeleton loading-subtitle"></div>
          <div className="skeleton loading-card"></div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("Dashboard");
  const [query, setQuery] = useState("");
  const [builderEngine, setBuilderEngine] = useState("Google");
  const {
    workspace,
    error: apiError,
    clearError,
    setSaved,
    setHistory,
    setPrefs,
  } = useBackendWorkspace();
  const saved = workspace?.saved || [];
  const history = workspace?.history || [];
  const prefs = workspace?.prefs || defaultPrefs;
  const [toast, setToast] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [saveModal, setSaveModal] = useState(null);

  useEffect(() => {
    const onKeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        openQuery(query, page === "Query Builder" ? builderEngine : "Google");
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  const showToast = (message, type = "success") =>
    setToast({ message, type, id: Date.now() });
  const openQuery = async (rawQuery, engine = "Google") => {
    const safeQuery = rawQuery.trim();
    if (!safeQuery) {
      showToast("Write a query before opening it in your browser.", "error");
      return;
    }
    const url = buildEngineSearchUrl(engine, safeQuery);
    try {
      const desktopResult = window.dorkADesktop
        ? await window.dorkADesktop.openSearch(url)
        : null;
      if (desktopResult && !desktopResult.ok)
        throw new Error("The desktop app rejected that URL.");
      if (!desktopResult) window.open(url, "_blank", "noopener,noreferrer");
      if (prefs.history)
        setHistory((items) =>
          [
            {
              id: crypto.randomUUID(),
              query: safeQuery,
              scope: extractScope(safeQuery, engine),
              engine,
              timestamp: new Date().toISOString(),
            },
            ...items,
          ].slice(0, 100),
        );
      showToast("Opened your exact query in your browser.");
    } catch {
      showToast("Could not open that search in your browser.", "error");
    }
  };
  const copyQuery = async (rawQuery) => {
    if (!rawQuery.trim()) {
      showToast("There is no query to copy.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(rawQuery);
      showToast("Query copied to clipboard.");
    } catch {
      showToast(
        "Could not access the clipboard. Select and copy the query manually.",
        "error",
      );
    }
  };
  const clearQuery = () => setQuery("");
  const saveQuery = (rawQuery, suggestedName, engine = "Google") => {
    const safeQuery = rawQuery.trim();
    if (!safeQuery) {
      showToast("Compose a query before saving it.", "error");
      return;
    }
    if (saved.some((item) => item.query === safeQuery)) {
      showToast("That query is already saved.", "error");
      return;
    }
    const scope = extractScope(safeQuery, engine);
    setSaveModal({
      query: safeQuery,
      name: suggestedName || (scope ? `Review ${scope}` : "Untitled query"),
      tags: "manual query",
      scope,
      engine,
      notes: "Saved to the local dorkA workspace.",
    });
  };
  const createSavedQuery = (form) => {
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setSaved((items) => [
      {
        id: crypto.randomUUID(),
        name: form.name.trim() || "Untitled query",
        query: form.query,
        tags: tags.length ? tags : ["manual query"],
        scope: form.scope.trim() || extractScope(form.query, saveModal.engine),
        engine: saveModal.engine,
        notes: form.notes.trim(),
        timestamp: new Date().toISOString(),
        favorite: false,
      },
      ...items,
    ]);
    setSaveModal(null);
    showToast("Query saved to the local workspace.");
  };
  const resetWorkspace = () => {
    if (
      window.confirm(
        "Reset all saved queries, history, and preferences on this computer?",
      )
    ) {
      setSaved([]);
      setHistory([]);
      setPrefs(defaultPrefs);
      showToast("Local workspace data was reset.");
    }
  };
  const searchResults = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    if (!term) return [];
    const results = [];
    allLibraryOperators
      .filter((o) =>
        `${o.engine} ${o.token} ${o.explanation}`.toLowerCase().includes(term),
      )
      .slice(0, 4)
      .forEach((o) =>
        results.push({
          kind: o.engine,
          title: o.token,
          sub: o.explanation,
          action: () => {
            setPage("Operator Library");
            setGlobalSearch("");
          },
        }),
      );
    saved
      .filter((s) =>
        `${s.name} ${s.query} ${s.tags.join(" ")}`.toLowerCase().includes(term),
      )
      .slice(0, 2)
      .forEach((s) =>
        results.push({
          kind: "Saved",
          title: s.name,
          sub: s.query,
          action: () => {
            setQuery(s.query);
            setPage("Saved Queries");
            setGlobalSearch("");
          },
        }),
      );
    return results;
  }, [globalSearch, saved]);
  if (!workspace)
    return apiError ? <ServiceError message={apiError} /> : <LoadingShell />;
  const pageProps = {
    query,
    setQuery,
    builderEngine,
    setBuilderEngine,
    saved,
    setSaved,
    history,
    setHistory,
    onOpen: openQuery,
    onCopy: copyQuery,
    onClear: clearQuery,
    onSave: saveQuery,
    setPage,
  };
  const pages = {
    Dashboard: <Dashboard {...pageProps} />,
    "Query Builder": <QueryBuilder {...pageProps} />,
    "Operator Library": <OperatorLibrary {...pageProps} />,
    "Saved Queries": <SavedQueries {...pageProps} />,
    History: <History {...pageProps} />,
    Settings: (
      <Settings
        prefs={prefs}
        setPrefs={setPrefs}
        resetWorkspace={resetWorkspace}
      />
    ),
  };
  const lightTheme = prefs.theme === "light";
  const toggleTheme = () =>
    setPrefs((current) => ({
      ...current,
      theme: current.theme === "light" ? "dark" : "light",
    }));
  return (
    <div
      className={`app ${lightTheme ? "theme-light" : "theme-dark"} ${prefs.comfortable ? "comfortable" : "compact"} ${mobileNav ? "nav-open" : ""}`}
    >
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-top">
          <a
            className="brand"
            href="#dashboard"
            onClick={(event) => {
              event.preventDefault();
              setPage("Dashboard");
              setMobileNav(false);
            }}
          >
            <BrandMark />
            <span className="brand-name">
              dork<span>A</span>
            </span>
          </a>
        </div>
        <nav>
          {navigation.map(([label, icon]) => (
            <button
              key={label}
              onClick={() => {
                setPage(label);
                setMobileNav(false);
              }}
              className={page === label ? "active" : ""}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
              {label === "Saved Queries" && saved.length > 0 && (
                <em>{saved.length}</em>
              )}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMobileNav((value) => !value)}
          >
            <Icon name="menu" size={21} />
          </button>
          <div className="global-search">
            <Icon name="search" size={18} />
            <input
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Search commands or saved queries…"
              aria-label="Global workspace search"
            />
            {globalSearch && (
              <button
                className="search-clear"
                aria-label="Clear global search"
                onClick={() => setGlobalSearch("")}
              >
                <Icon name="close" size={15} />
              </button>
            )}
            {searchResults.length > 0 && (
              <div className="global-results">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.kind}-${index}`}
                    onClick={result.action}
                  >
                    <span className="result-kind">{result.kind}</span>
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.sub}</small>
                    </span>
                    <Icon name="arrow" size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="theme-button"
              aria-label={
                lightTheme ? "Switch to dark mode" : "Switch to light mode"
              }
              onClick={toggleTheme}
            >
              <Icon name={lightTheme ? "moon" : "sun"} size={18} />
            </button>
          </div>
        </header>
        <div className="page-scroll">
          {apiError && (
            <div className="api-alert" role="alert">
              <Icon name="alert" size={16} />
              <span>{apiError}</span>
              <button
                aria-label="Dismiss data service message"
                onClick={clearError}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
          {pages[page]}
          <footer>
            dorkA organizes search references locally. Respect search-platform
            terms and applicable law.
          </footer>
        </div>
      </main>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}{" "}
      {saveModal && (
        <SaveQueryModal
          draft={saveModal}
          onClose={() => setSaveModal(null)}
          onSave={createSavedQuery}
        />
      )}{" "}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
