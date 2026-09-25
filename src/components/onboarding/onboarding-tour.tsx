"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { WELCOME_TOUR } from "@/lib/onboarding/tour-steps";
import { OnbordaProvider, useOnborda } from "./tour-context";

// Onborda's overlay pulls in framer-motion; nobody needs it until a tour runs.
const TourRuntime = dynamic(() => import("./tour-runtime"), { ssr: false });

/**
 * Mounts the tour runtime once it is needed and keeps it mounted from then on.
 *
 * Needed = the user has never taken the tour (it auto-starts on /dashboard),
 * or a tour was started (Replay). It stays mounted after that because the
 * runtime is what records completion when the tour closes — unmounting on
 * close would drop that write.
 */
function TourLoader() {
  const { user } = useAuth();
  const { isOnbordaVisible } = useOnborda();
  const needed = Boolean(
    (user && user.onboardingCompletedAt === null) || isOnbordaVisible,
  );
  const [loaded, setLoaded] = React.useState(false);
  // Latch during render (React's "adjust state on prop change" pattern): the
  // runtime mounts in this same pass instead of one effect later.
  if (needed && !loaded) setLoaded(true);
  return loaded || needed ? <TourRuntime /> : null;
}

/**
 * Returns a callback that replays the tour from the top.
 *
 * Lives here rather than in the header so the "get to the dashboard first"
 * rule sits next to the auto-start that shares it: the Add Vehicle step points
 * at the greeting's button, which exists on no other page. Starting while the
 * navigation is still in flight makes Onborda measure the outgoing page and
 * render the first card half off-screen, so a replay from elsewhere waits for
 * the route to commit before it begins.
 *
 * It starts the tour directly instead of clearing the user's completion date
 * and letting the auto-start effect notice — the signed-in user is cached, so
 * that refetch is not reliable and the replay silently did nothing. Closing it
 * writes a fresh completion date exactly as a first run does. Starting it is
 * also what makes TourLoader fetch the runtime.
 */
export function useReplayTour(): () => void {
  const router = useRouter();
  const pathname = usePathname();
  const { startOnborda } = useOnborda();
  const pending = React.useRef(false);

  React.useEffect(() => {
    if (!pending.current || pathname !== "/dashboard") return;
    pending.current = false;
    startOnborda(WELCOME_TOUR);
  }, [pathname, startOnborda]);

  return React.useCallback(() => {
    if (pathname === "/dashboard") {
      startOnborda(WELCOME_TOUR);
      return;
    }
    pending.current = true;
    router.push("/dashboard");
  }, [pathname, router, startOnborda]);
}

/**
 * Wraps the dashboard in the guided tour's state.
 *
 * Only the state lives here (a tiny context the sidebar also reads); the tour
 * UI loads lazily via TourLoader.
 */
export function OnboardingTour({ children }: { children: React.ReactNode }) {
  return (
    <OnbordaProvider>
      {children}
      <TourLoader />
    </OnbordaProvider>
  );
}
