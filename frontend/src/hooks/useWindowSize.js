import { useEffect, useState } from "react";

// Mendeteksi lebar viewport untuk memilih shell desktop vs mobile.
// Batas 768px = batas tablet portrait: di bawahnya Bottom Navigation,
// di atasnya Sidebar statis.
export function useWindowSize(breakpoint = 768) {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? breakpoint : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return { width, isMobile: width < breakpoint, isDesktop: width >= breakpoint };
}
