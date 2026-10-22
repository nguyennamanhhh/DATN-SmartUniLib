import Link from "next/link";
import {
  CalendarCheck,
  Clock3,
  DoorOpen,
  Mail,
  User,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AdminBookingActions } from "@/components/admin-booking-actions";
import { ProcessNoShowsButton } from "@/components/process-no-shows-button";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

type Props = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const allowedStatuses = [
  "CONFIRMED",
  "CANCELLED_BY_USER",
  "NO_SHOW",
] as const;

export default async function AdminBookingsPage({
  searchParams,
}: Props) {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const params = await searchParams;

  const status =
    params.status &&
    allowedStatuses.includes(
      params.status as (typeof allowedStatuses)[number],
    )
      ? params.status
      : "ALL";

  const bookings = await prisma.roomBooking.findMany({
    where:
      status === "ALL"
        ? {}
        : {
            status: status as
              | "CONFIRMED"
              | "CANCELLED_BY_USER"
              | "NO_SHOW",
          },

    include: {
      room: true,
      user: true,
    },

    orderBy: {
      startTime: "desc",
    },
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <PageHeader
          title="Quản lý lịch đặt phòng"
          description="Theo dõi lịch đặt, check-in và các trường hợp no-show."
          action={<ProcessNoShowsButton />}
        />

        {/* Bộ lọc */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <FilterLink
            href="/admin/bookings"
            label="Tất cả"
            active={status === "ALL"}
          />

          <FilterLink
            href="/admin/bookings?status=CONFIRMED"
            label="Đã xác nhận"
            active={status === "CONFIRMED"}
          />

          <FilterLink
            href="/admin/bookings?status=CANCELLED_BY_USER"
            label="Đã hủy"
            active={status === "CANCELLED_BY_USER"}
          />

          <FilterLink
            href="/admin/bookings?status=NO_SHOW"
            label="No-show"
            active={status === "NO_SHOW"}
          />
        </div>

        {bookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Không có lịch đặt phòng"
            description="Không có booking nào phù hợp với bộ lọc hiện tại."
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-xl border bg-white p-4 transition hover:shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  {/* Thông tin booking */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <DoorOpen className="h-5 w-5 text-gray-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h2 className="wrap-break-word text-lg font-semibold">
                            Phòng {booking.room.name}
                          </h2>

                          <div className="w-fit shrink-0">
                            <StatusBadge
                              status={booking.status}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <InfoRow
                        icon={User}
                        label="Người đặt"
                        value={
                          booking.user.fullName ||
                          booking.user.email
                        }
                      />

                      <InfoRow
                        icon={Mail}
                        label="Email"
                        value={booking.user.email}
                      />

                      <InfoRow
                        icon={Clock3}
                        label="Bắt đầu"
                        value={formatDateTime(
                          booking.startTime,
                        )}
                      />

                      <InfoRow
                        icon={Clock3}
                        label="Kết thúc"
                        value={formatDateTime(
                          booking.endTime,
                        )}
                      />
                    </div>
                  </div>

                  {/* Check-in */}
                  <div className="w-full rounded-lg border bg-gray-50 p-4 lg:w-72 lg:shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Check-in
                        </p>

                        <p className="mt-1 wrap-break-word text-sm font-medium">
                          {booking.checkedInAt
                            ? formatDateTime(
                                booking.checkedInAt,
                              )
                            : "Chưa check-in"}
                        </p>
                      </div>

                      <Clock3 className="h-4 w-4 shrink-0 text-gray-400" />
                    </div>

                    {booking.status ===
                      "CONFIRMED" && (
                      <div className="mt-4 border-t pt-4">
                        <AdminBookingActions
                          bookingId={booking.id}
                          checkedIn={Boolean(
                            booking.checkedInAt,
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition sm:px-4 ${
        active
          ? "border-black bg-black text-white"
          : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="wrap-break-word">
        {label}
      </span>
    </Link>
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
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 wrap-break-word font-medium">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDateTime(date: Date) {
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}