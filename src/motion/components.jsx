import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, m, useMotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { motionTokens } from './tokens.js'

function useViewportVisibility({ once = true, threshold = 0.12 } = {}) {
  const ref = useRef(null)
  const [armed, setArmed] = useState(false)
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (reducedMotion || !node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setArmed(false)
      setVisible(true)
      return
    }

    let observer
    try {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target !== node) return
          setVisible(entry.isIntersecting)
          if (entry.isIntersecting && once) observer.unobserve(node)
        })
      }, { threshold })
      setArmed(true)
      observer.observe(node)
    } catch {
      observer?.disconnect()
      setArmed(false)
      setVisible(true)
    }

    return () => observer?.disconnect()
  }, [once, reducedMotion, threshold])

  return { ref, armed, visible, reducedMotion }
}

const revealVariants = {
  hidden: { opacity: 0, y: motionTokens.distances.reveal },
  visible: { opacity: 1, y: 0 },
}

export function Reveal({
  as = 'div',
  children,
  className,
  delay = 0,
  duration = motionTokens.durations.base,
  once = true,
  threshold = 0.12,
  ...props
}) {
  const { ref, armed, visible, reducedMotion } = useViewportVisibility({ once, threshold })
  const Component = m[as]

  return (
    <Component
      ref={ref}
      className={className}
      initial={armed && !visible ? 'hidden' : false}
      animate={visible || !armed ? 'visible' : 'hidden'}
      variants={revealVariants}
      transition={{
        duration: reducedMotion ? 0 : duration,
        ease: motionTokens.easings.standard,
        delay: reducedMotion ? 0 : delay,
      }}
      {...props}
    >
      {children}
    </Component>
  )
}

const staggerParentVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: motionTokens.stagger.base,
      delayChildren: motionTokens.stagger.initialDelay,
    },
  },
}

export function Stagger({
  as = 'div',
  children,
  className,
  once = true,
  threshold = 0.12,
  stagger = motionTokens.stagger.base,
  delayChildren = motionTokens.stagger.initialDelay,
  ...props
}) {
  const { ref, armed, visible, reducedMotion } = useViewportVisibility({ once, threshold })
  const Component = m[as]
  const variants = reducedMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: {},
        visible: { transition: { ...staggerParentVariants.visible.transition, staggerChildren: stagger, delayChildren } },
      }

  return (
    <Component
      ref={ref}
      className={className}
      initial={armed && !visible ? 'hidden' : false}
      animate={visible || !armed ? 'visible' : 'hidden'}
      variants={variants}
      {...props}
    >
      {children}
    </Component>
  )
}

export function StaggerItem({
  as = 'div',
  children,
  className,
  delay = 0,
  duration = motionTokens.durations.fast,
  ...props
}) {
  const reducedMotion = useReducedMotion()
  const Component = m[as]
  const variants = reducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: motionTokens.distances.reveal },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, ease: motionTokens.easings.standard, delay },
        },
      }

  return <Component className={className} variants={variants} {...props}>{children}</Component>
}

export function CountUp({
  value,
  from = 0,
  duration = motionTokens.durations.slow,
  locale = 'pt-BR',
  format,
  ...props
}) {
  const count = useMotionValue(from)
  const reducedMotion = useReducedMotion()
  const formatted = useTransform(count, current => (
    format ? format(current) : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(current))
  ))

  useEffect(() => {
    if (!Number.isFinite(value)) return
    if (reducedMotion) {
      count.set(value)
      return
    }

    count.set(from)
    const controls = animate(count, value, {
      duration,
      ease: motionTokens.easings.standard,
    })
    return () => controls.stop()
  }, [count, duration, from, reducedMotion, value])

  return <m.span {...props}>{formatted}</m.span>
}

export function Parallax({ as = 'div', children, className, strength = 24, ...props }) {
  const Component = m[as]
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, strength])

  return (
    <Component
      className={className}
      style={{ y: reducedMotion ? 0 : y }}
      {...props}
    >
      {children}
    </Component>
  )
}

export function PageTransition({
  routeKey,
  as = 'div',
  children,
  className,
  duration = motionTokens.durations.fast,
  ...props
}) {
  const reducedMotion = useReducedMotion()
  const Component = m[as]

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Component
        key={routeKey}
        className={className}
        initial={reducedMotion ? false : { opacity: 0, y: motionTokens.distances.page }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -motionTokens.distances.page }}
        transition={{
          duration: reducedMotion ? 0 : duration,
          ease: motionTokens.easings.standard,
        }}
        {...props}
      >
        {children}
      </Component>
    </AnimatePresence>
  )
}
