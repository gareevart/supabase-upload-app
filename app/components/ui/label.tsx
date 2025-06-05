import * as React from "react"
import { Label as GravityLabel } from "@gravity-ui/uikit"
import { cn } from "@/lib/utils"

interface LabelProps extends React.ComponentPropsWithoutRef<typeof GravityLabel> {
  className?: string
}

const Label = React.forwardRef<HTMLDivElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <GravityLabel
      ref={ref}
      className={cn(className)}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
