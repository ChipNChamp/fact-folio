
// Toast limits and durations
export const TOAST_LIMIT = 1
export const TOAST_REMOVE_DELAY = 2500
export const SUCCESS_TOAST_REMOVE_DELAY = 1500

// Toast ID counter
let count = 0

export function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

// Map to track toast timeouts
export const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
