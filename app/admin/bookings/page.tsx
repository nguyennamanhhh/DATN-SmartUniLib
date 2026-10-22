import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminBookingActions } from "@/components/admin-booking-actions";
import { ProcessNoShowsButton } from "@/components/process-no-shows-button";

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
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Quản lý lịch đặt phòng
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Theo dõi lịch đặt, check-in và các trường hợp
            NO_SHOW.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/bookings"
            className="rounded-md border px-4 py-2"
          >
            Tất cả
          </a>

          <a
            href="/admin/bookings?status=CONFIRMED"
            className="rounded-md border px-4 py-2"
          >
            Đang xác nhận
          </a>

          <a
            href="/admin/bookings?status=CANCELLED_BY_USER"
            className="rounded-md border px-4 py-2"
          >
            Đã hủy
          </a>

          <a
            href="/admin/bookings?status=NO_SHOW"
            className="rounded-md border px-4 py-2"
          >
            No-show
          </a>
        </div>

        <div>
          <ProcessNoShowsButton />
        </div>

        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="rounded-lg border p-6">
              Không có lịch đặt phòng phù hợp.
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-lg border p-6"
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">
                      Phòng {booking.room.name}
                    </h2>

                    <p>
                      <strong>Người đặt:</strong>{" "}
                      {booking.user.fullName ||
                        booking.user.email}
                    </p>

                    <p>
                      <strong>Email:</strong>{" "}
                      {booking.user.email}
                    </p>

                    <p>
                      <strong>Trạng thái:</strong>{" "}
                      {booking.status}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p>
                      <strong>Bắt đầu:</strong>{" "}
                      {booking.startTime.toLocaleString(
                        "vi-VN",
                      )}
                    </p>

                    <p>
                      <strong>Kết thúc:</strong>{" "}
                      {booking.endTime.toLocaleString(
                        "vi-VN",
                      )}
                    </p>

                    <p>
                      <strong>Check-in:</strong>{" "}
                      {booking.checkedInAt
                        ? booking.checkedInAt.toLocaleString(
                            "vi-VN",
                          )
                        : "Chưa check-in"}
                    </p>
                  </div>
                </div>

                {booking.status === "CONFIRMED" && (
                  <AdminBookingActions
                    bookingId={booking.id}
                    checkedIn={Boolean(
                      booking.checkedInAt,
                    )}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}