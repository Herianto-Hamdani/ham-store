"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { getScheduledThemeMode } from "@/lib/theme-schedule";

export function BodyClassManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const isAdminLogin = pathname === "/admin/login";
    const applyScheduledTheme = !isAdmin;

    const syncTheme = () => {
      const themeMode = getScheduledThemeMode(new Date());
      document.body.classList.toggle("theme-light", applyScheduledTheme && themeMode === "light");
      document.body.classList.toggle("theme-dark", applyScheduledTheme && themeMode === "dark");
    };

    document.body.classList.toggle("admin-area", isAdmin);
    document.body.classList.toggle("public-area", !isAdmin);
    document.body.classList.toggle("admin-login-page", isAdminLogin);
    if (!applyScheduledTheme) {
      document.body.classList.remove("theme-light", "theme-dark");
      return;
    }

    syncTheme();
    const timerId = window.setInterval(syncTheme, 60 * 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [pathname]);

  return null;
}
