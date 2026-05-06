export const RESTAURANT_STATE_CHANGED_EVENT = 'restaurant-state-changed';

export function emitRestaurantStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(RESTAURANT_STATE_CHANGED_EVENT));
  }
}
