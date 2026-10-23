import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

class BookingCheckInConflictError extends Error {}

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
     * 4. Tìm booking
     */
    const booking = await prisma.roomBooking.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
        checkedInAt: true,
        startTime: true,
        endTime: true,
        roomId: true,
        userId: true,
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
     * 5. Kiểm tra trạng thái
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
     * Sinh viên có tối đa 15 phút kể từ
     * giờ bắt đầu booking để check-in.
     */
    const checkInDeadline = new Date(
      booking.startTime.getTime() + 15 * 60 * 1000,
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
     * 6. Atomic check-in
     *
     * Điều kiện checkedInAt = null và status = CONFIRMED
     * giúp ngăn hai Admin check-in cùng một booking
     * gần như đồng thời.
     */
    const updated = await prisma.roomBooking.updateMany({
      where: {
        id,
        status: "CONFIRMED",
        checkedInAt: null,
      },

      data: {
        checkedInAt: now,
      },
    });

    if (updated.count !== 1) {
      throw new BookingCheckInConflictError();
    }

    /*
     * 7. Response
     *
     * Không cần trả toàn bộ booking.
     */
    return NextResponse.json({
      message: "Check-in thành công",

      booking: {
        id,
        status: "CONFIRMED",
        checkedInAt: now,
      },
    });
  } catch (error) {
    if (error instanceof BookingCheckInConflictError) {
      return NextResponse.json(
        {
          message: "Lịch đặt này vừa được check-in hoặc trạng thái đã thay đổi",
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
