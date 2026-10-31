export type TourBounds = { left: number; top: number; width: number; height: number };

export function tourCallout(target: TourBounds, panel: { height: number }, area: TourBounds, maxScrollUp = Infinity, reveal = true, context?: TourBounds) {
  const gap = 16, width = Math.min(352, area.width), right = area.left + area.width, bottom = area.top + area.height;
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high));
  const focusHeight = Math.max(target.height, Math.min(Math.hypot(target.width, target.height) + 16, area.height - 112));
  const halo = (focusHeight - target.height) / 2;
  // Keep compact cards intact; large editors get a bounded view of the current control.
  const useContext = context && context.height <= area.height * .6;
  const occupied = {
    left: useContext ? Math.min(context.left, target.left) : target.left,
    right: useContext ? Math.max(context.left + context.width, target.left + target.width) : target.left + target.width,
    top: useContext ? Math.min(context.top, target.top - halo) : target.top - halo,
    bottom: useContext ? Math.max(context.top + context.height, target.top + target.height + halo) : target.top + target.height + halo,
  };
  const occupiedHeight = occupied.bottom - occupied.top;
  const onRight = occupied.right + gap, onLeft = occupied.left - gap - width;
  if (area.width >= 640 && (onRight >= area.left && onRight + width <= right || onLeft >= area.left && onLeft + width <= right)) {
    const scrollBy = reveal ? Math.max(-maxScrollUp, occupied.top + occupiedHeight / 2 - (area.top + area.height / 2)) : 0;
    const height = Math.min(panel.height, area.height);
    const side = onRight >= area.left && onRight + width <= right ? 'right' : 'left';
    return { left: side === 'right' ? onRight : onLeft,
      top: clamp(target.top - scrollBy + target.height / 2 - height / 2, area.top, bottom - height),
      width, maxHeight: height, side, scrollBy };
  }
  const height = Math.min(panel.height, Math.max(44, area.height - occupiedHeight - gap));
  const preferredAbove = Boolean(useContext && target.top + target.height / 2 > context.top + context.height / 2);
  const desiredTop = area.top + (area.height - occupiedHeight - gap - height) / 2 + (preferredAbove ? height + gap : 0);
  const scrollBy = reveal ? Math.max(-maxScrollUp, occupied.top - desiredTop) : 0;
  const movedTop = occupied.top - scrollBy, movedBottom = occupied.bottom - scrollBy;
  const above = movedTop - area.top - gap, below = bottom - movedBottom - gap;
  const side = preferredAbove && above >= height || below < Math.min(height, 96) && above > below ? 'above' : 'below';
  const maxHeight = Math.min(height, Math.max(44, side === 'above' ? above : below));
  return { left: area.left + (area.width - width) / 2,
    top: clamp(side === 'above' ? movedTop - gap - maxHeight : movedBottom + gap, area.top, bottom - maxHeight),
    width, maxHeight, side, scrollBy };
}

export function tourBubble(target: TourBounds, viewport: { width: number; height: number }) {
  const x = target.left + target.width / 2, y = target.top + target.height / 2;
  const focusRadius = Math.hypot(target.width / 2, target.height / 2) + 8;
  const coverRadius = Math.max(focusRadius, Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y)) + 1);
  return { x, y, focusRadius, coverRadius };
}
