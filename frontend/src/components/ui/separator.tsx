import * as React from "react"

type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "vertical" | "horizontal"
}

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return <div role="separator" aria-hidden data-orientation={orientation} className={className} {...props} />
}

export default Separator
