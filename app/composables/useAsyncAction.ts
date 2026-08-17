import { useApiError } from './useApiError'

/**
 * The one pattern for "user clicked something that hits the server".
 *
 * Wrapping every mutation here is what keeps loading, error and field-error handling
 * consistent instead of each page inventing its own three refs — see the state patterns
 * section of app/CLAUDE.md.
 *
 * It also guarantees two things that are easy to forget by hand:
 *   * `pending` is cleared in a `finally`, so a thrown error cannot leave a button
 *     spinning forever.
 *   * concurrent invocations are ignored while one is in flight, which prevents the
 *     double-submit that creates two profiles from one impatient double-click.
 */
export interface UseAsyncActionOptions {
  /** Re-throw after recording state. Off by default: callers usually read `error`. */
  rethrow?: boolean
}

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions = {},
) {
  const { messageOf, fieldErrorsOf } = useApiError()

  const pending = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})
  const succeeded = shallowRef(false)

  function reset() {
    errorMessage.value = null
    fieldErrors.value = {}
    succeeded.value = false
  }

  async function execute(...args: TArgs): Promise<TResult | null> {
    if (pending.value) return null

    reset()
    pending.value = true

    try {
      const result = await action(...args)
      succeeded.value = true
      return result
    }
    catch (error) {
      errorMessage.value = messageOf(error)
      fieldErrors.value = fieldErrorsOf(error)

      if (options.rethrow) throw error

      return null
    }
    finally {
      pending.value = false
    }
  }

  return {
    execute,
    reset,
    pending: readonly(pending),
    errorMessage: readonly(errorMessage),
    fieldErrors: readonly(fieldErrors),
    succeeded: readonly(succeeded),
  }
}
