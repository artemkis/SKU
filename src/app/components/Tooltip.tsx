'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Align = 'center' | 'left' | 'right';

export default function Tooltip({
  text,
  formula,
  align = 'center',
}: {
  text: string;
  formula?: string;
  align?: Align;
}) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const compute = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    let left = r.left + r.width / 2;
    if (align === 'left') left = r.left;
    if (align === 'right') left = r.right;
    const top = r.bottom + gap;
    setCoords({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    compute();
    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  const popover =
    open && coords
      ? createPortal(
          <div
            className="z-[200] fixed max-w-[90vw] w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-sm leading-snug"
            style={{
              top: coords.top,
              left: align === 'center' ? coords.left : align === 'left' ? coords.left : coords.left,
              transform:
                align === 'center'
                  ? 'translateX(-50%)'
                  : align === 'left'
                  ? 'translateX(0)'
                  : 'translateX(-100%)',
            }}
            role="tooltip"
          >
            {formula && (
              <>
                <p className="font-medium text-gray-900 mb-1">Формула:</p>
                <p className="text-gray-700 text-sm mb-2">
                  <code className="break-words">{formula}</code>
                </p>
              </>
            )}
            <p className="text-xs text-gray-600 break-words">{text}</p>
          </div>,
          document.body
        )
      : null;

  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        ref={anchorRef}
        type="button"
        aria-label="Показать подсказку"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 focus:ring-offset-white"
      >
        <svg className="h-4 w-4 text-gray-400 hover:text-indigo-500 focus:text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-10.5a1 1 0 110 2 1 1 0 010-2zM9 9.5a1 1 0 112 0v4a1 1 0 11-2 0v-4z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {popover}
    </span>
  );
}
