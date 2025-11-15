import * as React from "react"

type TabsProps = {
	children?: React.ReactNode
	className?: string
	value?: string
	defaultValue?: string
	onValueChange?: (v: string) => void
}

export function Tabs({ children, className }: TabsProps) {
	return <div className={className}>{children}</div>
}

export function TabsList({ children, className }: { children?: React.ReactNode; className?: string }) {
	return <div role="tablist" className={className}>{children}</div>
}

export function TabsTrigger({ children, value, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string; className?: string }) {
	return <button role="tab" data-value={value} className={className} {...props}>{children}</button>
}

export function TabsContent({ children, value, className }: { children?: React.ReactNode; value?: string; className?: string }) {
	return <div data-value={value} className={className}>{children}</div>
}

export default Tabs
