// Definisi navigasi bersama untuk shell desktop dan mobile.
// Ikon dipilih karena relevansinya: rumah = beranda, batang = data,
// pengukur = estimasi. Satu set goresan 1.8px agar terlihat satu keluarga.
function Icon({ children }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export const NAV_ITEMS = [
  {
    href: "#/",
    key: "beranda",
    label: "Beranda",
    icon: (
      <Icon>
        <path d="M4 11l8-7 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 9.5V20h12V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Icon>
    ),
  },
  {
    href: "#/data",
    key: "data",
    label: "Data",
    icon: (
      <Icon>
        <path d="M5 20v-6M10 20V7M15 20v-9M20 20V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </Icon>
    ),
  },
  {
    href: "#/prediksi",
    key: "prediksi",
    label: "Estimasi",
    icon: (
      <Icon>
        <path d="M5 19a8 8 0 1 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 15l4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="15" r="1.4" fill="currentColor" />
      </Icon>
    ),
  },
];

export function BrandMark({ compact = false }) {
  return (
    <span className="flex items-center gap-2 font-bold text-ink">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13l1.5-4.5A2 2 0 0 1 7.4 7h9.2a2 2 0 0 1 1.9 1.5L20 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="3" y="13" width="18" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="7.5" cy="18" r="1.4" fill="currentColor" />
        <circle cx="16.5" cy="18" r="1.4" fill="currentColor" />
      </svg>
      <span>{compact ? "Estimasi" : "Estimasi Mobil Bekas"}</span>
    </span>
  );
}
