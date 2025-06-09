import * as React from "react"
import { ToastProvider, ToastViewport } from "./toast"

export function Toaster() {
  return (
    <ToastProvider>
      <ToastViewport />
    </ToastProvider>
  )
}
