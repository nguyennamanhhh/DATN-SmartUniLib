
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  FileUp,
  Home,
  Library,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { UserLayoutShell } from "@/components/user-layout-shell";

const navigation = [
  {
    href: "/dashboard",
    label: "Trang chủ",
    icon: Home,
  },
  {
    href: "/documents",
    label: "Thư viện",
    icon: Library,
  },
  {
    href: "/documents/upload",
    label: "Đăng tài liệu",
    icon: FileUp,
  },
  {
    href: "/rooms",
    label: "Đặt phòng",
    icon: BookOpen,
  },
  {
    href: "/bookings",
    label: "Lịch đặt",
    icon: CalendarDays,
  },
];

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Giữ nguyên cơ chế phân quyền sinh viên.
  const user = await requireRole(["STUDENT"]);

  const displayName =
    user.fullName || user.email || "Sinh viên";

  const initial = displayName
    .charAt(0)
    .toUpperCase();

  const header = (
    <header className="hidden h-[72px] items-center justify-between gap-5 border-b border-blue-800 bg-[#1254A5] px-6 text-white shadow-sm md:flex">
      {/* Logo và tên hệ thống */}
      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <BookOpen className="h-5 w-5" />
        </div>

        <div className="leading-tight">
          <p className="text-base font-bold tracking-tight">
            SmartUniLib
          </p>

          <p className="text-[11px] text-blue-100">
            Thư viện số đại học
          </p>
        </div>
      </Link>

      {/* Thanh điều hướng ngang */}
      <nav
        aria-label="Điều hướng sinh viên"
        className="flex min-w-0 flex-1 items-center justify-center gap-1"
      >
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-blue-50 transition hover:bg-white/15 hover:text-white xl:px-3 xl:text-sm"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Thông tin tài khoản */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden max-w-36 text-right xl:block">
          <p className="truncate text-sm font-semibold">
            {displayName}
          </p>

          <p className="truncate text-xs text-blue-100">
            Sinh viên
          </p>
        </div>

        <div
          title={user.email}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-sm font-bold"
        >
          {initial}
        </div>
      </div>
    </header>
  );

  return (
    <UserLayoutShell header={header}>
      {children}
    </UserLayoutShell>
  );
}
