"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { AdminSidebar } from "@/components/admin-sidebar";

type AdminLayoutShellProps = {
  children: React.ReactNode;
  header: React.ReactNode;
};

export function AdminLayoutShell({
  children,
  header,
}: AdminLayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <AdminSidebar
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
        <AdminSidebar
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

          <div className="ml-3">
            <p className="font-semibold">
              SmartUniLib
            </p>

            <p className="text-xs text-muted-foreground">
              Administration Portal
            </p>
          </div>
        </div>

        {header}

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}