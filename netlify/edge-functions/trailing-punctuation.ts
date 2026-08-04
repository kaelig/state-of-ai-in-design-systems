// Recover the URLs that other people's link parsers mangle.
//
// llms.txt follows the llmstxt.org format, which is `- [name](url): summary`.
// That puts `):` flush against 70 absolute URLs in /llms.txt and 182 across the
// llms-*.txt set, and the generated markdown ends sentences on bare URLs the
// same way ("...at https://.../insights.md."). Anything that reads those files
// as plain text and finds links with the usual `https?://\S+` runs to the next
// space and takes the punctuation with it. Analytics caught the first one:
// /questions/platform-role.md):
//
// The page exists; only the tail is wrong, and it is wrong because of how we
// publish. So strip the tail and redirect rather than answer a 404. This is not
// the SPA fallback netlify.toml rules out: nothing here guesses at a typo or
// serves one route's content at another's URL. It removes characters no path on
// this site ends with, and if what is left does not exist either, it 404s.
//
// The redirect is permanent because the mangled URL is never going to be the
// right one, and a cached 301 spares the next reader the round trip.

import type { Config, Context } from 'https://edge.netlify.com';

// The characters prose and markdown leave stuck to a URL: sentence and clause
// enders, and the closers of every pair a URL gets wrapped in. No published
// path ends with any of them — the routes end in a letter, the mirrors in .md,
// .json, .txt, .xml, .svg, .png, .js or .sqlite.
const TRAILING = /[).,;:!?'"\]}>]+$/;

export default function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  // Never empty: a pathname always opens with the slash, and the slash is not
  // in the set. `/)` cleans to `/` and redirects to the homepage, which is the
  // same misparse as any other.
  const cleaned = url.pathname.replace(TRAILING, '');

  // Nothing to strip. The router should not have sent this here, but a request
  // it did send is Netlify's to answer, 404 included.
  if (cleaned === url.pathname) return context.next();

  return Response.redirect(new URL(cleaned + url.search, url), 301);
}

export const config: Config = {
  // Regex rather than a URLPattern path: the set has to be expressed as a
  // character class, and half of it is URLPattern syntax that would need
  // escaping. Matching only paths that end in punctuation keeps this function
  // off every other request to the site.
  //
  // The class repeats TRAILING's rather than deriving from it, and matches one
  // character where TRAILING matches a run: this is a string the edge router
  // compiles, not a RegExp this module evaluates, so it stays written out.
  // Widening one without the other is the drift to watch for — a character
  // here that is not in TRAILING makes this function run and then hand the
  // request straight back, which costs an invocation and fixes nothing.
  //
  // Anchored on both ends because the documentation does not say whether the
  // router anchors it, and the two readings differ: unanchored, `.*[)]$` would
  // still be fine, but a future edit that drops the `$` would quietly start
  // matching every path containing a bracket.
  pattern: String.raw`^/.*[).,;:!?'"\]}>]$`,
};
