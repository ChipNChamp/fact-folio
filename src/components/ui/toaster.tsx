
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2 } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, isSuccess, ...props }) {
        // For success toasts, create a simpler, more compact style
        if (!variant && title === "Success" || title === "Entry added" || title === "Entry updated") {
          return (
            <Toast 
              key={id} 
              {...props} 
              className="flex items-center justify-between p-2 min-h-8 h-auto rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <ToastDescription className="text-xs py-0">{description}</ToastDescription>
              </div>
              <ToastClose className="opacity-70 right-0 top-0 p-1.5" />
            </Toast>
          )
        }
        
        // For other toasts (errors, warnings, etc.), use the standard style
        return (
          <Toast key={id} {...props} variant={variant}>
            <div className="grid gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
