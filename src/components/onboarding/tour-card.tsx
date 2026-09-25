"use client";

import type { CardComponentProps } from "onborda";
import { X, MousePointerClick } from "lucide-react";
import { useOnborda } from "./tour-context";
import { Button } from "@/components/polaris";
import type { GuidedStep } from "@/lib/onboarding/tour-steps";

/**
 * The tour tooltip.
 *
 * Onborda ships its own card, but it is unstyled Tailwind that inherits none
 * of the Polaris tokens. This one is a Polaris surface (bg-surface,
 * radius-300, the modal shadow) with Polaris Buttons: a light card is the only
 * value that stays legible against the dimmed screen whatever is underneath.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const { closeOnborda, setCurrentStep } = useOnborda();
  const guided = step as GuidedStep;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  // An action step advances only when the user actually clicks the highlighted
  // nav item, so it deliberately offers no Next button.
  const awaitsAction = Boolean(guided.awaitRoute);

  return (
    <div className="w-[330px] max-w-[calc(100vw-2rem)] rounded-(--radius-300) bg-(--bg-surface) p-4 text-(--text) shadow-(--shadow-600)">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-xl leading-none">
          {step.icon}
        </span>
        <h2 className="heading-md min-w-0 flex-1">{step.title}</h2>
        <Button
          variant="tertiary"
          size="micro"
          icon={<X className="size-4" />}
          accessibilityLabel="Skip the tour"
          onClick={closeOnborda}
          className="-m-1 shrink-0"
        />
      </div>

      <p className="mt-2 text-[13px] leading-5 text-(--text-secondary)">
        {step.content}
      </p>

      {awaitsAction && (
        <p className="mt-3 flex items-center gap-2 rounded-(--radius-200) bg-(--bg-surface-emphasis) px-3 py-2 text-[13px] font-medium text-(--text-emphasis)">
          <MousePointerClick className="size-4 shrink-0" />
          <span>
            Click <b>{guided.actionLabel}</b> to carry on
          </span>
        </p>
      )}

      {/* Progress reads as "how much is left", which is the question someone
          decides whether to bail on. Dots rather than a bar: at a dozen steps
          they still resolve, and they show position as well as proportion. */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={
                i === currentStep
                  ? "h-1.5 w-4 rounded-full bg-(--bg-fill-emphasis)"
                  : i < currentStep
                    ? "h-1.5 w-1.5 rounded-full bg-(--bg-fill-emphasis)/50"
                    : "h-1.5 w-1.5 rounded-full bg-(--bg-fill-tertiary)"
              }
            />
          ))}
        </div>
        <span className="body-xs shrink-0 tabular-nums text-(--text-secondary)">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-(--text-secondary)">
          <Button variant="monochromePlain" onClick={closeOnborda}>
            Skip tour
          </Button>
        </span>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="tertiary" onClick={prevStep}>
              Back
            </Button>
          )}
          {awaitsAction ? (
            // Safety valve: someone who cannot find the highlighted item is
            // otherwise stuck with no way forward but abandoning the tour.
            <Button
              variant="tertiary"
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Skip step
            </Button>
          ) : (
            <Button variant="primary" onClick={isLast ? closeOnborda : nextStep}>
              {isLast ? "Finish" : "Next"}
            </Button>
          )}
        </div>
      </div>

      {arrow}
    </div>
  );
}
