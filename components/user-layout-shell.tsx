"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { UserSidebar } from "@/components/user-sidebar";

type UserLayoutShellProps = {
  children: React.ReactNode;
  header: React.ReactNode;
};

export function UserLayoutShell({
  children,
  header,
}: UserLayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

return (
  <div className="flex min-h-screen bg-gray-50">
    {/* Sidebar desktop */}
    <div className="hidden md:block">
      <UserSidebar
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((value) => !value)
        }
      />
    </div>

    {/* Overlay mobile */}
    {mobileOpen && (
      <button
        type="button"
        aria-label="Đóng menu"
        onClick={() => setMobileOpen(false)}
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
      />
    )}

    {/* Sidebar mobile */}
    <div
      className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform duration-300 md:hidden ${
        mobileOpen
          ? "translate-x-0"
          : "-translate-x-full"
      }`}
    >
      <UserSidebar
        collapsed={false}
        mobile
        onToggle={() => setMobileOpen(false)}
        onNavigate={() => setMobileOpen(false)}
      />
    </div>

    {/* Nội dung */}
    <div className="min-w-0 flex-1">
      {/* Mobile topbar */}
      <div className="flex h-16 items-center border-b bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() =>
            setMobileOpen((value) => !value)
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white"
          aria-label="Mở menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        <span className="ml-3 font-semibold">
          SmartUniLib
        </span>
      </div>

      {header}

      <div>{children}</div>
    </div>
  </div>
);
}