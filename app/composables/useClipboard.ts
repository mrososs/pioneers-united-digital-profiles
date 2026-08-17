/**
 * Copy-to-clipboard with a short "copied" acknowledgement.
 *
 * The Clipboard API is unavailable on insecure origins and in some in-app browsers
 * (which matters here: profiles are opened from WhatsApp and LinkedIn), so failure is
 * reported rather than assumed away — the caller can fall back to showing the URL.
 */
export function useClipboard(resetAfterMs = 2000) {
  const copied = shallowRef(false)
  const failed = shallowRef(false)

  let timer: ReturnType<typeof setTimeout> | null = null

  function scheduleReset() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
      failed.value = false
    }, resetAfterMs)
  }

  async function copy(value: string): Promise<boolean> {
    copied.value = false
    failed.value = false

    if (!import.meta.client || !navigator.clipboard) {
      failed.value = true
      scheduleReset()
      return false
    }

    try {
      await navigator.clipboard.writeText(value)
      copied.value = true
      scheduleReset()
      return true
    }
    catch {
      failed.value = true
      scheduleReset()
      return false
    }
  }

  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
  })

  return { copy, copied: readonly(copied), failed: readonly(failed) }
}
