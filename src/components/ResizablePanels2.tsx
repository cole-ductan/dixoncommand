import type { ReactNode } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useDefaultLayout } from "react-resizable-panels";

interface Props {
  left: ReactNode;
  right: ReactNode;
  storageId?: string;
  className?: string;
  defaultLeft?: string;
  defaultRight?: string;
  leftMin?: string;
  rightMin?: string;
  rightMax?: string;
}

export function ResizablePanels2({
  left,
  right,
  storageId = "call-2pane-v1",
  className = "hidden lg:flex h-full",
  defaultLeft = "65%",
  defaultRight = "35%",
  leftMin = "320px",
  rightMin = "280px",
  rightMax = "55%",
}: Props) {
  const layoutProps = useDefaultLayout({
    id: storageId,
    panelIds: ["pane-left", "pane-right"],
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  });

  return (
    <ResizablePanelGroup orientation="horizontal" {...layoutProps} className={className}>
      <ResizablePanel id="pane-left" defaultSize={defaultLeft} minSize={leftMin}>
        {left}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="pane-right" defaultSize={defaultRight} minSize={rightMin} maxSize={rightMax}>
        {right}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}