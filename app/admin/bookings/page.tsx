import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminBookingActions } from "@/components/admin-booking-actions";
import { ProcessNoShowsButton } from "@/components/process-no-shows-button";
export default async function AdminBookingsPage() {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const bookings = await prisma.roomBooking.findMany({
    where: {
      status: "CONFIRMED",
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
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold">
            Quản lý lịch đặt phòng
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Xác nhận sinh viên đã có mặt và sử dụng phòng.
          </p>
        </div>
        
        <div className="mt-4">
            <ProcessNoShowsButton />
        </div>

        <div className="mt-8 space-y-4">
          {bookings.length === 0 ? (
            <div className="rounded-lg border p-6">
              Không có lịch đặt phòng nào đang được xác nhận.
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-lg border p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
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
                  </div>

                  <div className="space-y-2">
                    <p>
                      <strong>Bắt đầu:</strong>{" "}
                      {booking.startTime.toLocaleString(
                        "vi-VN"
                      )}
                    </p>

                    <p>
                      <strong>Kết thúc:</strong>{" "}
                      {booking.endTime.toLocaleString(
                        "vi-VN"
                      )}
                    </p>

                    <p>
                      <strong>Check-in:</strong>{" "}
                      {booking.checkedInAt
                        ? booking.checkedInAt.toLocaleString(
                            "vi-VN"
                          )
                        : "Chưa check-in"}
                    </p>
                  </div>
                </div>

                <AdminBookingActions
                  bookingId={booking.id}
                  checkedIn={Boolean(booking.checkedInAt)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}