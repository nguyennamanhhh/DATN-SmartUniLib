import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const NO_SHOW_GRACE_MINUTES = 15;
const BAN_THRESHOLD = 3;
const BAN_DAYS = 7;
const BATCH_SIZE = 100;

type ProcessingResult = {
  processed: boolean;
  banned: boolean;
};

export async function POST() {
  try {
    const admin = await getCurrentUser();

    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "ADMIN" && admin.role !== "LIBRARIAN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    const overdueCutoff = new Date(
      now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000,
    );

    const overdueBookings = await prisma.roomBooking.findMany({
      where: {
        status: "CONFIRMED",
        checkedInAt: null,
        startTime: {
          lt: overdueCutoff,
        },
      },

      select: {
        id: true,
        userId: true,
        roomId: true,
      },

      orderBy: [{ startTime: "asc" }, { id: "asc" }],

      take: BATCH_SIZE,
    });

    let processedCount = 0;
    let bannedCount = 0;
    let skippedCount = 0;

    for (const booking of overdueBookings) {
      const result = await prisma.$transaction(
        async (tx): Promise<ProcessingResult> => {
          const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
              SELECT id
              FROM users
              WHERE id = ${booking.userId}
              FOR UPDATE
            `;

          if (!lockedUsers[0]) {
            throw new Error("NO_SHOW_USER_NOT_FOUND");
          }

          const lockedRooms = await tx.$queryRaw<Array<{ id: string }>>`
              SELECT id
              FROM rooms
              WHERE id = ${booking.roomId}
              FOR UPDATE
            `;

          if (!lockedRooms[0]) {
            throw new Error("NO_SHOW_ROOM_NOT_FOUND");
          }

          const transactionNow = new Date();

          const transactionCutoff = new Date(
            transactionNow.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000,
          );

          const bookingUpdate = await tx.roomBooking.updateMany({
            where: {
              id: booking.id,
              userId: booking.userId,
              roomId: booking.roomId,

              status: "CONFIRMED",
              checkedInAt: null,

              startTime: {
                lt: transactionCutoff,
              },
            },

            data: {
              status: "NO_SHOW",
            },
          });

          if (bookingUpdate.count !== 1) {
            return {
              processed: false,
              banned: false,
            };
          }

          const updatedUser = await tx.user.update({
            where: {
              id: booking.userId,
            },

            data: {
              noShowCount: {
                increment: 1,
              },
            },

            select: {
              id: true,
              noShowCount: true,
            },
          });

          if (updatedUser.noShowCount === BAN_THRESHOLD) {
            const bannedUntil = new Date(
              transactionNow.getTime() + BAN_DAYS * 24 * 60 * 60 * 1000,
            );

            await tx.user.update({
              where: {
                id: updatedUser.id,
              },

              data: {
                bannedUntil,
              },
            });

            return {
              processed: true,
              banned: true,
            };
          }

          return {
            processed: true,
            banned: false,
          };
        },
        {
          maxWait: 10_000,
          timeout: 20_000,
        },
      );

      if (result.processed) {
        processedCount++;
      } else {
        skippedCount++;
      }

      if (result.banned) {
        bannedCount++;
      }
    }

    return NextResponse.json({
      message:
        processedCount === 0
          ? "Không có lịch nào được chuyển sang NO_SHOW"
          : `Đã xử lý ${processedCount} lịch NO_SHOW`,

      summary: {
        examinedCount: overdueBookings.length,
        processedCount,
        skippedCount,
        bannedCount,
        batchSize: BATCH_SIZE,
        batchLimitReached: overdueBookings.length === BATCH_SIZE,
      },

      processedCount,
      bannedCount,
    });
  } catch (error) {
    console.error("Process no-shows error:", error);

    return NextResponse.json(
      {
        message:
          "Không thể hoàn tất xử lý NO_SHOW. Vui lòng tải lại danh sách để kiểm tra kết quả.",
      },
      {
        status: 500,
      },
    );
  }
}
