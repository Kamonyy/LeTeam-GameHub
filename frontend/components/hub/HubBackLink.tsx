'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { useViewNavigator } from '@/lib/hub/ViewTransitionProvider';

type HubBackLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  children: ReactNode;
};

/** Hub home link with View Transition when supported. */
export default function HubBackLink({
  children,
  onClick,
  ...props
}: HubBackLinkProps) {
  const navigateWithTransition = useViewNavigator();

  return (
    <Link
      href="/"
      prefetch={false}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return;
        }
        e.preventDefault();
        navigateWithTransition('/', { replace: true });
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
