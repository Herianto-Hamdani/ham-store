"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function BodyClassManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    document.body.classList.toggle("admin-area", isAdmin);
    document.body.classList.toggle("public-area", !isAdmin);
  }, [pathname]);

  return null;
}
