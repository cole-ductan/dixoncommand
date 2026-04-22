import { createFileRoute } from "@tanstack/react-router";
import {
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

const UPSTREAM_ORIGIN = "https://login.dixonchallenge.com";
const PROXY_PREFIX = "/api/public/dixon";
const COOKIE_JAR_NAME = "dixon_jar";

// ---------- Cookie jar (stored as one Lovable cookie) ----------

type Jar = Record<string, string>; // name -> value

function readJar(): Jar {
  const raw = getCookie(COOKIE_JAR_NAME);
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw)) as Jar;
  } catch {
    return {};
  }
}

function writeJar(jar: Jar) {
  setCookie(COOKIE_JAR_NAME, encodeURIComponent(JSON.stringify(jar)), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

function jarToCookieHeader(jar: Jar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

/**
 * Parse a single Set-Cookie header line and update the jar.
 * We strip Domain/Secure/SameSite — all cookies live in our jar regardless.
 */
function ingestSetCookie(jar: Jar, line: string) {
  // First segment is name=value
  const firstSemi = line.indexOf(";");
  const pair = firstSemi === -1 ? line : line.slice(0, firstSemi);
  const eq = pair.indexOf("=");
  if (eq === -1) return;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  if (!name) return;

  // Honor Max-Age=0 / Expires in past as deletion
  const lower = line.toLowerCase();
  if (/max-age=0\b/.test(lower) || value === "" || value === "deleted") {
    delete jar[name];
    return;
  }
  jar[name] = value;
}

/**
 * Cloudflare Workers concatenate multiple Set-Cookie into one comma-separated
 * header when read via .get(). We split carefully on commas that aren't inside
 * an Expires=... date.
 */
function splitSetCookieHeader(combined: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let i = 0;
  while (i < combined.length) {
    const ch = combined[i];
    if (ch === ",") {
      // Look ahead: is the next non-space token a weekday name (Expires)?
      const ahead = combined.slice(i + 1, i + 6).trim().toLowerCase();
      const isExpiresDate = /^(mon|tue|wed|thu|fri|sat|sun)/.test(ahead);
      if (isExpiresDate) {
        buf += ch;
        i++;
        continue;
      }
      parts.push(buf);
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((s) => s.trim()).filter(Boolean);
}

// ---------- URL rewriting ----------

function rewriteLocationHeader(loc: string): string {
  if (!loc) return loc;
  // Absolute upstream URL
  if (loc.startsWith(UPSTREAM_ORIGIN)) {
    return PROXY_PREFIX + loc.slice(UPSTREAM_ORIGIN.length);
  }
  // Other absolute URL (different domain) — leave alone
  if (/^https?:\/\//i.test(loc)) {
    return loc;
  }
  // Root-relative
  if (loc.startsWith("/")) {
    return PROXY_PREFIX + loc;
  }
  // Relative — prepend prefix root
  return `${PROXY_PREFIX}/${loc}`;
}

/**
 * Rewrite a single URL string found in HTML attributes.
 * Returns the rewritten URL.
 */
function rewriteUrlAttr(url: string, basePath: string): string {
  const trimmed = url.trim();
  if (!trimmed) return url;
  const lower = trimmed.toLowerCase();
  // Skip non-navigational schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("data:") ||
    lower.startsWith("#")
  ) {
    return url;
  }
  // Absolute upstream
  if (trimmed.startsWith(UPSTREAM_ORIGIN)) {
    return PROXY_PREFIX + trimmed.slice(UPSTREAM_ORIGIN.length);
  }
  // Other absolute (different domain) — leave alone
  if (/^https?:\/\//i.test(trimmed)) {
    return url;
  }
  // Protocol-relative
  if (trimmed.startsWith("//")) {
    return url;
  }
  // Root-relative
  if (trimmed.startsWith("/")) {
    return PROXY_PREFIX + trimmed;
  }
  // Relative — resolve against current basePath dir
  const dir = basePath.endsWith("/")
    ? basePath
    : basePath.slice(0, basePath.lastIndexOf("/") + 1);
  return PROXY_PREFIX + dir + trimmed;
}

/**
 * Rewrite HTML body.
 * - href, src, action, formaction, poster, data attributes
 * - <meta http-equiv="refresh" content="0;url=...">
 * - inline url(...) inside <style> blocks (best-effort)
 */
function rewriteHtml(html: string, basePath: string): string {
  // Attribute-based URLs
  const attrRe =
    /\b(href|src|action|formaction|poster|data)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  html = html.replace(attrRe, (_m, attr, _quoted, dq, sq) => {
    const val = dq !== undefined ? dq : sq;
    const newVal = rewriteUrlAttr(val, basePath);
    return `${attr}="${newVal.replace(/"/g, "&quot;")}"`;
  });

  // <meta http-equiv="refresh" content="N; url=XYZ">
  html = html.replace(
    /(<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'])([^"']*)(["'])/gi,
    (_m, pre, content, post) => {
      const m = content.match(/^(\s*\d+\s*;\s*url\s*=\s*)(.+)$/i);
      if (!m) return `${pre}${content}${post}`;
      return `${pre}${m[1]}${rewriteUrlAttr(m[2], basePath)}${post}`;
    },
  );

  // CSS url(...) inside <style> blocks
  html = html.replace(
    /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
    (_m, css) => `<style>${rewriteCssUrls(css, basePath)}</style>`,
  );

  return html;
}

function rewriteCssUrls(css: string, basePath: string): string {
  return css.replace(
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
    (_m, quote, url) => `url(${quote}${rewriteUrlAttr(url, basePath)}${quote})`,
  );
}

// ---------- Proxy handler ----------

async function proxyHandler({ request, params }: { request: Request; params: { _splat?: string } }) {
  const splat = params._splat ?? "";
  const incomingUrl = new URL(request.url);
  const upstreamUrl = `${UPSTREAM_ORIGIN}/${splat}${incomingUrl.search}`;
  const upstreamPath = `/${splat}`;

  // Build outbound headers
  const outHeaders = new Headers();
  // Pass through useful request headers, drop hop-by-hop and host-binding ones
  const skip = new Set([
    "host",
    "connection",
    "content-length",
    "accept-encoding",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "cf-visitor",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
    "cookie",
    "referer",
    "origin",
  ]);
  request.headers.forEach((value, key) => {
    if (!skip.has(key.toLowerCase())) outHeaders.set(key, value);
  });

  // Attach jar cookies
  const jar = readJar();
  const cookieHeader = jarToCookieHeader(jar);
  if (cookieHeader) outHeaders.set("Cookie", cookieHeader);

  // Spoof Origin/Referer to upstream so CSRF-by-Referer checks pass
  outHeaders.set("Origin", UPSTREAM_ORIGIN);
  outHeaders.set("Referer", upstreamUrl);
  outHeaders.set("Host", new URL(UPSTREAM_ORIGIN).host);

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  // Read body for non-GET; rewrite proxy-prefixed URLs in form bodies
  let body: BodyInit | undefined;
  if (hasBody) {
    const ct = (request.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      body = text;
    } else {
      body = await request.arrayBuffer();
    }
  }

  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(upstreamUrl, {
      method,
      headers: outHeaders,
      body,
      redirect: "manual",
    });
  } catch (err) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:24px;color:#b91c1c">
        <h2>Dixon proxy: upstream unreachable</h2>
        <pre>${(err as Error).message}</pre>
      </body>`,
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  // Ingest Set-Cookie into jar
  const setCookieRaw = upstreamResp.headers.get("set-cookie");
  if (setCookieRaw) {
    const lines = splitSetCookieHeader(setCookieRaw);
    for (const line of lines) ingestSetCookie(jar, line);
    writeJar(jar);
  }

  // Build response headers (drop hop-by-hop / encoding-related)
  const respHeaders = new Headers();
  const dropResp = new Set([
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
    "set-cookie",
    "strict-transport-security",
    "content-security-policy",
    "content-security-policy-report-only",
    "x-frame-options",
    "x-content-type-options",
    "permissions-policy",
  ]);
  upstreamResp.headers.forEach((value, key) => {
    if (!dropResp.has(key.toLowerCase())) respHeaders.set(key, value);
  });

  // Rewrite Location for redirects
  const status = upstreamResp.status;
  if (status >= 300 && status < 400) {
    const loc = upstreamResp.headers.get("location");
    if (loc) respHeaders.set("Location", rewriteLocationHeader(loc));
    return new Response(null, { status, headers: respHeaders });
  }

  // Rewrite HTML/CSS bodies; pass everything else through
  const ct = (upstreamResp.headers.get("content-type") || "").toLowerCase();

  if (ct.includes("text/html")) {
    const text = await upstreamResp.text();
    const rewritten = rewriteHtml(text, upstreamPath);
    return new Response(rewritten, { status, headers: respHeaders });
  }

  if (ct.includes("text/css")) {
    const text = await upstreamResp.text();
    const rewritten = rewriteCssUrls(text, upstreamPath);
    return new Response(rewritten, { status, headers: respHeaders });
  }

  // Binary / other — stream through
  const buf = await upstreamResp.arrayBuffer();
  return new Response(buf, { status, headers: respHeaders });
}

export const Route = createFileRoute("/api/public/dixon/$")({
  server: {
    handlers: {
      GET: proxyHandler,
      POST: proxyHandler,
      PUT: proxyHandler,
      DELETE: proxyHandler,
      PATCH: proxyHandler,
      OPTIONS: proxyHandler,
      HEAD: proxyHandler,
    },
  },
});