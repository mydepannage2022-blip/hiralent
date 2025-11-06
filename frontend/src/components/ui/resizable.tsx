import * as React from "react"

type ResizablePanelGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode
  className?: string
  direction?: "horizontal" | "vertical"
}

export function ResizablePanelGroup({ children, className, direction, ...props }: ResizablePanelGroupProps) {
  return <div data-direction={direction} className={className} {...props}>{children}</div>
}

type ResizablePanelProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode
  className?: string
  defaultSize?: number
  minSize?: number
}

export function ResizablePanel({ children, className, defaultSize, minSize, ...props }: ResizablePanelProps) {
  return <div data-default-size={defaultSize} data-min-size={minSize} className={className} {...props}>{children}</div>
}

export function ResizableHandle({ withHandle, ...props }: { withHandle?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div data-with-handle={withHandle} style={{ width: withHandle ? 12 : 0 }} {...props} />
}

export default ResizablePanelGroup
