import { useEffect, useState } from "react";

// Mantém o foco dentro do menu mobile e o devolve ao fechar.
export function useMobileMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement;
    const sidebar = document.getElementById("app-navigation");
    const focusable = () =>
      Array.from(sidebar.querySelectorAll('button,a[href],input,select,[tabindex="0"]'));
    focusable()[0]?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keydown(e) {
      if (e.key === "Escape") setMenuOpen(false);
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [menuOpen]);
  return { menuOpen, setMenuOpen };
}
