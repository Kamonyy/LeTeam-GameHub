'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import { resolveGameIdFromPath } from '@/lib/hub/games-registry';
import { normalizePathname } from '@/lib/hub/pathname';
import { MOTION_UI_MS } from '@/hooks/useDelayedUnmount';

export type ViewNavigateOptions = {
  replace?: boolean;
};

type ViewNavigator = (href: string, options?: ViewNavigateOptions) => void;

type PendingNavigation = {
  gameId: string;
  targetPath: string;
};

type ViewTransitionContextValue = {
  navigate: ViewNavigator;
  notifyRouteContentReady: () => void;
};

const ViewTransitionContext = createContext<ViewTransitionContextValue | null>(
  null,
);

const PENDING_NAV_MAX_MS = 12_000;
/** Minimum time the hub → game loading overlay stays fully visible before fade-out. */
const ROUTE_LOADING_MIN_MS = 1_000;

function resolveGameIdFromHref(href: string): string | null {
  return resolveGameIdFromPath(href);
}

export function ViewTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const [routeContentReady, setRouteContentReady] = useState(false);
  const navigatingRef = useRef(false);
  const navStartedAtRef = useRef(0);
  const dismissTimerRef = useRef<number | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissOverlay = useCallback(() => {
    clearDismissTimer();
    requestAnimationFrame(() => {
      setOverlayExiting(true);
      dismissTimerRef.current = window.setTimeout(() => {
        setPendingNavigation(null);
        setOverlayExiting(false);
        setRouteContentReady(false);
        dismissTimerRef.current = null;
      }, MOTION_UI_MS);
    });
  }, [clearDismissTimer]);

  useEffect(() => {
    if (!pendingNavigation || !routeContentReady) return;

    const current = normalizePathname(pathname);
    if (current !== pendingNavigation.targetPath) return;

    const elapsed = performance.now() - navStartedAtRef.current;
    const waitMs = Math.max(0, ROUTE_LOADING_MIN_MS - elapsed);

    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        dismissOverlay();
      });
    }, waitMs);

    return () => window.clearTimeout(timer);
  }, [pathname, pendingNavigation, routeContentReady, dismissOverlay]);

  useEffect(() => {
    if (!pendingNavigation) return;

    const timeout = window.setTimeout(() => {
      dismissOverlay();
    }, PENDING_NAV_MAX_MS);

    return () => window.clearTimeout(timeout);
  }, [pendingNavigation, dismissOverlay]);

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  const notifyRouteContentReady = useCallback(() => {
    setRouteContentReady(true);
  }, []);

  const navigateWithTransition = useCallback<ViewNavigator>(
    (href, options) => {
      if (navigatingRef.current) return;

      const targetPath = normalizePathname(href);
      const gameId = resolveGameIdFromHref(href);
      const goingToHub = targetPath === '/';

      clearDismissTimer();
      setOverlayExiting(false);
      setRouteContentReady(false);
      navStartedAtRef.current = performance.now();

      if (gameId && !goingToHub) {
        setPendingNavigation({ gameId, targetPath });
      } else {
        setPendingNavigation(null);
      }

      navigatingRef.current = true;
      if (options?.replace) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
      window.setTimeout(() => {
        navigatingRef.current = false;
      }, 400);
    },
    [router, clearDismissTimer],
  );

  const showOverlay = pendingNavigation != null;

  return (
    <ViewTransitionContext.Provider
      value={{ navigate: navigateWithTransition, notifyRouteContentReady }}
    >
      {children}
      {showOverlay ?
        <div
          className={
            overlayExiting ?
              'hub-route-loading-overlay hub-route-loading-overlay--exit'
            : 'hub-route-loading-overlay'
          }
          role="status"
          aria-live="polite"
          aria-busy={!overlayExiting}
        >
          <HubGameLoadingScreen
            key={pendingNavigation.gameId}
            gameId={pendingNavigation.gameId}
          />
        </div>
      : null}
    </ViewTransitionContext.Provider>
  );
}

export function useViewNavigator(): ViewNavigator {
  const context = useContext(ViewTransitionContext);
  if (!context) {
    throw new Error('useViewNavigator must be used within a ViewTransitionProvider');
  }
  return context.navigate;
}

/** Call when a game route has mounted its client shell (post session hydration). */
export function useNotifyRouteContentReady(): () => void {
  const context = useContext(ViewTransitionContext);
  if (!context) {
    return () => {};
  }
  return context.notifyRouteContentReady;
}
