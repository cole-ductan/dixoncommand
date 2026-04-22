import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dixon")({
  component: DixonEmbedPage,
});

const PROXY_BASE = "/api/public/dixon";
const UPSTREAM_BASE = "https://login.dixonchallenge.com";

const DIXON_PAGES: { label: string; path: string; group: string }[] = [
  { group: "Home", label: "Dixon Home", path: "/index.php" },
  { group: "Scheduling", label: "CM Schedule", path: "/cm_schedule.php" },
  { group: "Scheduling", label: "Call Schedule", path: "/call_schedule.php" },
  { group: "Calling", label: "Calling Mode", path: "/calling_mode.php" },
  { group: "Calling", label: "Today's Calls", path: "/calling_mode_todays_calls.php" },
  { group: "Operations", label: "Manage Courses", path: "/list_manage_courses.php" },
  { group: "Operations", label: "List Packing for Events", path: "/list_packing_for_events.php" },
  { group: "Orders", label: "Custom Order", path: "/custom_order_n.php" },
  { group: "Orders", label: "Logo Ball Order — New", path: "/logo_ball_order_create_new.php" },
];

const STORAGE_KEY = "dixon:lastPath";

function DixonEmbedPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window === "undefined") return "/index.php";
    return sessionStorage.getItem(STORAGE_KEY) || "/index.php";
  });

  const proxyUrl = `${PROXY_BASE}${currentPath}`;

  const navigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_KEY, path);
    if (iframeRef.current) {
      iframeRef.current.src = `${PROXY_BASE}${path}`;
    }
  };

  const reload = () => {
    if (iframeRef.current) {
      // Force reload by re-setting src
      const src = iframeRef.current.src;
      iframeRef.current.src = "about:blank";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.src = src;
      });
    }
  };

  const groups = Array.from(new Set(DIXON_PAGES.map((p) => p.group)));

  return (
    <div className="flex h-[calc(100vh-49px)] flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card/60 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Proxied via</span>
          <span className="font-mono">{PROXY_BASE}</span>
          <span>→</span>
          <span className="font-mono">{UPSTREAM_BASE}{currentPath}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={reload}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reload
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`${UPSTREAM_BASE}${currentPath}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open direct
            </a>
          </Button>
        </div>
      </div>

      {/* Quick-launch / control center */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dixon Control Center
        </div>
        <div className="flex flex-wrap gap-4">
          {groups.map((group) => (
            <div key={group} className="flex flex-col gap-1">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                {group}
              </div>
              <div className="flex flex-wrap gap-1">
                {DIXON_PAGES.filter((p) => p.group === group).map((p) => (
                  <Button
                    key={p.path}
                    size="sm"
                    variant={currentPath === p.path ? "default" : "secondary"}
                    className="h-7 text-xs"
                    onClick={() => navigate(p.path)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Iframe rendering proxied Dixon content */}
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        title="Dixon Challenge (proxied)"
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
        referrerPolicy="no-referrer-when-downgrade"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
