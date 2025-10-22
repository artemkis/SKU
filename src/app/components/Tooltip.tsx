'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  /** Контент тултипа (то, что показываем в карточке) */
  content: React.ReactNode
  /** Триггер (иконка "i" и т.п.) — оборачивается в Tooltip */
  children: React.ReactNode
  /** Макс. ширина тултипа */
  maxWidth?: number
}

export default function Tooltip({ children, content, maxWidth = 360 }: Props) {
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const show = () => setOpen(true)
  const hide = () => setOpen(false)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const pad = 8
    const vw = window.innerWidth

    // сначала "вне экрана", чтобы измерить
    setCoords({ top: -9999, left: -9999 })

    requestAnimationFrame(() => {
      const tipEl = tipRef.current
      const tw = Math.min(maxWidth, tipEl ? tipEl.offsetWidth : maxWidth)
      const th = tipEl ? tipEl.offsetHeight : 0

      const enoughTop = rect.top >= th + pad
      const top = enoughTop ? rect.top - th - pad : rect.bottom + pad

      let left = rect.left + rect.width / 2 - tw / 2
      left = Math.max(pad, Math.min(left, vw - tw - pad))

      setCoords({ top, left })
    })
  }, [open, maxWidth])

  // закрываем по ESC и клику вне
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !tipRef.current?.contains(t)) hide()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        className="inline-flex items-center justify-center"
      >
        {children}
      </span>

      {open && coords &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            style={{ position: 'fixed', top: coords.top, left: coords.left, maxWidth, zIndex: 1000 }}
            className="rounded-lg border border-gray-200 bg-white shadow-xl px-3 py-2 text-xs text-gray-700 whitespace-pre-line break-words"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  )
}
