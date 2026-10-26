import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const CHECK_IN_GRACE_MINUTES = 15;

class BookingCheckInConflictError extends Error {}

class EarlyCheckInBlockedError extends Error {}

class RoomUnavailableError extends Error {}

export async function POST(_req: Request, { params }: Props) {
  try {
    /*
     * 1. Authentication
     */
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * 2. Authorization
     */
    if (user.role !== "ADMIN" && user.role !== "LIBRARIAN") {
      return NextResponse.json(
        {
          message: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * 3. Params
     */
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          message: "ID lịch đặt không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 4. Tìm booking ban đầu
     */
    const booking = await prisma.roomBooking.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        roomId: true,
        userId: true,
        status: true,
        checkedInAt: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          message: "Không tìm thấy lịch đặt",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * 5. Kiểm tra trạng thái ban đầu
     */
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          message: "Lịch đặt này không còn ở trạng thái CONFIRMED",
        },
        {
          status: 409,
        },
      );
    }

    if (booking.checkedInAt) {
      return NextResponse.json(
        {
          message: "Lịch đặt này đã được check-in",
        },
        {
          status: 409,
        },
      );
    }

    const now = new Date();

    /*
     * Deadline:
     *
     * startTime + 15 phút.
     */
    const checkInDeadline = new Date(
      booking.startTime.getTime() + CHECK_IN_GRACE_MINUTES * 60 * 1000,
    );

    if (now > checkInDeadline) {
      return NextResponse.json(
        {
          message:
            "Đã quá 15 phút kể từ giờ bắt đầu. Lịch này không thể check-in.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 6. Transaction
     *
     * Khóa Room để đồng bộ với API tạo booking.
     */
    const result = await prisma.$transaction(async (tx) => {
      /*
       * Khóa Room.
       *
       * API tạo booking cũng khóa chính row Room này,
       * nên create booking và early check-in không
       * kiểm tra trạng thái phòng cùng lúc.
       */
      const lockedRooms = await tx.$queryRaw<
        Array<{
          id: string;
          isAvailable: boolean | number;
        }>
      >`
              SELECT id, isAvailable
              FROM rooms
              WHERE id = ${booking.roomId}
              FOR UPDATE
            `;

      const room = lockedRooms[0];

      if (!room) {
        throw new RoomUnavailableError();
      }

      if (!room.isAvailable) {
        throw new RoomUnavailableError();
      }

      /*
       * Đọc lại booking sau khi đã vào transaction.
       *
       * Booking có thể vừa:
       * - bị cancel
       * - được check-in
       * - chuyển NO_SHOW
       */
      const currentBooking = await tx.roomBooking.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          roomId: true,
          status: true,
          checkedInAt: true,
          startTime: true,
          endTime: true,
        },
      });

      if (
        !currentBooking ||
        currentBooking.status !== "CONFIRMED" ||
        currentBooking.checkedInAt
      ) {
        throw new BookingCheckInConflictError();
      }

      const transactionNow = new Date();

      /*
       * Kiểm tra lại deadline trong transaction.
       */
      const transactionDeadline = new Date(
        currentBooking.startTime.getTime() + CHECK_IN_GRACE_MINUTES * 60 * 1000,
      );

      if (transactionNow > transactionDeadline) {
        throw new BookingCheckInConflictError();
      }

      /*
       * 7. EARLY CHECK-IN
       *
       * Nếu chưa tới giờ bắt đầu thì phải kiểm tra
       * từ hiện tại → startTime có booking nào khác
       * đang/chuẩn bị chiếm phòng hay không.
       */
      const isEarlyCheckIn = transactionNow < currentBooking.startTime;

      if (isEarlyCheckIn) {
        const blockingBooking = await tx.roomBooking.findFirst({
          where: {
            id: {
              not: currentBooking.id,
            },

            roomId: currentBooking.roomId,

            status: "CONFIRMED",

            /*
             * Booking khác bắt đầu trước
             * booking hiện tại.
             */
            startTime: {
              lt: currentBooking.startTime,
            },

            /*
             * Nhưng chưa kết thúc tại thời điểm
             * muốn early check-in.
             */
            endTime: {
              gt: transactionNow,
            },
          },

          select: {
            id: true,
            startTime: true,
            endTime: true,
          },

          orderBy: {
            startTime: "asc",
          },
        });

        if (blockingBooking) {
          throw new EarlyCheckInBlockedError();
        }
      }

      /*
       * 8. Atomic check-in
       *
       * Kiểm tra lại điều kiện ngay tại UPDATE.
       */
      const updated = await tx.roomBooking.updateMany({
        where: {
          id: currentBooking.id,
          status: "CONFIRMED",
          checkedInAt: null,
        },

        data: {
          checkedInAt: transactionNow,
        },
      });

      if (updated.count !== 1) {
        throw new BookingCheckInConflictError();
      }

      return {
        id: currentBooking.id,

        status: "CONFIRMED" as const,

        checkedInAt: transactionNow,

        earlyCheckIn: isEarlyCheckIn,
      };
    });

    /*
     * 9. Response
     */
    return NextResponse.json({
      message: result.earlyCheckIn
        ? "Check-in sớm thành công vì phòng đang trống"
        : "Check-in thành công",

      booking: result,
    });
  } catch (error) {
    /*
     * Early check-in bị chặn.
     */
    if (error instanceof EarlyCheckInBlockedError) {
      return NextResponse.json(
        {
          message:
            "Không thể check-in sớm vì phòng đang có lịch đặt khác trước giờ bắt đầu của bạn.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Booking vừa thay đổi.
     */
    if (error instanceof BookingCheckInConflictError) {
      return NextResponse.json(
        {
          message:
            "Lịch đặt vừa được check-in, bị hủy, chuyển NO_SHOW hoặc trạng thái đã thay đổi.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Room unavailable.
     */
    if (error instanceof RoomUnavailableError) {
      return NextResponse.json(
        {
          message: "Phòng hiện không khả dụng để check-in.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Check-in error:", error);

    return NextResponse.json(
      {
        message: "Không thể check-in",
      },
      {
        status: 500,
      },
    );
  }
}
