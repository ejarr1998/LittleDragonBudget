/** Fires the dragon — any DragonFlame on screen breathes for ~1.6s. */
export function breatheFire() {
  window.dispatchEvent(new CustomEvent('ldb:fire'))
}
