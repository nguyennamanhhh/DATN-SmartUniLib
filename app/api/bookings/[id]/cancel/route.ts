import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

class BookingCancelConflictError extends Error {}

class BookingRoomNotFoundError extends Error {}

export async function POST(req: Request, { params }: Props) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { message: "ID lịch đặt không hợp lệ" },
        { status: 400 },
      );
    }

    const booking = await prisma.roomBooking.findUnique({
      where: { id },
      select: {
        id: true,
        roomId: true,
        userId: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { message: "Không tìm thấy lịch đặt" },
        { status: 404 },
      );
    }

    if (booking.userId !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(
      async (tx) => {
        const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM users
          WHERE id = ${user.id}
          FOR UPDATE
        `;

        if (!lockedUsers[0]) {
          throw new BookingCancelConflictError();
        }

        const lockedRooms = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM rooms
          WHERE id = ${booking.roomId}
          FOR UPDATE
        `;

        if (!lockedRooms[0]) {
          throw new BookingRoomNotFoundError();
        }

        const transactionNow = new Date();

        const updated = await tx.roomBooking.updateMany({
          where: {
            id,
            userId: user.id,
            roomId: booking.roomId,
            status: "CONFIRMED",
            checkedInAt: null,

            startTime: {
              gt: transactionNow,
            },
          },

          data: {
            status: "CANCELLED_BY_USER",
          },
        });

        if (updated.count !== 1) {
          throw new BookingCancelConflictError();
        }
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    return NextResponse.redirect(new URL("/bookings", req.url));
  } catch (error) {
    if (error instanceof BookingCancelConflictError) {
      return NextResponse.json(
        {
          message:
            "Không thể hủy lịch. Lịch có thể đã bắt đầu, đã check-in hoặc trạng thái vừa thay đổi.",
        },
        { status: 409 },
      );
    }

    if (error instanceof BookingRoomNotFoundError) {
      return NextResponse.json(
        {
          message: "Không tìm thấy phòng của lịch đặt",
        },
        { status: 404 },
      );
    }

    console.error("Cancel booking error:", error);

    return NextResponse.json(
      { message: "Không thể hủy lịch đặt" },
      { status: 500 },
    );
  }
}
