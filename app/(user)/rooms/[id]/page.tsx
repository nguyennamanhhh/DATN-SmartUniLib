import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  DoorOpen,
  Users,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoomBookingForm } from "@/components/room-booking-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RoomDetailPage({
  params,
}: Props) {
  await requireUser();

  const { id } = await params;

  const room = await prisma.room.findUnique({
    where: {
      id,
    },
  });

  if (!room || !room.isAvailable) {
    notFound();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        {/* Back */}
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-black"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Quay lại danh sách phòng
        </Link>

        {/* Thông tin phòng */}
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <DoorOpen className="h-7 w-7 text-gray-700" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="wrap-break-word text-2xl font-bold">
                    Phòng {room.name}
                  </h1>

                  <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <Users className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>
                      Sức chứa: {room.capacity} người
                    </span>
                  </div>
                </div>

                <span className="w-fit shrink-0 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  Khả dụng
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Chọn ngày và khung giờ phù hợp để đặt phòng học.
              </p>
            </div>
          </div>
        </section>

        {/* Form đặt phòng */}
        <RoomBookingForm
          roomId={room.id}
          roomName={room.name}
        />
      </div>
    </main>
  );
}