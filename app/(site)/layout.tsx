import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/** Chrome for everything except an active game. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      {/* Clears the fixed mobile bar so nothing hides behind it. */}
      <div className="h-14 sm:hidden" aria-hidden />
      <BottomNav />
    </>
  );
}
