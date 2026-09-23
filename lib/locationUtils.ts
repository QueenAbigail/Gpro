/**
 * Menghitung jarak antara 2 titik koordinat (dalam satuan meter)
 * Menggunakan rumus Haversine
 */
export const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3; // Radius bumi dalam meter
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) *
      Math.cos(lat2 * p) *
      (1 - Math.cos((lon2 - lon1) * p))) /
      2;
  return R * 2 * Math.asin(Math.sqrt(a));
};
