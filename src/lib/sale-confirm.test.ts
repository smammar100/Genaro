import { describe, expect, it } from "vitest";
import { lostConfirmOptions } from "./sale-confirm";

describe("lostConfirmOptions", () => {
  it("a deposit that reserves the car puts it back on sale", () => {
    expect(lostConfirmOptions("Faysal Ahmed", "LS68 NYY", true)).toEqual({
      title: "Mark Faysal Ahmed's deal as lost?",
      description: "LS68 NYY goes back on sale. You can move the deal back later.",
      confirmText: "Mark as lost",
      destructive: true,
    });
  });

  it("a lead, or a car another customer has reserved, leaves the car as it is", () => {
    expect(lostConfirmOptions("Daniel Okafor", "LS68 NYY", false).description).toBe(
      "LS68 NYY stays as it is. You can move the deal back later.",
    );
  });

  it("never says the car goes back on sale unless this deal releases it", () => {
    expect(lostConfirmOptions("Daniel Okafor", "LS68 NYY", false).description).not.toMatch(/back on sale/);
  });

  it("without a car, only says the deal can come back", () => {
    expect(lostConfirmOptions("Daniel Okafor", null, true).description).toBe("You can move the deal back later.");
  });
});
