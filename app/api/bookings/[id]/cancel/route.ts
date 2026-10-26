import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

class BookingCancelConflictError extends Error {}

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
     * 2. Validate booking ID
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
     * 3. Tìm booking
     */
    const booking = await prisma.roomBooking.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        userId: true,
        status: true,
        startTime: true,
        checkedInAt: true,
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
     * 4. Ownership
     *
     * Student chỉ được phép hủy booking của chính mình.
     */
    if (booking.userId !== user.id) {
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
     * 5. Kiểm tra trạng thái
     */
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          message: "Lịch này không thể hủy vì không còn ở trạng thái CONFIRMED",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Booking đã check-in thì không được hủy.
     *
     * Điều này đặc biệt cần thiết nếu hệ thống
     * cho phép check-in trước giờ bắt đầu.
     */
    if (booking.checkedInAt) {
      return NextResponse.json(
        {
          message: "Không thể hủy lịch đã check-in",
        },
        {
          status: 409,
        },
      );
    }

    const now = new Date();

    /*
     * Không cho hủy khi booking đã bắt đầu.
     */
    if (booking.startTime <= now) {
      return NextResponse.json(
        {
          message: "Không thể hủy lịch đã bắt đầu hoặc đã qua.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 6. Atomic cancellation
     *
     * Không dùng update({ id }) đơn thuần.
     *
     * Các điều kiện được kiểm tra lại ngay tại DB để
     * chống race condition giữa:
     *
     * - cancel vs cancel
     * - cancel vs check-in
     * - cancel vs process no-show
     */
    const updated = await prisma.roomBooking.updateMany({
      where: {
        id,
        userId: user.id,
        status: "CONFIRMED",
        checkedInAt: null,

        startTime: {
          gt: now,
        },
      },

      data: {
        status: "CANCELLED_BY_USER",
      },
    });

    if (updated.count !== 1) {
      throw new BookingCancelConflictError();
    }

    /*
     * 7. Giữ nguyên hành vi frontend hiện tại:
     * hủy xong quay lại /bookings.
     */
    return NextResponse.redirect(new URL("/bookings", req.url));
  } catch (error) {
    if (error instanceof BookingCancelConflictError) {
      return NextResponse.json(
        {
          message:
            "Lịch đặt vừa thay đổi trạng thái, đã được check-in hoặc không còn có thể hủy.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Cancel booking error:", error);

    return NextResponse.json(
      {
        message: "Không thể hủy lịch đặt",
      },
      {
        status: 500,
      },
    );
  }
}
