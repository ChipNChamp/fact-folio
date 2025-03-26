import { ToastState, ToastAction, actionTypes } from "./toast-types"
import { toastTimeouts, TOAST_REMOVE_DELAY, SUCCESS_TOAST_REMOVE_DELAY } from "./toast-constants"

export const addToRemoveQueue = (toastId: string, isSuccess: boolean = false) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  // Use shorter timeout for success toasts
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, isSuccess ? SUCCESS_TOAST_REMOVE_DELAY : TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        const toast = state.toasts.find(t => t.id === toastId)
        addToRemoveQueue(toastId, toast?.isSuccess)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id, toast.isSuccess)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// Store and dispatch mechanism
const listeners: Array<(state: ToastState) => void> = []

let memoryState: ToastState = { toasts: [] }

export function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

export { listeners, memoryState }
