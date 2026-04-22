import type { ReactNode } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useDefaultLayout } from "react-resizable-panels";

interface Props {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  storageId?: string;
  className?: string;
}

export function ResizablePanels3({
  left,
  center,
  right,
  storageId = "call-3pane-v1",
  className = "hidden lg:flex h-full",
}: Props) {
  const layoutProps = useDefaultLayout({
    id: storageId,
    panelIds: ["pane-left", "pane-center", "pane-right"],
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  });

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      {...layoutProps}
      className={className}
    >
      <ResizablePanel id="pane-left" defaultSize="22%" minSize="200px" maxSize="40%">
        <div className="h-full min-w-0 overflow-hidden">{left}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="pane-center" defaultSize="53%" minSize="30%">
        <div className="h-full min-w-0 overflow-hidden">{center}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="pane-right" defaultSize="25%" minSize="220px" maxSize="45%">
        <div className="h-full min-w-0 overflow-hidden">{right}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
