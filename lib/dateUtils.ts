/**
 * Mengubah object Date atau string tanggal menjadi format: 23 September 2026
 */
export const formatDateIndo = (dateParam: Date | string) => {
  const d = new Date(dateParam);
  const bulanIndo = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
};
