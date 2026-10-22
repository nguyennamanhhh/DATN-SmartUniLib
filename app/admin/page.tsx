import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <main className="p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Dashboard quản trị
          </h1>

          <p className="mt-1 text-muted-foreground">
            Tổng quan hoạt động của hệ thống SmartUniLib.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Tổng người dùng"
            value={totalUsers}
          />

          <DashboardCard
            title="Tổng tài liệu"
            value={totalDocuments}
          />

          <DashboardCard
            title="Tài liệu chờ duyệt"
            value={pendingDocumentsCount}
          />

          <DashboardCard
            title="Khiếu nại chờ xử lý"
            value={pendingComplaintsCount}
          />

          <DashboardCard
            title="Tổng booking"
            value={totalBookings}
          />

          <DashboardCard
            title="Booking confirmed"
            value={confirmedBookings}
          />

          <DashboardCard
            title="No-show"
            value={noShowBookings}
          />

          <DashboardCard
            title="User đang bị khóa"
            value={bannedUsers}
          />
        </div>

        {/* Pending documents */}
        <section className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="text-lg font-semibold">
                Tài liệu chờ duyệt
              </h2>

              <p className="text-sm text-muted-foreground">
                Những tài liệu mới nhất đang chờ xử lý.
              </p>
            </div>

            <Link
              href="/admin/documents"
              className="text-sm underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="divide-y">
            {recentPendingDocuments.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Không có tài liệu nào đang chờ duyệt.
              </p>
            ) : (
              recentPendingDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-medium">
                      {document.title}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {document.subjectCode} -{" "}
                      {document.subjectName}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Người tải:{" "}
                      {document.uploader.fullName ||
                        document.uploader.email}
                    </p>
                  </div>

                  <Link
                    href={`/admin/documents/${document.id}`}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    Xem
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Complaints */}
          <section className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Khiếu nại gần đây
                </h2>

                <p className="text-sm text-muted-foreground">
                  Các khiếu nại đang chờ xử lý.
                </p>
              </div>

              <Link
                href="/admin/complaints"
                className="text-sm underline"
              >
                Xem tất cả
              </Link>
            </div>

            <div className="divide-y">
              {recentComplaints.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  Không có khiếu nại đang chờ xử lý.
                </p>
              ) : (
                recentComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {complaint.document.title}
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {complaint.reason}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Người gửi:{" "}
                          {complaint.complainant?.fullName ||
                            complaint.complainantName ||
                            complaint.complainantEmail ||
                            "Không xác định"}
                        </p>
                      </div>

                      <Link
                        href={`/admin/complaints/${complaint.id}`}
                        className="rounded-md border px-3 py-2 text-sm"
                      >
                        Xem
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Bookings */}
          <section className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Booking gần đây
                </h2>

                <p className="text-sm text-muted-foreground">
                  Các lượt đặt phòng mới nhất.
                </p>
              </div>

              <Link
                href="/admin/bookings"
                className="text-sm underline"
              >
                Xem tất cả
              </Link>
            </div>

            <div className="divide-y">
              {recentBookings.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  Chưa có booking nào.
                </p>
              ) : (
                recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          Phòng {booking.room.name}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {booking.user.fullName ||
                            booking.user.email}
                        </p>

                        <p className="mt-1 text-sm">
                          {booking.startTime.toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>

                      <span className="rounded-md bg-gray-100 px-2 py-1 text-xs">
                        {booking.status}
                      </span>
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
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}