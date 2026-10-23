import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_BOOKING_MINUTES = 120;
const MIN_BOOKING_MINUTES = 15;
const SLOT_MINUTES = 15;
const MAX_ADVANCE_DAYS = 2;
const MAX_BOOKINGS_PER_DAY = 2;
const MAX_FUTURE_BOOKINGS = 2;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

class BookingConflictError extends Error {}
class RoomNotFoundError extends Error {}
class RoomUnavailableError extends Error {}
class UserBannedError extends Error {
  constructor(public readonly bannedUntil: Date) {
    super("USER_BANNED");
  }
}
class DailyBookingLimitError extends Error {}
class FutureBookingLimitError extends Error {}

export async function POST(req: Request, { params }: Props) {
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
     * 2. Room ID
     */
    const { id: roomId } = await params;

    if (!roomId?.trim()) {
      return NextResponse.json(
        {
          message: "ID phòng không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 3. Parse body
     */
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          message: "Dữ liệu gửi lên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          message: "Dữ liệu gửi lên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const { startTime: rawStartTime, endTime: rawEndTime } = body as {
      startTime?: unknown;
      endTime?: unknown;
    };

    if (typeof rawStartTime !== "string" || typeof rawEndTime !== "string") {
      return NextResponse.json(
        {
          message: "Thời gian bắt đầu và kết thúc không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const startTime = new Date(rawStartTime);
    const endTime = new Date(rawEndTime);

    /*
     * 4. Validate Date
     */
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return NextResponse.json(
        {
          message: "Thời gian không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        {
          message: "Giờ kết thúc phải sau giờ bắt đầu",
        },
        {
          status: 400,
        },
      );
    }

    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    if (durationMinutes > MAX_BOOKING_MINUTES) {
      return NextResponse.json(
        {
          message: "Mỗi lượt chỉ được đặt tối đa 2 giờ",
        },
        {
          status: 400,
        },
      );
    }

    if (durationMinutes < MIN_BOOKING_MINUTES) {
      return NextResponse.json(
        {
          message: "Thời gian đặt tối thiểu là 15 phút",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Chỉ chấp nhận đúng các mốc:
     * 10:00, 10:15, 10:30, 10:45...
     *
     * Không cho lọt 10:15:30.
     */
    const validStartSlot =
      startTime.getUTCMinutes() % SLOT_MINUTES === 0 &&
      startTime.getUTCSeconds() === 0 &&
      startTime.getUTCMilliseconds() === 0;

    const validEndSlot =
      endTime.getUTCMinutes() % SLOT_MINUTES === 0 &&
      endTime.getUTCSeconds() === 0 &&
      endTime.getUTCMilliseconds() === 0;

    if (!validStartSlot || !validEndSlot) {
      return NextResponse.json(
        {
          message: "Giờ bắt đầu và kết thúc phải theo bước 15 phút",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 5. Không cho đặt quá khứ
     */
    const now = new Date();

    if (startTime <= now) {
      return NextResponse.json(
        {
          message: "Không thể đặt phòng trong quá khứ",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 6. Chỉ đặt trước tối đa 2 ngày
     */
    const maxBookingDate = new Date(
      now.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000,
    );

    if (startTime > maxBookingDate) {
      return NextResponse.json(
        {
          message: "Bạn chỉ được phép đặt phòng trước tối đa 2 ngày.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 7. Xác định ngày theo giờ Việt Nam
     */
    const startTimeInVietnam = new Date(
      startTime.getTime() + VIETNAM_OFFSET_MS,
    );

    const year = startTimeInVietnam.getUTCFullYear();

    const month = startTimeInVietnam.getUTCMonth();

    const day = startTimeInVietnam.getUTCDate();

    const dayStart = new Date(Date.UTC(year, month, day) - VIETNAM_OFFSET_MS);

    const dayEnd = new Date(Date.UTC(year, month, day + 1) - VIETNAM_OFFSET_MS);

    /*
     * 8. Transaction
     *
     * Khóa cả User và Room.
     *
     * User lock:
     * - chống vượt giới hạn booking/ngày
     * - chống vượt giới hạn booking tương lai
     * - kiểm tra ban một cách nhất quán
     *
     * Room lock:
     * - chống double-booking cùng phòng
     */
    const booking = await prisma.$transaction(async (tx) => {
      /*
       * Khóa user trước.
       *
       * Hai request đồng thời của cùng một
       * Student sẽ phải chạy lần lượt.
       */
      const lockedUsers = await tx.$queryRaw<
        Array<{
          id: string;
          bannedUntil: Date | null;
        }>
      >`
              SELECT id, bannedUntil
              FROM users
              WHERE id = ${user.id}
              FOR UPDATE
            `;

      const lockedUser = lockedUsers[0];

      if (!lockedUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const transactionNow = new Date();

      if (lockedUser.bannedUntil && lockedUser.bannedUntil > transactionNow) {
        throw new UserBannedError(lockedUser.bannedUntil);
      }

      /*
       * Kiểm tra giới hạn booking trong ngày
       * SAU KHI đã khóa user.
       */
      const bookingsOnSameDay = await tx.roomBooking.count({
        where: {
          userId: user.id,

          startTime: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });

      if (bookingsOnSameDay >= MAX_BOOKINGS_PER_DAY) {
        throw new DailyBookingLimitError();
      }

      /*
       * Kiểm tra số booking tương lai.
       */
      const futureBookingCount = await tx.roomBooking.count({
        where: {
          userId: user.id,
          status: "CONFIRMED",

          startTime: {
            gt: transactionNow,
          },
        },
      });

      if (futureBookingCount >= MAX_FUTURE_BOOKINGS) {
        throw new FutureBookingLimitError();
      }

      /*
       * Khóa phòng.
       *
       * Tất cả request đặt cùng một phòng
       * sẽ được serialize tại đây.
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
        throw new RoomNotFoundError();
      }

      if (!room.isAvailable) {
        throw new RoomUnavailableError();
      }

      /*
       * Hai khoảng thời gian trùng nhau khi:
       *
       * newStart < existingEnd
       * AND
       * newEnd > existingStart
       */
      const overlapping = await tx.roomBooking.findFirst({
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

        select: {
          id: true,
        },
      });

      if (overlapping) {
        throw new BookingConflictError();
      }

      /*
       * Tạo booking
       */
      return tx.roomBooking.create({
        data: {
          roomId,
          userId: user.id,
          startTime,
          endTime,
          status: "CONFIRMED",
        },

        select: {
          id: true,
          roomId: true,
          userId: true,
          startTime: true,
          endTime: true,
          status: true,
          createdAt: true,
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
      },
    );
  } catch (error) {
    /*
     * Double-booking
     */
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        {
          message: "Khoảng thời gian này đã có người đặt phòng.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Room
     */
    if (error instanceof RoomNotFoundError) {
      return NextResponse.json(
        {
          message: "Không tìm thấy phòng",
        },
        {
          status: 404,
        },
      );
    }

    if (error instanceof RoomUnavailableError) {
      return NextResponse.json(
        {
          message: "Phòng hiện không khả dụng",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * User ban
     */
    if (error instanceof UserBannedError) {
      return NextResponse.json(
        {
          message: `Bạn đang bị tạm khóa quyền đặt phòng đến ${error.bannedUntil.toLocaleString(
            "vi-VN",
            {
              timeZone: "Asia/Ho_Chi_Minh",
            },
          )}.`,
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Booking limits
     */
    if (error instanceof DailyBookingLimitError) {
      return NextResponse.json(
        {
          message:
            "Bạn chỉ được phép đặt tối đa 2 lượt phòng trong cùng một ngày.",
        },
        {
          status: 409,
        },
      );
    }

    if (error instanceof FutureBookingLimitError) {
      return NextResponse.json(
        {
          message:
            "Bạn chỉ được phép có tối đa 2 lịch đặt phòng trong tương lai.",
        },
        {
          status: 409,
        },
      );
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          message: "Không tìm thấy người dùng",
        },
        {
          status: 404,
        },
      );
    }

    console.error("Create booking error:", error);

    return NextResponse.json(
      {
        message: "Không thể đặt phòng",
      },
      {
        status: 500,
      },
    );
  }
}
