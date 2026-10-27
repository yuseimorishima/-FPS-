export const MAGAZINE = 24;
export function circleHitsBox(x, z, radius, box) {
  const nearX = Math.max(box.x - box.w / 2, Math.min(x, box.x + box.w / 2));
  const nearZ = Math.max(box.z - box.d / 2, Math.min(z, box.z + box.d / 2));
  return (x - nearX) ** 2 + (z - nearZ) ** 2 < radius ** 2;
}
export function reloadAmmo(ammo, reserve) {
  const amount = Math.min(MAGAZINE - ammo, reserve);
  return { ammo: ammo + amount, reserve: reserve - amount };
}
export function formatTime(seconds) {
  const t = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
