import Link from "next/link";
import { DoorOpen, Users } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

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
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <PageHeader
          title="Đặt phòng học"
          description="Chọn phòng phù hợp với nhu cầu học tập của bạn."
        />

        {rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Chưa có phòng khả dụng"
            description="Hiện tại chưa có phòng nào có thể đặt."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
              <article
                key={room.id}
                className="group flex min-w-0 flex-col rounded-xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <DoorOpen className="h-6 w-6 text-gray-700" />
                  </div>

                  <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    Khả dụng
                  </span>
                </div>

                <div className="mt-5 min-w-0 flex-1">
                  <h2 className="wrap-break-word text-xl font-semibold">
                    Phòng {room.name}
                  </h2>

                  <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <Users className="mt-0.5 h-4 w-4 shrink-0" />

                    <span className="wrap-break-word">
                      Sức chứa: {room.capacity} người
                    </span>
                  </div>
                </div>

                <Link
                  href={`/rooms/${room.id}`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Xem và đặt phòng
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}