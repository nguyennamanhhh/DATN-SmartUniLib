import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(
  req: Request,
  { params }: Props
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const booking = await prisma.roomBooking.findUnique({
    where: { id },
  });

  if (!booking) {
    return NextResponse.json(
      { message: "Không tìm thấy lịch đặt" },
      { status: 404 }
    );
  }

  if (booking.userId !== user.id) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { message: "Lịch này không thể hủy" },
      { status: 409 }
    );
  }

  if (booking.startTime <= new Date()) {
    return NextResponse.json(
      {
        message:
          "Không thể hủy lịch đã bắt đầu hoặc đã qua.",
      },
      { status: 400 }
    );
  }

  await prisma.roomBooking.update({
    where: { id },
    data: {
      status: "CANCELLED_BY_USER",
    },
  });

  return NextResponse.redirect(
    new URL("/bookings", req.url)
  );
}