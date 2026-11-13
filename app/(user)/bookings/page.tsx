
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DoorOpen,
  Info,
  Users,
  XCircle,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { CancelBookingButton } from "@/components/cancel-booking-button";

const TIME_ZONE = "Asia/Ho_Chi_Minh";

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  });
}

export default async function MyBookingsPage() {
  const user = await requireUser();

  const bookings = await prisma.roomBooking.findMany({
    where: {
      userId: user.id,
    },
    include: {
      room: true,
    },
    orderBy: {
      startTime: "desc",
    },
  });

  const totalBookings = bookings.length;

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  ).length;

  const checkedInBookings = bookings.filter(
    (booking) => booking.checkedInAt !== null,
  ).length;

  const noShowBookings = bookings.filter(
    (booking) => booking.status === "NO_SHOW",
  ).length;

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED_BY_USER",
  ).length;

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Đường dẫn trang"
          className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
        >
          <Link
            href="/dashboard"
            className="transition hover:text-blue-700"
          >
            Trang chủ
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="font-medium text-slate-700">
            Lịch đặt phòng của tôi
          </span>
        </nav>

        {/* Tiêu đề */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <BookOpen className="h-4 w-4" />
            QUẢN LÝ LỊCH HỌC TẬP
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Lịch đặt phòng của tôi
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Theo dõi lịch sử đặt phòng, trạng thái
                xác nhận và thời gian check-in.
              </p>
            </div>

            <Link
              href="/rooms"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1254A5] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
            >
              <DoorOpen className="h-4 w-4" />
              Đặt phòng mới
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Thống kê */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            title="Tổng lịch đặt"
            value={totalBookings}
            description="Tất cả lịch của bạn"
          />

          <StatCard
            icon={CalendarCheck2}
            title="Đã xác nhận"
            value={confirmedBookings}
            description="Lịch có trạng thái CONFIRMED"
          />

          <StatCard
            icon={CheckCircle2}
            title="Đã check-in"
            value={checkedInBookings}
            description="Lịch đã ghi nhận check-in"
          />

          <StatCard
            icon={AlertTriangle}
            title="No-show"
            value={noShowBookings}
            description="Lịch bị ghi nhận vắng mặt"
          />
        </section>

        {/* Hướng dẫn */}
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-blue-900">
                Lưu ý khi sử dụng phòng
              </h2>

              <p className="mt-2 text-sm leading-6 text-blue-800">
                Hãy đến đúng giờ và thực hiện check-in
                theo quy trình của thư viện. Nếu quá
                15 phút mà chưa check-in, lịch đặt có
                thể bị xử lý NO_SHOW theo chính sách
                hiện hành.
              </p>
            </div>
          </div>
        </section>

        {/* Danh sách */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Danh sách lịch đặt
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Có {totalBookings} lịch đặt được ghi nhận
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <CalendarDays className="h-8 w-8 text-blue-700" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Bạn chưa có lịch đặt phòng
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Hãy chọn một phòng học và thời gian
                phù hợp để bắt đầu đặt lịch.
              </p>

              <Link
                href="/rooms"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1254A5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <DoorOpen className="h-4 w-4" />
                Khám phá phòng học
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <article
                  key={booking.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="h-1 bg-[#1254A5]" />

                  <div className="p-5 sm:p-6">
                    {/* Tên phòng và trạng thái */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <DoorOpen className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-bold text-slate-900">
                            Phòng {booking.room.name}
                          </h3>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <Users className="h-4 w-4" />
                            <span>
                              Sức chứa: {booking.room.capacity} người
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={booking.status} />
                      </div>
                    </div>

                    {/* Ngày và giờ */}
                    <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                      <InfoRow
                        icon={CalendarDays}
                        label="Ngày sử dụng"
                        value={formatDate(booking.startTime)}
                      />

                      <InfoRow
                        icon={Clock3}
                        label="Khung giờ"
                        value={`${formatTime(
                          booking.startTime,
                        )} - ${formatTime(
                          booking.endTime,
                        )}`}
                      />
                    </div>

                    {/* Thông tin check-in */}
                    {booking.checkedInAt && (
                      <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                        <div>
                          <p className="text-sm font-bold text-emerald-800">
                            Đã check-in
                          </p>

                          <p className="mt-1 text-sm text-emerald-700">
                            {formatDateTime(
                              booking.checkedInAt,
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Hủy lịch: giữ nguyên endpoint cũ */}
                {booking.status === "CONFIRMED" &&
                  booking.checkedInAt === null &&
                  booking.startTime > new Date() && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-500">
                        Bạn có thể hủy lịch trước khi bắt đầu sử dụng
                        phòng, nếu chưa check-in.
                      </p>
                      <CancelBookingButton
                        bookingId={booking.id}
                        roomName={booking.room.name}
                      />
                    </div>
                  )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}
