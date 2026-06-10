export const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function checkIsMobileLayout() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || isMobile;
}
