import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _req: Request,
  { params }: Props
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!["ADMIN", "LIBRARIAN"].includes(user.role)) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const booking =
      await prisma.roomBooking.findUnique({
        where: {
          id,
        },
      });

    if (!booking) {
      return NextResponse.json(
        { message: "Không tìm thấy lịch đặt" },
        { status: 404 }
      );
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          message:
            "Lịch đặt này không còn ở trạng thái CONFIRMED",
        },
        { status: 409 }
      );
    }

    if (booking.checkedInAt) {
      return NextResponse.json(
        {
          message: "Lịch đặt này đã được check-in",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const checkInDeadline = new Date(
      booking.startTime.getTime() + 15 * 60 * 1000
    );

    if (now > checkInDeadline) {
      return NextResponse.json(
        {
          message:
            "Đã quá 15 phút kể từ giờ bắt đầu. Lịch này không thể check-in.",
        },
        { status: 409 }
      );
    }

    const updatedBooking =
      await prisma.roomBooking.update({
        where: {
          id,
        },
        data: {
          checkedInAt: now,
        },
      });

    return NextResponse.json({
      message: "Check-in thành công",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Check-in error:", error);

    return NextResponse.json(
      {
        message: "Không thể check-in",
      },
      { status: 500 }
    );
  }
}