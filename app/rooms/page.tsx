import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RoomsPage() {
  await requireUser();

  const rooms = await prisma.room.findMany({
    where: {
      isAvailable: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold">
            Đặt phòng học
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Chọn phòng bạn muốn sử dụng.
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="mt-8 rounded-lg border p-6">
            Chưa có phòng nào khả dụng.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="rounded-lg border p-6"
              >
                <h2 className="text-xl font-semibold">
                  {room.name}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Sức chứa: {room.capacity} người
                </p>

                <a
                  href={`/rooms/${room.id}`}
                  className="mt-5 inline-block rounded-md bg-black px-4 py-2 text-sm text-white"
                >
                  Xem và đặt phòng
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}