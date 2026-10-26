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

class UserNotFoundError extends Error {}

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
     * 3. Parse request body
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

    /*
     * endTime phải lớn hơn startTime.
     */
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

    /*
     * 5. Duration
     */
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
     * 6. Validate slot 15 phút.
     *
     * Chấp nhận:
     *
     * 10:00:00
     * 10:15:00
     * 10:30:00
     * 10:45:00
     *
     * Không chấp nhận:
     *
     * 10:17:00
     * 10:15:30
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
     * 7. Không đặt trong quá khứ.
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
     * 8. Chỉ được đặt trước tối đa 2 ngày.
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
     * 9. Xác định ngày của booking
     * theo timezone Việt Nam.
     */
    const startTimeInVietnam = new Date(
      startTime.getTime() + VIETNAM_OFFSET_MS,
    );

    const year = startTimeInVietnam.getUTCFullYear();

    const month = startTimeInVietnam.getUTCMonth();

    const day = startTimeInVietnam.getUTCDate();

    /*
     * 00:00 ngày booking theo giờ Việt Nam
     * quy đổi về UTC.
     */
    const dayStart = new Date(Date.UTC(year, month, day) - VIETNAM_OFFSET_MS);

    /*
     * 00:00 ngày hôm sau theo giờ Việt Nam.
     */
    const dayEnd = new Date(Date.UTC(year, month, day + 1) - VIETNAM_OFFSET_MS);

    /*
     * 10. Transaction
     *
     * Thứ tự lock:
     *
     * User
     *   ↓
     * kiểm tra ban + quota
     *   ↓
     * Room
     *   ↓
     * kiểm tra overlap
     *   ↓
     * CREATE booking
     */
    const booking = await prisma.$transaction(async (tx) => {
      /*
       * 10.1 Lock User
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
        throw new UserNotFoundError();
      }

      const transactionNow = new Date();

      /*
       * 10.2 Kiểm tra ban.
       */
      if (lockedUser.bannedUntil && lockedUser.bannedUntil > transactionNow) {
        throw new UserBannedError(lockedUser.bannedUntil);
      }

      /*
       * 10.3 Giới hạn booking/ngày.
       *
       * Giữ nguyên nghiệp vụ hiện tại:
       * CANCELLED_BY_USER và NO_SHOW vẫn
       * được tính vào giới hạn số lượt/ngày.
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
       * 10.4 Tối đa 2 booking CONFIRMED
       * trong tương lai.
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
       * 10.5 Lock Room
       *
       * API check-in cũng khóa row Room này.
       *
       * Nhờ vậy create booking và early
       * check-in trên cùng một phòng không
       * kiểm tra dữ liệu song song.
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
       * 10.6 Kiểm tra overlap.
       *
       * Đây là phần quan trọng sau khi
       * hệ thống hỗ trợ EARLY CHECK-IN.
       *
       * Thời điểm bắt đầu chiếm phòng thực tế:
       *
       * MIN(startTime, checkedInAt)
       *
       * Nếu chưa check-in:
       * actualStart = startTime
       *
       * Nếu check-in sớm:
       * actualStart = checkedInAt
       *
       *
       * Booking tồn tại gây conflict nếu:
       *
       * existing.endTime > new.startTime
       *
       * VÀ
       *
       * (
       *   existing.startTime < new.endTime
       *   OR
       *   existing.checkedInAt < new.endTime
       * )
       */
      const overlapping = await tx.roomBooking.findFirst({
        where: {
          roomId,

          status: "CONFIRMED",

          /*
           * Booking hiện tại phải chưa kết thúc
           * trước lúc booking mới bắt đầu.
           */
          endTime: {
            gt: startTime,
          },

          /*
           * Một trong hai thời điểm bắt đầu
           * chiếm phòng đã nằm trước endTime
           * của booking mới.
           */
          OR: [
            {
              startTime: {
                lt: endTime,
              },
            },

            /*
             * checkedInAt = null sẽ không match
             * điều kiện < endTime.
             *
             * Nếu early check-in, điều kiện này
             * bắt được phần thời gian phát sinh
             * trước startTime ban đầu.
             */
            {
              checkedInAt: {
                lt: endTime,
              },
            },
          ],
        },

        select: {
          id: true,
          startTime: true,
          endTime: true,
          checkedInAt: true,
        },
      });

      if (overlapping) {
        throw new BookingConflictError();
      }

      /*
       * 10.7 Create booking
       */
      return tx.roomBooking.create({
        data: {
          roomId,
          userId: user.id,

          startTime,
          endTime,

          status: "CONFIRMED",
        },

        /*
         * Chỉ trả những dữ liệu frontend cần.
         */
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

    /*
     * 11. Success
     */
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
     * Booking conflict.
     */
    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        {
          message: "Khoảng thời gian này đã có người sử dụng hoặc đặt phòng.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Room không tồn tại.
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

    /*
     * Room bị disable.
     */
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
     * User không tồn tại trong DB.
     */
    if (error instanceof UserNotFoundError) {
      return NextResponse.json(
        {
          message: "Không tìm thấy người dùng",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * User đang bị ban.
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
     * Quá giới hạn booking/ngày.
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

    /*
     * Quá giới hạn booking tương lai.
     */
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
