import * as React from "react"
import { Avatar as GravityAvatar } from "@gravity-ui/uikit"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof GravityAvatar>,
  React.ComponentPropsWithoutRef<typeof GravityAvatar>
>(({ className, size = "m", ...props }, ref) => (
  <GravityAvatar
    ref={ref}
    size={size}
    className={cn(
      "shrink-0",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

export { Avatar }
