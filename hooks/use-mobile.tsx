import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(newIsMobile)
    }
    mql.addEventListener("change", onChange)
    
    // Set initial value
    const initialIsMobile = window.innerWidth < MOBILE_BREAKPOINT
    setIsMobile(initialIsMobile)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Return false during SSR/initial render, then the actual value
  return isMobile ?? false
}
