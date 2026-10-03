import { describe, expect, it } from "vitest";
import {
  branchPaths,
  branchTrunk,
  BRANCH_ROW,
  BRANCH_INDENT,
} from "../src/components/inventory/branch-paths";

describe("branched filter geometry", () => {
  it("aligns curved branches with the checkbox row centers", () => {
    expect(branchPaths(0).base).toBe("M 10 18 A 10 10 0 0 0 20 28 H 26");
    expect(branchPaths(1).base).toBe("M 10 62 A 10 10 0 0 0 20 72 H 26");
    expect(BRANCH_ROW).toBe(44);
    expect(BRANCH_INDENT).toBe(32);
  });
  it("draws each selected path independently for multi-select", () => {
    expect(branchPaths(2).reach).toBe("M 10 0 V 106 A 10 10 0 0 0 20 116 H 26");
    expect(branchPaths(2).length - branchPaths(1).length).toBeCloseTo(44);
    expect(branchPaths(0).length).toBeGreaterThan(0);
  });
  it("ends the trunk at the last curve and handles empty lists safely", () => {
    expect(branchTrunk(3)).toBe("M 10 0 V 106");
    expect(branchTrunk(0)).toBe("M 10 0 V 18");
  });
});
