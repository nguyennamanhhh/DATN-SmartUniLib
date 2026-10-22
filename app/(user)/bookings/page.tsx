import {
  CalendarDays,
  Clock3,
  DoorOpen,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

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

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        <PageHeader
          title="Lịch đặt phòng của tôi"
          description="Theo dõi các lịch đặt phòng và trạng thái sử dụng."
        />

        {bookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Chưa có lịch đặt phòng"
            description="Các lịch bạn đặt sẽ xuất hiện tại đây."
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-xl border bg-white p-4 transition hover:shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  {/* Thông tin booking */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <DoorOpen className="h-5 w-5 text-gray-700" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h2 className="wrap-break-word text-lg font-semibold">
                            Phòng {booking.room.name}
                          </h2>

                          <div className="shrink-0">
                            <StatusBadge
                              status={booking.status}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Thời gian */}
                    <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <InfoRow
                        icon={CalendarDays}
                        label="Ngày sử dụng"
                        value={booking.startTime.toLocaleDateString(
                          "vi-VN",
                        )}
                      />

                      <InfoRow
                        icon={Clock3}
                        label="Khung giờ"
                        value={`${booking.startTime.toLocaleTimeString(
                          "vi-VN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )} - ${booking.endTime.toLocaleTimeString(
                          "vi-VN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}`}
                      />
                    </div>

                    {/* Check-in */}
                    {booking.checkedInAt && (
                      <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm">
                        <p className="text-xs font-medium text-green-700">
                          Đã check-in
                        </p>

                        <p className="mt-1 text-green-800">
                          {booking.checkedInAt.toLocaleString(
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
                    )}
                  </div>

                  {/* Hủy */}
                  {booking.status === "CONFIRMED" && (
                    <form
                      action={`/api/bookings/${booking.id}/cancel`}
                      method="post"
                      className="w-full sm:w-auto"
                    >
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 sm:w-auto"
                      >
                        Hủy lịch
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
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