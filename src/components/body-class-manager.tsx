"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function BodyClassManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const isAdminLogin = pathname === "/admin/login";
    document.body.classList.toggle("admin-area", isAdmin);
    document.body.classList.toggle("public-area", !isAdmin);
    document.body.classList.toggle("admin-login-page", isAdminLogin);
  }, [pathname]);

  return null;
}
