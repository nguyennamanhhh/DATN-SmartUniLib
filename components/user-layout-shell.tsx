
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Menu } from "lucide-react";

import { UserSidebar } from "@/components/user-sidebar";

type UserLayoutShellProps = {
  children: React.ReactNode;
  header: React.ReactNode;
};

export function UserLayoutShell({
  children,
  header,
}: UserLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Khóa cuộn nền khi menu mobile mở.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FB]">
      {/* Navbar desktop được truyền từ UserLayout */}
      {header}

      {/* Navbar mobile */}
      <div className="sticky top-0 z-30 flex h-16 items-center border-b border-blue-800 bg-[#1254A5] px-4 text-white shadow-sm md:hidden">
        <button
          type="button"
          aria-label="Mở menu"
          aria-expanded={mobileOpen}
          aria-controls="user-mobile-navigation"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-white/15"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link
          href="/dashboard"
          className="ml-3 flex items-center gap-2 font-bold"
        >
          <BookOpen className="h-5 w-5" />
          SmartUniLib
        </Link>
      </div>

      {/* Lớp phủ khi mở menu mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar mobile */}
      <div
        id="user-mobile-navigation"
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 md:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {mobileOpen && (
          <UserSidebar
            collapsed={false}
            mobile
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        )}
      </div>

      {/* Nội dung trang */}
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
