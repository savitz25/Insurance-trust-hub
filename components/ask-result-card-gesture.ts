/** A touch scroll past this distance must not open the company profile. */
export const CARD_SCROLL_CANCEL_PX = 8;

export function pointerMovedPastCardScroll(startX: number, startY: number, x: number, y: number): boolean {
  const dx = x - startX;
  const dy = y - startY;
  return dx * dx + dy * dy > CARD_SCROLL_CANCEL_PX * CARD_SCROLL_CANCEL_PX;
}
