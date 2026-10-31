export type TourBounds = { left: number; top: number; width: number; height: number };

export function tourCallout(target: TourBounds, panel: { height: number }, area: TourBounds, maxScrollUp = Infinity, reveal = true) {
  const gap = 16, width = Math.min(352, area.width), right = area.left + area.width, bottom = area.top + area.height;
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high));
  if (area.width < 640) {
    // Center the control and instructions together inside the space between the shell bars.
    const focusHeight = Math.max(target.height, Math.min(Math.hypot(target.width, target.height) + 16, area.height - 112));
    const height = Math.min(panel.height, Math.max(44, area.height - focusHeight - gap));
    const groupHeight = focusHeight + gap + height;
    const desiredTop = area.top + (area.height - groupHeight) / 2 + (focusHeight - target.height) / 2;
    const scrollBy = reveal ? Math.max(-maxScrollUp, target.top - desiredTop) : 0;
    const center = target.top - scrollBy + target.height / 2;
    const below = bottom - center - focusHeight / 2 - gap;
    const above = center - focusHeight / 2 - gap - area.top;
    const side = below >= Math.min(height, 96) || below >= above ? 'below' : 'above';
    const maxHeight = Math.min(height, Math.max(44, side === 'below' ? below : above));
    return { left: area.left + (area.width - width) / 2,
      top: clamp(side === 'below' ? center + focusHeight / 2 + gap : center - focusHeight / 2 - gap - maxHeight, area.top, bottom - maxHeight),
      width, maxHeight, side, scrollBy };
  }
  let scrollBy = reveal ? Math.max(-maxScrollUp, target.top < area.top ? target.top - area.top : target.top + target.height > bottom ? target.top + target.height - bottom : 0) : 0;
  const top = target.top - scrollBy, targetBottom = top + target.height;
  const sideHeight = Math.min(panel.height, area.height);
  const sideTop = clamp(top + target.height / 2 - sideHeight / 2, area.top, bottom - sideHeight);
  const onRight = target.left + target.width + gap, onLeft = target.left - gap - width;
  if (onRight >= area.left && onRight + width <= right) return { left: onRight, top: sideTop, width, maxHeight: sideHeight, side: 'right', scrollBy };
  if (onLeft >= area.left && onLeft + width <= right) return { left: onLeft, top: sideTop, width, maxHeight: sideHeight, side: 'left', scrollBy };
  const below = bottom - targetBottom - gap, above = top - area.top - gap;
  const height = Math.min(panel.height, Math.max(44, reveal ? area.height - target.height - gap : Math.min(area.height, Math.max(below, above))));
  const left = clamp(target.left + target.width / 2 - width / 2, area.left, right - width);
  if (height <= below) return { left, top: clamp(targetBottom + gap, area.top, bottom - height), width, maxHeight: height, side: 'below', scrollBy };
  if (height <= above) return { left, top: clamp(top - height - gap, area.top, bottom - height), width, maxHeight: height, side: 'above', scrollBy };
  if (!reveal) return { left, top: area.top, width, maxHeight: height, side: 'above', scrollBy };
  // On short screens, move only as far as needed to fit the pair without covering the control.
  if (height - below <= height - above || scrollBy - (height - above) < -maxScrollUp) {
    const shift = height - below; scrollBy += shift;
    return { left, top: targetBottom + gap - shift, width, maxHeight: height, side: 'below', scrollBy };
  }
  const shift = height - above; scrollBy -= shift;
  return { left, top: top - height - gap + shift, width, maxHeight: height, side: 'above', scrollBy };
}

export function tourBubble(target: TourBounds, viewport: { width: number; height: number }) {
  const x = target.left + target.width / 2, y = target.top + target.height / 2;
  const focusRadius = Math.hypot(target.width / 2, target.height / 2) + 8;
  const coverRadius = Math.max(focusRadius, Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y)) + 1);
  return { x, y, focusRadius, coverRadius };
}
