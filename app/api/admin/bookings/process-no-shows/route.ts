import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST() {
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

    const now = new Date();

    // Những booking chưa check-in và đã quá hạn 15 phút
    const overdueBookings =
      await prisma.roomBooking.findMany({
        where: {
          status: "CONFIRMED",
          checkedInAt: null,
          startTime: {
            lt: new Date(
              now.getTime() - 15 * 60 * 1000
            ),
          },
        },
      });

    let processedCount = 0;

    for (const booking of overdueBookings) {
      await prisma.$transaction(async (tx) => {
        // Đọc lại booking để tránh xử lý lặp
        const currentBooking =
          await tx.roomBooking.findUnique({
            where: {
              id: booking.id,
            },
          });

        if (
          !currentBooking ||
          currentBooking.status !== "CONFIRMED" ||
          currentBooking.checkedInAt
        ) {
          return;
        }

        const deadline = new Date(
          currentBooking.startTime.getTime() +
            15 * 60 * 1000
        );

        if (now <= deadline) {
          return;
        }

        await tx.roomBooking.update({
          where: {
            id: currentBooking.id,
          },
          data: {
            status: "NO_SHOW",
          },
        });

        const bookingOwner = await tx.user.findUnique({
          where: {
            id: currentBooking.userId,
          },
          select: {
            noShowCount: true,
          },
        });

        if (!bookingOwner) {
          throw new Error("USER_NOT_FOUND");
        }

        const nextNoShowCount =
          bookingOwner.noShowCount + 1;

        const shouldBan = nextNoShowCount >= 3;

        await tx.user.update({
          where: {
            id: currentBooking.userId,
          },
          data: {
            noShowCount: {
              increment: 1,
            },

            ...(shouldBan
              ? {
                  bannedUntil: new Date(
                    now.getTime() +
                      7 * 24 * 60 * 60 * 1000
                  ),
                }
              : {}),
          },
        });

        processedCount++;
      });
    }

    return NextResponse.json({
      message: `Đã xử lý ${processedCount} lịch NO_SHOW`,
      processedCount,
    });
  } catch (error) {
    console.error("Process no-shows error:", error);

    return NextResponse.json(
      {
        message: "Không thể xử lý NO_SHOW",
      },
      { status: 500 }
    );
  }
}