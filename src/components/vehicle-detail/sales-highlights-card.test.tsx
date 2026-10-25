import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeVehicle } from "@/test/factories";
import { SalesHighlightsCard } from "./sales-highlights-card";

// The card counts MOT days from the viewer's today.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-25T12:00:00"));
});
afterEach(() => {
  vi.useRealTimers();
});

const value = (label: string) =>
  screen.getByText(label).closest("div")?.querySelector("dd")?.textContent;

describe("SalesHighlightsCard", () => {
  it("shows the four facts a buyer asks for", () => {
    render(
      <SalesHighlightsCard
        vehicle={makeVehicle({
          mileage: 68500,
          serviceHistory: "full",
          motExpiry: "2027-09-29",
          formerKeepers: 2,
        })}
      />,
    );
    expect(value("Mileage")).toBe("68,500 mi");
    expect(value("Service history")).toBe("Full");
    expect(value("MOT until")).toBe("29 Sept 2027");
    expect(value("Previous owners")).toBe("2");
    expect(screen.queryByText("Due soon")).toBeNull();
  });

  it("flags an MOT running out within 30 days, and one that has run out", () => {
    const { rerender } = render(
      <SalesHighlightsCard vehicle={makeVehicle({ motExpiry: "2026-11-10" })} />,
    );
    expect(screen.getByText("Due soon")).toBeInTheDocument();

    rerender(<SalesHighlightsCard vehicle={makeVehicle({ motExpiry: "2026-10-01" })} />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("shows a dash for what isn't known", () => {
    render(
      <SalesHighlightsCard
        vehicle={makeVehicle({ motExpiry: null, formerKeepers: null, serviceHistory: "unknown" })}
      />,
    );
    expect(value("MOT until")).toBe("—");
    expect(value("Previous owners")).toBe("—");
    expect(value("Service history")).toBe("Unknown");
  });
});
