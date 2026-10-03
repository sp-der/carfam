/** Geometry adapted from the supplied React Bits BranchedMenu source. */
export const BRANCH_ROW = 44;
export const BRANCH_PAD = 6;
export const BRANCH_INDENT = 32;
const TRUNK = 10;
const RADIUS = 10;

export function branchPaths(index: number) {
  const y = BRANCH_PAD + index * BRANCH_ROW + BRANCH_ROW / 2;
  const end = BRANCH_INDENT - 6;
  const curve = `A ${RADIUS} ${RADIUS} 0 0 0 ${TRUNK + RADIUS} ${y} H ${end}`;
  return {
    base: `M ${TRUNK} ${y - RADIUS} ${curve}`,
    reach: `M ${TRUNK} 0 V ${y - RADIUS} ${curve}`,
    length: y - RADIUS + (Math.PI * RADIUS) / 2 + end - TRUNK - RADIUS,
  };
}

export function branchTrunk(rows: number) {
  return `M ${TRUNK} 0 V ${BRANCH_PAD + (Math.max(1, rows) - 1) * BRANCH_ROW + BRANCH_ROW / 2 - RADIUS}`;
}
