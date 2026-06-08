// Lightweight animate-on-scroll: reveals children with a fade + rise the first
// time they enter the viewport. IntersectionObserver-based, no dependency.
// Respects prefers-reduced-motion (content shows immediately, no transition).

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  /** Stagger in ms, applied as a transition-delay once revealed. */
  delay?: number;
  className?: string;
  as?: 'div' | 'section';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honor reduced-motion: reveal immediately, skip the transition.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            obs.disconnect(); // reveal once, then stop observing
            break;
          }
        }
      },
      // Trigger a touch before fully in view so it feels responsive.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      // biome-ignore lint/suspicious/noExplicitAny: ref type varies with the polymorphic `as` tag
      ref={ref as any}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:transition-none',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
        className
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
}
