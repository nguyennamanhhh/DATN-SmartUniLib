import Link from "next/link";
import {
  BookOpenCheck,
  CalendarCheck,
  FileClock,
  Files,
  MessageSquareWarning,
  ShieldAlert,
  TriangleAlert,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const now = new Date();

  const [
    totalUsers,
    totalDocuments,
    pendingDocumentsCount,
    pendingComplaintsCount,
    totalBookings,
    confirmedBookings,
    noShowBookings,
    bannedUsers,
    recentPendingDocuments,
    recentComplaints,
    recentBookings,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.document.count(),

    prisma.document.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.documentComplaint.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.roomBooking.count(),

    prisma.roomBooking.count({
      where: {
        status: "CONFIRMED",
      },
    }),

    prisma.roomBooking.count({
      where: {
        status: "NO_SHOW",
      },
    }),

    prisma.user.count({
      where: {
        bannedUntil: {
          gt: now,
        },
      },
    }),

    prisma.document.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        uploader: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),

    prisma.documentComplaint.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        document: true,
        complainant: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),

    prisma.roomBooking.findMany({
      include: {
        room: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <PageHeader
          title="Dashboard quản trị"
          description="Theo dõi tình trạng thư viện số, booking và các tác vụ cần xử lý."
        />

        {/* Tổng quan */}
        <section>
          <h2 className="text-lg font-semibold">
            Tổng quan hệ thống
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Tổng người dùng"
              value={totalUsers}
              icon={Users}
              description="Tổng số tài khoản trong hệ thống"
            />

            <DashboardCard
              title="Tổng tài liệu"
              value={totalDocuments}
              icon={Files}
              description="Tất cả tài liệu đã được tải lên"
            />

            <DashboardCard
              title="Tổng booking"
              value={totalBookings}
              icon={CalendarCheck}
              description="Tổng lượt đặt phòng đã tạo"
            />

            <DashboardCard
              title="User đang bị khóa"
              value={bannedUsers}
              icon={ShieldAlert}
              description="Người dùng đang bị hạn chế đặt phòng"
            />
          </div>
        </section>

        {/* Cần xử lý */}
        <section>
          <h2 className="text-lg font-semibold">
            Cần xử lý
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Tài liệu chờ duyệt"
              value={pendingDocumentsCount}
              icon={FileClock}
              description="Tài liệu đang chờ kiểm duyệt"
            />

            <DashboardCard
              title="Khiếu nại chờ xử lý"
              value={pendingComplaintsCount}
              icon={MessageSquareWarning}
              description="Khiếu nại bản quyền chưa xử lý"
            />

            <DashboardCard
              title="Booking confirmed"
              value={confirmedBookings}
              icon={BookOpenCheck}
              description="Booking đang còn hiệu lực"
            />

            <DashboardCard
              title="No-show"
              value={noShowBookings}
              icon={TriangleAlert}
              description="Các trường hợp không check-in"
            />
          </div>
        </section>

        {/* Tài liệu chờ duyệt */}
        <section className="overflow-hidden rounded-xl border bg-white">
          <SectionHeader
            title="Tài liệu chờ duyệt"
            description="Các tài liệu mới nhất cần được kiểm tra."
            href="/admin/documents"
          />

          <div className="divide-y">
            {recentPendingDocuments.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground sm:p-5">
                Không có tài liệu nào đang chờ duyệt.
              </p>
            ) : (
              recentPendingDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="wrap-break-word font-medium">
                        {document.title}
                      </p>

                      <StatusBadge
                        status={document.status}
                      />
                    </div>

                    <p className="mt-1 wrap-break-word text-sm text-muted-foreground">
                      {document.subjectCode} -{" "}
                      {document.subjectName}
                    </p>

                    <p className="mt-1 wrap-break-word text-xs text-muted-foreground">
                      Người tải:{" "}
                      {document.uploader.fullName ||
                        document.uploader.email}
                    </p>
                  </div>

                  <Link
                    href={`/admin/documents/${document.id}`}
                    className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-gray-50 md:w-auto"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Khiếu nại + Booking */}
        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          {/* Khiếu nại */}
          <section className="overflow-hidden rounded-xl border bg-white">
            <SectionHeader
              title="Khiếu nại gần đây"
              description="Các khiếu nại đang chờ xác minh."
              href="/admin/complaints"
            />

            <div className="divide-y">
              {recentComplaints.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground sm:p-5">
                  Không có khiếu nại đang chờ xử lý.
                </p>
              ) : (
                recentComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="wrap-break-word font-medium">
                            {complaint.document.title}
                          </p>

                          <StatusBadge
                            status={complaint.status}
                          />
                        </div>

                        <p className="mt-2 line-clamp-2 wrap-break-word text-sm text-muted-foreground">
                          {complaint.reason}
                        </p>

                        <p className="mt-2 wrap-break-word text-xs text-muted-foreground">
                          Người gửi:{" "}
                          {complaint.complainant?.fullName ||
                            complaint.complainantName ||
                            complaint.complainantEmail ||
                            "Không xác định"}
                        </p>
                      </div>

                      <Link
                        href={`/admin/complaints/${complaint.id}`}
                        className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-gray-50 sm:w-auto"
                      >
                        Xem
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Booking */}
          <section className="overflow-hidden rounded-xl border bg-white">
            <SectionHeader
              title="Booking gần đây"
              description="Các lượt đặt phòng mới nhất."
              href="/admin/bookings"
            />

            <div className="divide-y">
              {recentBookings.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground sm:p-5">
                  Chưa có booking nào.
                </p>
              ) : (
                recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="wrap-break-word font-medium">
                          Phòng {booking.room.name}
                        </p>

                        <p className="mt-1 wrap-break-word text-sm text-muted-foreground">
                          {booking.user.fullName ||
                            booking.user.email}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {booking.startTime.toLocaleString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>

                      <div className="w-fit shrink-0">
                        <StatusBadge
                          status={booking.status}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
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

function SectionHeader({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <h2 className="wrap-break-word text-lg font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <Link
        href={href}
        className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-gray-50 sm:w-auto"
      >
        Xem tất cả
      </Link>
    </div>
  );
}