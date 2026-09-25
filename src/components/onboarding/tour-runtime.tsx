"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Onborda } from "onborda";
import { useAuth } from "@/contexts/auth-context";
import { useGuidedSteps } from "@/hooks/use-guided-steps";
import { onboardingService } from "@/lib/services/onboarding-service";
import { WELCOME_TOUR, type GuidedStep } from "@/lib/onboarding/tour-steps";
import { useIsWelcomeScreen } from "@/hooks/use-has-vehicles";
import { useOnborda } from "./tour-context";
import { TourCard } from "./tour-card";

/**
 * Starts the tour for anyone who has never taken it, advances it when the user
 * performs a step's action, and records completion when it ends.
 *
 * Must live INSIDE OnbordaProvider — `useOnborda` reads that context. The
 * provider sits in ./onboarding-tour, which is always loaded.
 */
function TourController({ steps }: { steps: GuidedStep[] }) {
  const { user, revalidate } = useAuth();
  const { startOnborda, isOnbordaVisible, currentStep, setCurrentStep } =
    useOnborda();
  const pathname = usePathname();

  const userId = user?.id ?? null;
  // Not while the first-run screen is up. Every step after the second
  // highlights a nav item, and that screen deliberately has no nav — the tour
  // would spotlight nothing at all. It starts on the dashboard proper, once
  // there is a car to look at and a rail to teach.
  const isWelcome = useIsWelcomeScreen(pathname);
  const needsTour = Boolean(
    user && user.onboardingCompletedAt === null && !isWelcome,
  );

  // Guards against re-opening the tour the instant it is dismissed: closing it
  // writes the completion date, but until that refetch lands `needsTour` is
  // still true and the effect would fire straight back up.
  //
  // It re-arms when the user becomes un-onboarded again, so a completion date
  // cleared elsewhere offers the tour again on the next visit to /dashboard.
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (!needsTour) {
      startedRef.current = false;
      return;
    }
    // Start from the dashboard only. The Add Vehicle step points at the
    // greeting's button, and starting on an arbitrary deep link would
    // highlight an element that is not there.
    if (startedRef.current || pathname !== "/dashboard") return;
    startedRef.current = true;
    startOnborda(WELCOME_TOUR);
  }, [needsTour, pathname, startOnborda]);

  // Advance when the user reaches the route the current step asked for. This
  // is what makes the middle of the tour a tutorial rather than a slideshow:
  // the step is satisfied by the real click on the real nav item, and pressing
  // Next is not offered as a substitute.
  React.useEffect(() => {
    if (!isOnbordaVisible) return;
    const step = steps[currentStep];
    if (!step?.awaitRoute || pathname !== step.awaitRoute) return;
    // Let the destination paint before moving the spotlight, otherwise the
    // pointer measures the outgoing page and lands in the wrong place.
    setCurrentStep(currentStep + 1, 450);
  }, [pathname, currentStep, isOnbordaVisible, setCurrentStep, steps]);

  // Persist completion by watching the tour close rather than by wiring a
  // callback into every exit path. Onborda ends in three ways — Finish, Skip
  // and the X — and all three land here, so none can slip through and leave
  // the user marked un-onboarded.
  const wasVisible = React.useRef(false);
  React.useEffect(() => {
    if (isOnbordaVisible) {
      wasVisible.current = true;
      return;
    }
    if (!wasVisible.current || !userId) return;
    wasVisible.current = false;
    void onboardingService
      .markComplete(userId)
      .then(() => revalidate({ force: true }))
      // A failed write is not worth interrupting the user for: the cost is
      // being offered the tour again next time, not lost work.
      .catch(() => {});
  }, [isOnbordaVisible, userId, revalidate]);

  return null;
}

/**
 * The tour itself: Onborda's overlay and card (framer-motion) plus the
 * controller. Loaded on demand by ./onboarding-tour — only for a user who has
 * not taken the tour yet, or once someone asks to replay it.
 *
 * `interact` is ON because the tour is click-driven — without it the overlay
 * swallows the very clicks each step is waiting for.
 *
 * The transition is a short tween, not a spring. Onborda dims the page with
 * one enormous animated `box-shadow`, which the compositor cannot cache and
 * must repaint at full viewport size every frame; a spring keeps that repaint
 * running for its whole settle time and is what makes the tour feel heavy.
 */
export default function TourRuntime() {
  // The tour is one script but the rail is not: a member only sees the items
  // their capabilities allow. Showing a step that points at a hidden nav item
  // strands them, because middle steps have no Next button -- the click IS the
  // step (GEN-127). Build the tour from what this person can actually reach.
  const steps = useGuidedSteps();

  return (
    <Onborda
      steps={[{ tour: WELCOME_TOUR, steps }]}
      cardComponent={TourCard}
      interact
      shadowRgb="12,21,44"
      shadowOpacity="0.6"
      cardTransition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
    >
      <TourController steps={steps} />
    </Onborda>
  );
}
