import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: roomId } = await params;

    const body = await req.json();

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime())
    ) {
      return NextResponse.json(
        { message: "Thời gian không hợp lệ" },
        { status: 400 }
      );
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        { message: "Giờ kết thúc phải sau giờ bắt đầu" },
        { status: 400 }
      );
    }

    const durationMs =
      endTime.getTime() - startTime.getTime();

    const durationMinutes =
      durationMs / (1000 * 60);

    if (durationMinutes > 120) {
      return NextResponse.json(
        { message: "Mỗi lượt chỉ được đặt tối đa 2 giờ" },
        { status: 400 }
      );
    }

    if (durationMinutes < 15) {
      return NextResponse.json(
        { message: "Thời gian đặt tối thiểu là 15 phút" },
        { status: 400 }
      );
    }

    if (
      startTime.getMinutes() % 15 !== 0 ||
      endTime.getMinutes() % 15 !== 0
    ) {
      return NextResponse.json(
        {
          message:
            "Giờ bắt đầu và kết thúc phải theo bước 15 phút",
        },
        { status: 400 }
      );
    }

    if (startTime <= new Date()) {
      return NextResponse.json(
        {
          message: "Không thể đặt phòng trong quá khứ",
        },
        { status: 400 }
      );
    }

    const booking = await prisma.$transaction(async (tx) => {
      /*
       * Khóa bản ghi Room.
       *
       * Nếu 2 request cùng lúc cùng muốn đặt A101,
       * request thứ hai phải chờ request thứ nhất hoàn thành.
       */
      const lockedRooms = await tx.$queryRaw<
        Array<{
          id: string;
          isAvailable: number | boolean;
        }>
      >`
        SELECT id, isAvailable
        FROM rooms
        WHERE id = ${roomId}
        FOR UPDATE
      `;

      const room = lockedRooms[0];

      if (!room) {
        throw new Error("ROOM_NOT_FOUND");
      }

      if (!room.isAvailable) {
        throw new Error("ROOM_UNAVAILABLE");
      }

      /*
       * Hai khoảng thời gian bị trùng khi:
       *
       * newStart < existingEnd
       * AND
       * newEnd > existingStart
       */
      const overlapping =
        await tx.roomBooking.findFirst({
          where: {
            roomId,
            status: "CONFIRMED",

            AND: [
              {
                startTime: {
                  lt: endTime,
                },
              },
              {
                endTime: {
                  gt: startTime,
                },
              },
            ],
          },
        });

      if (overlapping) {
        throw new Error("BOOKING_CONFLICT");
      }

      return tx.roomBooking.create({
        data: {
          roomId,
          userId: user.id,
          startTime,
          endTime,
          status: "CONFIRMED",
        },
      });
    });

    return NextResponse.json(
      {
        message: "Đặt phòng thành công",
        booking,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Create booking error:", error);

    if (
      error instanceof Error &&
      error.message === "BOOKING_CONFLICT"
    ) {
      return NextResponse.json(
        {
          message:
            "Khoảng thời gian này đã có người đặt phòng.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "ROOM_NOT_FOUND"
    ) {
      return NextResponse.json(
        { message: "Không tìm thấy phòng" },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "ROOM_UNAVAILABLE"
    ) {
      return NextResponse.json(
        { message: "Phòng hiện không khả dụng" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Không thể đặt phòng",
      },
      { status: 500 }
    );
  }
}