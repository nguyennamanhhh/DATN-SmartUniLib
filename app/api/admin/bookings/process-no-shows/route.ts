import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const NO_SHOW_GRACE_MINUTES = 15;
const BAN_THRESHOLD = 3;
const BAN_DAYS = 7;

export async function POST() {
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
     * 3. Xác định mốc quá hạn.
     *
     * Ví dụ hiện tại là 15:30 thì booking có startTime
     * trước 15:15 mới đủ điều kiện NO_SHOW.
     */
    const now = new Date();

    const overdueCutoff = new Date(
      now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000,
    );

    /*
     * 4. Chỉ lấy những booking có khả năng cần xử lý.
     *
     * Đây chỉ là bước tạo danh sách ứng viên.
     * Việc quyết định booking nào thực sự được xử lý
     * vẫn được thực hiện bằng atomic update bên dưới.
     */
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
      },

      orderBy: {
        startTime: "asc",
      },
    });

    let processedCount = 0;
    let bannedCount = 0;

    /*
     * 5. Xử lý từng booking.
     */
    for (const booking of overdueBookings) {
      const result = await prisma.$transaction(async (tx) => {
        /*
         * Atomic claim:
         *
         * Chỉ request đầu tiên còn thấy:
         * - status = CONFIRMED
         * - checkedInAt = null
         * - đã quá 15 phút
         *
         * mới đổi được sang NO_SHOW.
         */
        const bookingUpdate = await tx.roomBooking.updateMany({
          where: {
            id: booking.id,

            status: "CONFIRMED",

            checkedInAt: null,

            startTime: {
              lt: overdueCutoff,
            },
          },

          data: {
            status: "NO_SHOW",
          },
        });

        /*
         * count = 0 nghĩa là booking vừa được
         * request khác xử lý hoặc vừa check-in.
         */
        if (bookingUpdate.count !== 1) {
          return {
            processed: false,
            banned: false,
          };
        }

        /*
         * Tăng noShowCount theo kiểu atomic.
         *
         * Prisma trả lại giá trị sau khi increment,
         * nên không cần findUnique() trước rồi tự +1.
         */
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
            bannedUntil: true,
          },
        });

        /*
         * Nếu đạt ngưỡng thì khóa 7 ngày.
         */
        if (updatedUser.noShowCount >= BAN_THRESHOLD) {
          const bannedUntil = new Date(
            now.getTime() + BAN_DAYS * 24 * 60 * 60 * 1000,
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
      });

      if (result.processed) {
        processedCount++;
      }

      if (result.banned) {
        bannedCount++;
      }
    }

    /*
     * 6. Response
     */
    return NextResponse.json({
      message:
        processedCount === 0
          ? "Không có lịch nào cần xử lý NO_SHOW"
          : `Đã xử lý ${processedCount} lịch NO_SHOW`,

      processedCount,
      bannedCount,
    });
  } catch (error) {
    console.error("Process no-shows error:", error);

    return NextResponse.json(
      {
        message: "Không thể xử lý NO_SHOW",
      },
      {
        status: 500,
      },
    );
  }
}
