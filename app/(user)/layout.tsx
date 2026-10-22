import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireRole(["STUDENT"]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white">
          <div className="border-b p-6">
            <Link
              href="/dashboard"
              className="text-xl font-bold"
            >
              SmartUniLib
            </Link>

            <p className="mt-1 text-xs text-muted-foreground">
              Student Portal
            </p>
          </div>

          <nav className="space-y-1 p-4">
            <Link
              href="/dashboard"
              className="block rounded-md px-4 py-3 hover:bg-gray-100"
            >
              Trang chủ
            </Link>

            <Link
              href="/documents"
              className="block rounded-md px-4 py-3 hover:bg-gray-100"
            >
              Thư viện số
            </Link>

            <Link
              href="/documents/upload"
              className="block rounded-md px-4 py-3 hover:bg-gray-100"
            >
              Upload tài liệu
            </Link>

            <Link
              href="/rooms"
              className="block rounded-md px-4 py-3 hover:bg-gray-100"
            >
              Đặt phòng
            </Link>

            <Link
              href="/bookings"
              className="block rounded-md px-4 py-3 hover:bg-gray-100"
            >
              Lịch đặt phòng
            </Link>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b bg-white px-8">
            <div>
              <p className="text-sm text-muted-foreground">
                Xin chào
              </p>

              <p className="font-medium">
                {user.fullName || user.email}
              </p>
            </div>

            <div className="rounded-md bg-gray-100 px-3 py-1 text-sm">
              STUDENT
            </div>
          </header>

          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}