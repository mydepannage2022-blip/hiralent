import * as React from "react"

export function ScrollArea({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) {
  return (
    <div className={className} style={{ overflow: 'auto' }} {...props}>
      {children}
    </div>
  )
}

export default ScrollArea
