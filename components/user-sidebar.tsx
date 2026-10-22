"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileUp,
  LayoutDashboard,
  Library,
  LogOut,
  X,
} from "lucide-react";

type UserSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;

  // Dùng cho sidebar mobile
  mobile?: boolean;
  onNavigate?: () => void;
};

const menuItems = [
  {
    href: "/dashboard",
    label: "Trang chủ",
    icon: LayoutDashboard,
  },
  {
    href: "/documents",
    label: "Thư viện số",
    icon: Library,
  },
  {
    href: "/documents/upload",
    label: "Upload tài liệu",
    icon: FileUp,
  },
  {
    href: "/rooms",
    label: "Đặt phòng",
    icon: BookOpen,
  },
  {
    href: "/bookings",
    label: "Lịch đặt phòng",
    icon: CalendarDays,
  },
];

export function UserSidebar({
  collapsed,
  onToggle,
  mobile = false,
  onNavigate,
}: UserSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    if (href === "/documents") {
      return (
        pathname === "/documents" ||
        (pathname.startsWith("/documents/") &&
          !pathname.startsWith("/documents/upload"))
      );
    }

    if (href === "/documents/upload") {
      return pathname === "/documents/upload";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r bg-white transition-all duration-300 ${
        mobile
          ? "w-64"
          : collapsed
            ? "w-24"
            : "w-64"
      }`}
    >
      {/* Logo + Toggle / Close */}
      <div
        className={`flex h-16 items-center border-b ${
          !mobile && collapsed
            ? "justify-between px-3"
            : "justify-between px-5"
        }`}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="text-lg font-bold"
        >
          {!mobile && collapsed
            ? "SUL"
            : "SmartUniLib"}
        </Link>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-black"
          title={
            mobile
              ? "Đóng menu"
              : collapsed
                ? "Mở rộng sidebar"
                : "Thu gọn sidebar"
          }
        >
          {mobile ? (
            <X className="h-5 w-5" />
          ) : collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={
                !mobile && collapsed
                  ? item.label
                  : undefined
              }
              className={`flex items-center rounded-lg transition ${
                !mobile && collapsed
                  ? "justify-center px-3 py-3"
                  : "gap-3 px-3 py-2.5"
              } ${
                active
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />

              {(mobile || !collapsed) && (
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Đăng xuất */}
      <div className="border-t p-3">
        <button
          type="button"
          onClick={() =>
            signOut({
              redirectUrl: "/sign-in",
            })
          }
          title={
            !mobile && collapsed
              ? "Đăng xuất"
              : undefined
          }
          className={`flex w-full items-center rounded-lg text-red-600 transition hover:bg-red-50 ${
            !mobile && collapsed
              ? "justify-center px-3 py-3"
              : "gap-3 px-3 py-2.5"
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />

          {(mobile || !collapsed) && (
            <span className="text-sm font-medium">
              Đăng xuất
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}