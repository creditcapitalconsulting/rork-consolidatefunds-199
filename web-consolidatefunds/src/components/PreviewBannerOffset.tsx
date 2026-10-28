import { useEffect } from "react";

/**
 * The Rork preview injects a fixed "Your app is in preview" card over the top of
 * the page; it doesn't exist on the published site. While it is present, shift the
 * sticky header and page content below it so the logo and nav stay tappable.
 */
export function PreviewBannerOffset() {
  useEffect(() => {
    const apply = () => {
      try {
        const el = document.getElementById("rork-dev-banner");
        const h = el ? Math.ceil(el.getBoundingClientRect().bottom) + 10 : 0;
        document.documentElement.style.setProperty("--preview-offset", `${h}px`);
      } catch {
        /* ignore */
      }
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", apply);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--preview-offset");
    };
  }, []);
  return null;
}
