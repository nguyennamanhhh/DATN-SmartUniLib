import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      startTime: "asc",
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">Lịch đặt phòng của tôi</h1>

        <div className="mt-8 space-y-4">
          {bookings.length === 0 ? (
            <div className="rounded-lg border p-6">
              Bạn chưa có lịch đặt phòng nào.
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-lg border p-6"
              >
                <h2 className="text-lg font-semibold">
                  Phòng {booking.room.name}
                </h2>

                <p className="mt-2">
                  Bắt đầu:{" "}
                  {booking.startTime.toLocaleString("vi-VN")}
                </p>

                <p>
                  Kết thúc:{" "}
                  {booking.endTime.toLocaleString("vi-VN")}
                </p>

                <p>Trạng thái: {booking.status}</p>

                {booking.status === "CONFIRMED" && (
                  <form
                    action={`/api/bookings/${booking.id}/cancel`}
                    method="post"
                    className="mt-4"
                  >
                    <button
                      type="submit"
                      className="rounded-md border px-4 py-2"
                    >
                      Hủy lịch
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}