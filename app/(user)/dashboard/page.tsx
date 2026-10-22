import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UserDashboardPage() {
  const user = await requireUser();

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
          gt: new Date(),
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
    <main className="p-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold">
            Tổng quan
          </h1>

          <p className="mt-1 text-muted-foreground">
            Theo dõi tài liệu và lịch đặt phòng của bạn.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardCard
            title="Tài liệu đã tải"
            value={uploadedDocuments}
          />

          <DashboardCard
            title="Đang chờ duyệt"
            value={pendingDocuments}
          />

          <DashboardCard
            title="Đã được duyệt"
            value={approvedDocuments}
          />

          <DashboardCard
            title="Lịch sắp tới"
            value={futureBookings}
          />

          <DashboardCard
            title="No-show"
            value={noShowBookings}
          />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">
            Truy cập nhanh
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickLink
              href="/documents"
              title="Thư viện số"
            />

            <QuickLink
              href="/documents/upload"
              title="Upload tài liệu"
            />

            <QuickLink
              href="/rooms"
              title="Đặt phòng"
            />

            <QuickLink
              href="/bookings"
              title="Lịch của tôi"
            />
          </div>
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

function QuickLink({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-white p-5 transition hover:bg-gray-50"
    >
      <p className="font-medium">
        {title}
      </p>
    </Link>
  );
}