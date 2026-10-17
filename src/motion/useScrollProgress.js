import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

export function useScrollProgress({ targetRef } = {}) {
  const [progress, setProgress] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const target = targetRef?.current
    let frame = 0

    const update = () => {
      const isDocument = !target || target === document.documentElement || target === document.body
      const scrollTop = isDocument ? window.scrollY || document.documentElement.scrollTop : target.scrollTop
      const scrollableHeight = isDocument
        ? document.documentElement.scrollHeight - window.innerHeight
        : target.scrollHeight - target.clientHeight
      setProgress(scrollableHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollableHeight)) : 0)
    }

    const scheduleUpdate = () => {
      if (reducedMotion) {
        update()
        return
      }
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    const eventTarget = target || window
    eventTarget.addEventListener('scroll', scheduleUpdate, { passive: true })
    if (eventTarget !== window) window.addEventListener('resize', scheduleUpdate, { passive: true })
    update()

    return () => {
      eventTarget.removeEventListener('scroll', scheduleUpdate)
      if (eventTarget !== window) window.removeEventListener('resize', scheduleUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [reducedMotion, targetRef])

  return progress
}
