export const RESTAURANT_STATE_CHANGED_EVENT = 'restaurant-state-changed';
export const RESTAURANT_STATE_CHANGED_STORAGE_KEY = 'gestionysabor_restaurant_state_changed_at';

export function emitRestaurantStateChanged() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(RESTAURANT_STATE_CHANGED_EVENT));

  try {
    window.localStorage.setItem(RESTAURANT_STATE_CHANGED_STORAGE_KEY, String(Date.now()));
  } catch {
    // LocalStorage can be unavailable in restricted contexts.
  }
}
