import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  FileCheck2,
  FileText,
  FileUp,
  Library,
  TriangleAlert,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";

export default async function UserDashboardPage() {
  const user = await requireUser();

  const now = new Date();

  const [
    uploadedDocuments,
    pendingDocuments,
    approvedDocuments,
    futureBookings,
    noShowBookings,
  ] = await Promise.all([
    prisma.document.count({
      where: {
        uploaderId: user.id,
      },
    }),

    prisma.document.count({
      where: {
        uploaderId: user.id,
        status: "PENDING",
      },
    }),

    prisma.document.count({
      where: {
        uploaderId: user.id,
        status: "APPROVED",
      },
    }),

    prisma.roomBooking.count({
      where: {
        userId: user.id,
        status: "CONFIRMED",
        startTime: {
          gt: now,
        },
      },
    }),

    prisma.roomBooking.count({
      where: {
        userId: user.id,
        status: "NO_SHOW",
      },
    }),
  ]);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <PageHeader
          title="Tổng quan"
          description="Theo dõi tài liệu và lịch đặt phòng của bạn."
        />

        {/* Thống kê */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <DashboardCard
              title="Tài liệu đã tải"
              value={uploadedDocuments}
              icon={FileText}
              description="Tổng tài liệu bạn đã gửi"
            />

            <DashboardCard
              title="Đang chờ duyệt"
              value={pendingDocuments}
              icon={Clock3}
              description="Tài liệu đang chờ xử lý"
            />

            <DashboardCard
              title="Đã được duyệt"
              value={approvedDocuments}
              icon={FileCheck2}
              description="Tài liệu đã xuất hiện trong thư viện"
            />

            <DashboardCard
              title="Lịch sắp tới"
              value={futureBookings}
              icon={CalendarDays}
              description="Booking đang còn hiệu lực"
            />

            <DashboardCard
              title="No-show"
              value={noShowBookings}
              icon={TriangleAlert}
              description="Số lần không đến sử dụng phòng"
            />
          </div>
        </section>

        {/* Truy cập nhanh */}
        <section>
          <div>
            <h2 className="text-lg font-semibold">
              Truy cập nhanh
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Đi nhanh tới các chức năng thường dùng.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuickLink
              href="/documents"
              title="Thư viện số"
              description="Xem các tài liệu đã được duyệt."
              icon={Library}
            />

            <QuickLink
              href="/documents/upload"
              title="Upload tài liệu"
              description="Gửi tài liệu mới để kiểm duyệt."
              icon={FileUp}
            />

            <QuickLink
              href="/rooms"
              title="Đặt phòng"
              description="Chọn phòng và khung giờ phù hợp."
              icon={BookOpen}
            />

            <QuickLink
              href="/bookings"
              title="Lịch của tôi"
              description="Theo dõi các booking đã tạo."
              icon={CalendarDays}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="wrap-break-word text-sm text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
      </div>

      <p className="mt-4 wrap-break-word text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm sm:p-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition group-hover:bg-black">
        <Icon className="h-5 w-5 text-gray-600 transition group-hover:text-white" />
      </div>

      <h3 className="mt-4 wrap-break-word font-semibold">
        {title}
      </h3>

      <p className="mt-2 wrap-break-word text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}