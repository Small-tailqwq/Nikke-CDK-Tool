import { nextTick, watch, type Ref } from 'vue'

export function useModalFocus(active: Readonly<Ref<boolean>>, container: Ref<HTMLElement | null>) {
  watch(
    active,
    async (open, _previous, onCleanup) => {
      if (!open) return
      const previousFocus = document.activeElement as HTMLElement | null
      let root: HTMLElement | null = null
      let cancelled = false

      const trapTab = (event: KeyboardEvent) => {
        if (event.key !== 'Tab' || !root) return
        const elements = [
          ...root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]'
          ),
        ].filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(':disabled') &&
            element.getClientRects().length
        )
        const first = elements[0]
        const last = elements.at(-1)
        if (
          !first ||
          (event.shiftKey && (document.activeElement === first || document.activeElement === root))
        ) {
          event.preventDefault()
          ;(last || root).focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === root)
        ) {
          event.preventDefault()
          first.focus()
        }
      }

      onCleanup(() => {
        cancelled = true
        root?.removeEventListener('keydown', trapTab)
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
      })

      await nextTick()
      if (cancelled) return
      root = container.value
      root?.addEventListener('keydown', trapTab)
      root?.focus({ preventScroll: true })
    },
    { flush: 'post' }
  )
}
