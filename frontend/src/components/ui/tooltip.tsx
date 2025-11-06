import * as React from "react"

export const TooltipProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>
export const Tooltip = ({ children }: { children?: React.ReactNode }) => <>{children}</>
export const TooltipTrigger = ({ children, asChild, ...props }: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) => (
	<span {...props}>{children}</span>
)
export const TooltipContent = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div role="tooltip" {...props}>{children}</div>
)

export default Tooltip
