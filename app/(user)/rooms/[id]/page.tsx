import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoomBookingForm } from "@/components/room-booking-form";
import Link from "next/link";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RoomDetailPage({ params }: Props) {
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
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/rooms"
            className="text-sm underline"
          >
            ← Quay lại danh sách phòng
          </Link>
          <h1 className="mt-4 text-2xl font-bold">
            Phòng {room.name}
          </h1>

          <p className="mt-2 text-muted-foreground">
            Sức chứa: {room.capacity} người
          </p>
        </div>

        <RoomBookingForm
          roomId={room.id}
          roomName={room.name}
        />
      </div>
    </main>
  );
}