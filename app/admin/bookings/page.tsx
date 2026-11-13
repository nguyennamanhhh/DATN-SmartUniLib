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
    date?: string;
    roomId?: string;
  }>;
};

const allowedStatuses = [
  "CONFIRMED",
  "CANCELLED_BY_USER",
  "NO_SHOW",
] as const;

type BookingStatusFilter =
  | (typeof allowedStatuses)[number]
  | "ALL";

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getTodayVietnam(): string {
  return new Date(Date.now() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function getVietnamDayRange(date: string) {
  const utcMidnight = new Date(`${date}T00:00:00.000Z`);

  const dayStart = new Date(
    utcMidnight.getTime() - VIETNAM_OFFSET_MS,
  );

  const dayEnd = new Date(
    dayStart.getTime() + ONE_DAY_MS,
  );

  return { dayStart, dayEnd };
}

function getBookingsUrl(
  date: string,
  status: BookingStatusFilter,
  roomId: string,
): string {
  const params = new URLSearchParams();

  params.set("date", date);

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (roomId !== "all") {
    params.set("roomId", roomId);
  }

  return `/admin/bookings?${params.toString()}`;
}

export default async function AdminBookingsPage({
  searchParams,
}: Props) {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const params = await searchParams;

  const status: BookingStatusFilter =
    params.status &&
    allowedStatuses.includes(
      params.status as (typeof allowedStatuses)[number],
    )
      ? (params.status as (typeof allowedStatuses)[number])
      : "ALL";

  const todayVietnam = getTodayVietnam();

  const selectedDate =
    params.date === "all"
      ? "all"
      : params.date && isValidDate(params.date)
        ? params.date
        : todayVietnam;

  const dateRange =
    selectedDate === "all"
      ? null
      : getVietnamDayRange(selectedDate);

  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const selectedRoomId =
    params.roomId &&
    rooms.some((room) => room.id === params.roomId)
      ? params.roomId
      : "all";

  const bookings = await prisma.roomBooking.findMany({
    where: {
      ...(status !== "ALL"
        ? {
            status,
          }
        : {}),

      ...(dateRange
        ? {
            startTime: {
              lt: dateRange.dayEnd,
            },

            endTime: {
              gt: dateRange.dayStart,
            },
          }
        : {}),

      ...(selectedRoomId !== "all"
        ? { roomId: selectedRoomId }
        : {}),
    },

    include: {
      room: true,
      user: true,
    },

    orderBy: {
      startTime: "asc",
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

        {/* Chọn ngày xem lịch */}
        <section className="rounded-xl border bg-white p-4 sm:p-5">
          <form
            method="GET"
            action="/admin/bookings"
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-0">
              <label
                htmlFor="booking-date"
                className="mb-2 block text-sm font-medium"
              >
                Chọn ngày xem lịch
              </label>

              <input
                id="booking-date"
                type="date"
                name="date"
                defaultValue={
                  selectedDate === "all"
                    ? todayVietnam
                    : selectedDate
                }
                required
                className="w-full rounded-lg border px-3 py-2 text-sm sm:w-auto"
              />
            </div>

            {/* Lọc theo phòng học */}
            <div className="min-w-0">
              <label
                htmlFor="booking-room"
                className="mb-2 block text-sm font-medium"
              >
                Chọn phòng học
              </label>

              <select
                id="booking-room"
                name="roomId"
                defaultValue={selectedRoomId}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm sm:w-auto"
              >
                <option value="all">Tất cả phòng</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Giữ trạng thái khi chọn ngày khác */}
            {status !== "ALL" && (
              <input
                type="hidden"
                name="status"
                value={status}
              />
            )}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Xem lịch
            </button>

            <Link
              href={getBookingsUrl("all", status, selectedRoomId)}
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              Xem tất cả các ngày
            </Link>

            <Link
              href={getBookingsUrl(todayVietnam, status, selectedRoomId)}
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              Hôm nay
            </Link>
          </form>

          <p className="mt-3 text-sm text-muted-foreground">
            {selectedDate === "all"
              ? "Đang hiển thị lịch đặt của tất cả các ngày."
              : `Đang xem lịch ngày ${formatDateOnly(selectedDate)}.`}
          </p>
        </section>

        {/* Bộ lọc trạng thái */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <FilterLink
            href={getBookingsUrl(selectedDate, "ALL", selectedRoomId)}
            label="Tất cả"
            active={status === "ALL"}
          />

          <FilterLink
            href={getBookingsUrl(selectedDate, "CONFIRMED", selectedRoomId)}
            label="Đã xác nhận"
            active={status === "CONFIRMED"}
          />

          <FilterLink
            href={getBookingsUrl(
              selectedDate,
              "CANCELLED_BY_USER",
              selectedRoomId,
            )}
            label="Đã hủy"
            active={status === "CANCELLED_BY_USER"}
          />

          <FilterLink
            href={getBookingsUrl(selectedDate, "NO_SHOW", selectedRoomId)}
            label="No-show"
            active={status === "NO_SHOW"}
          />
        </div>

        {/* Số lượng booking */}
        <div className="rounded-xl border bg-white px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Số lịch đặt phù hợp:{" "}
            <span className="font-semibold text-foreground">
              {bookings.length}
            </span>
          </p>
        </div>

        {/* Danh sách booking */}
        {bookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Không có lịch đặt phòng"
            description="Không có booking nào phù hợp với ngày, phòng và trạng thái đã chọn."
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

                    {booking.status === "CONFIRMED" && (
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

function formatDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}
