import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dixon")({
  component: DixonEmbedPage,
});

function DixonEmbedPage() {
  const url = "https://login.dixonchallenge.com";
  return (
    <div className="flex h-[calc(100vh-49px)] flex-col">
      <div className="flex items-center justify-between border-b bg-card/60 px-4 py-2">
        <div className="text-xs text-muted-foreground">
          Embedded: <span className="font-mono">{url}</span>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open in new tab
          </a>
        </Button>
      </div>
      <iframe
        src={url}
        title="Dixon Challenge"
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
        referrerPolicy="no-referrer-when-downgrade"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
