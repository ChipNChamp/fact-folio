
import * as React from "react"
import { Toast, ToasterToast, ToastState } from "./toast-types"
import { genId, SUCCESS_TOAST_REMOVE_DELAY } from "./toast-constants"
import { dispatch, listeners, memoryState, addToRemoveQueue } from "./toast-reducer"

function toast({ ...props }: Toast) {
  const id = genId()
  
  // Auto-dismiss success toasts faster
  const isSuccess = !props.variant || props.variant === "default"

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
    
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      isSuccess,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  
  // Automatically dismiss success toasts
  if (isSuccess) {
    setTimeout(dismiss, SUCCESS_TOAST_REMOVE_DELAY)
  }

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
