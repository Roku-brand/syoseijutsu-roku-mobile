# Web SEO architecture — 2026-09

## Source-of-truth audit

The web build is an Expo Router static export deployed by GitHub Pages. `scripts/generate-seo-assets.mjs` adds canonical metadata, robots directives, JSON-LD, breadcrumbs, and an HTML fallback containing the page's primary content and links after the export. The public catalog built from the checked-in canonical data contains **50 public techniques, 150 public theories, and 26 personas**. The complete-edition source contains 336 techniques and 793 theories; it must not be treated as publicly indexable content merely because a locked client shell has a route.

The canonical host is `https://app.shoseijutsuroku.com`, without a trailing slash except for `/`. Sitemap URLs, canonical tags, and generated internal links use that convention. Query parameters are never canonical URLs.

## URL decision register

| Classification | Route pattern | SEO treatment | Count in this build |
| --- | --- | --- | --- |
| A — index | `/`, `/about/shoseijutsu`, `/discover`, `/personas`, `/theories`, `/interpersonal`, `/work`, `/life`, `/app`, `/legal/faq`, `/learn` | Canonical, 200, unique title/description/H1, breadcrumbs and JSON-LD | 11 fixed hubs |
| A — index | `/subcategory/{interpersonal|work|life}/{persona}` with one or more public techniques | Persona hub | 26 |
| A — index | `/card/{id}` only where the authoritative public item has a substantive explanation | Individual technique | 50 |
| A — index | `/theory/{id}` only where the authoritative public theory has a substantive summary | Individual theory | 150 |
| A — index | `/topic/{slug}` for editorially defined search-intent hubs | Topic hub | 21 |
| B — noindex | `/auth`, `/my-os`, `/library`, `/history`, `/my-techniques`, `/settings/*`, `/owner/*`, `/learn/{caseId}`, `/search*`, `/upgrade`, checkout callback/query URLs | User-specific, operational, individual learning questions, payment, or search/filter state; not in sitemap | Route families |
| B — noindex | locked `/card/{id}`, locked `/theory/{id}`, unknown routes, `/404`, `/+not-found`, `/catalog` | No standalone public content or compatibility route | Route families |
| C — redirect | short legacy `/card/master336-1` through `/card/master336-99` when the zero-padded canonical card exists | Client compatibility redirect exists; a real HTTP 301 is not possible on GitHub Pages alone | 336 possible aliases |
| C — redirect | `/catalog` → `/discover` | Canonical/noindex compatibility page exists; needs edge/server redirect support for HTTP 301 | 1 |
| D — 404 | malformed or out-of-range `master336-*` IDs and unknown routes | Explicit noindex not-found content | Route family |

GitHub Pages cannot emit per-path 301 or 410 response codes. Do not claim a client-side redirect, canonical tag, or SPA fallback is an HTTP redirect. If legacy URLs are already indexed and need status-code migration, move the domain behind a configured edge/server redirect layer before changing their sitemap or requesting removal.

## Information architecture

`処世術とは` is the pillar. It links to the three category hubs (`対人術`, `仕事術`, `人生術`), which link to personas, which link to public individual techniques. Individual techniques link to their primary and related theories and to related techniques. Theory pages link back only to authoritative related techniques and editorially related theories. The `/app` page is the non-intrusive conversion endpoint after useful content.

## Sitemap and crawl policy

One generated XML sitemap is sufficient at the present volume (well below 50,000 URLs). It includes only A routes, uses absolute canonical URLs, and intentionally omits `lastmod` rather than emitting fabricated dates. `robots.txt` names the sitemap and blocks only `/owner/`; pages that must leave search results expose `noindex` in their HTML and are not blocked from Googlebot solely for that purpose.

## Deployment gate

Before publishing, run `pnpm typecheck`, `pnpm export:pages`, `pnpm seo:audit`, and `pnpm test:e2e`. The CI workflow runs the content validations, static export, SEO audit, public-content audit, and Playwright smoke suite before GitHub Pages deployment.
