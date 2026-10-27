import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type TestRequestBody = {
  roomId?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  userCount?: unknown;
};

type TestUser = {
  id: string;
  email: string;
};

type RequestResult = {
  request: number;
  userId: string;
  status: number;
  message: string;
};

class BookingConflictError extends Error {}

class RoomUnavailableError extends Error {}

export async function POST(req: Request) {
  /*
   * Route chỉ tồn tại để test development.
   */
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        message: "Not Found",
      },
      {
        status: 404,
      },
    );
  }

  let testUsers: TestUser[] = [];

  try {
    /*
     * 1. Authentication
     *
     * Vẫn yêu cầu có user đăng nhập để tránh
     * một endpoint DB test hoàn toàn public.
     */
    const currentUser = await getCurrentUser();

    if (!currentUser) {
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
     * 2. Parse body
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

    const { roomId, startTime, endTime, userCount } = body as TestRequestBody;

    /*
     * 3. Validate input
     */
    if (typeof roomId !== "string" || !roomId.trim()) {
      return NextResponse.json(
        {
          message: "Room ID không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (typeof startTime !== "string" || typeof endTime !== "string") {
      return NextResponse.json(
        {
          message: "Thời gian không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const parsedStartTime = new Date(startTime);

    const parsedEndTime = new Date(endTime);

    if (
      Number.isNaN(parsedStartTime.getTime()) ||
      Number.isNaN(parsedEndTime.getTime())
    ) {
      return NextResponse.json(
        {
          message: "Thời gian không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (parsedEndTime <= parsedStartTime) {
      return NextResponse.json(
        {
          message: "Giờ kết thúc phải sau giờ bắt đầu",
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof userCount !== "number" ||
      !Number.isInteger(userCount) ||
      userCount < 2 ||
      userCount > 20
    ) {
      return NextResponse.json(
        {
          message: "Số user test phải nằm trong khoảng 2-20",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 4. Kiểm tra Room.
     */
    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
      },

      select: {
        id: true,
        isAvailable: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        {
          message: "Không tìm thấy phòng",
        },
        {
          status: 404,
        },
      );
    }

    if (!room.isAvailable) {
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
     * 5. Đảm bảo slot test ban đầu đang sạch.
     *
     * Nếu đang có booking thật, không được xóa
     * booking đó mà yêu cầu chọn thời gian khác.
     */
    const existingBooking = await prisma.roomBooking.findFirst({
      where: {
        roomId,

        status: "CONFIRMED",

        endTime: {
          gt: parsedStartTime,
        },

        OR: [
          {
            startTime: {
              lt: parsedEndTime,
            },
          },
          {
            checkedInAt: {
              lt: parsedEndTime,
            },
          },
        ],
      },

      select: {
        id: true,
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        {
          message:
            "Khung giờ này đang có booking khác. Hãy chọn một khung giờ trống để test.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 6. Tạo N user test tạm thời.
     *
     * Mỗi request sẽ dùng một user khác nhau.
     */
    testUsers = Array.from(
      {
        length: userCount,
      },
      (_, index) => {
        const uniqueId = randomUUID();

        return {
          id: `dev-test-${uniqueId}`,

          email: `booking-test-${index + 1}-${uniqueId}@dev.local`,
        };
      },
    );

    await prisma.user.createMany({
      data: testUsers.map((testUser) => ({
        id: testUser.id,
        email: testUser.email,
        fullName: "Concurrency Test User",
        role: "STUDENT",
      })),
    });

    /*
     * 7. Tạo N transaction gần như đồng thời.
     *
     * Mỗi transaction:
     *
     * - dùng một user khác nhau
     * - cùng lock một Room
     * - cùng đặt chính xác một khoảng thời gian
     */
    const requests = testUsers.map(
      async (testUser, index): Promise<RequestResult> => {
        try {
          await prisma.$transaction(
            async (tx) => {
              /*
               * Lock User.
               *
               * Vì mỗi request có một user khác nhau,
               * phần này KHÔNG serialize các request.
               */
              const lockedUsers = await tx.$queryRaw<
                Array<{
                  id: string;
                }>
              >`
                  SELECT id
                  FROM users
                  WHERE id = ${testUser.id}
                  FOR UPDATE
                `;

              if (!lockedUsers[0]) {
                throw new Error("TEST_USER_NOT_FOUND");
              }

              /*
               * Lock Room.
               *
               * Đây mới là điểm tất cả request
               * cùng tranh chấp.
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

              const lockedRoom = lockedRooms[0];

              if (!lockedRoom) {
                throw new RoomUnavailableError();
              }

              if (!lockedRoom.isAvailable) {
                throw new RoomUnavailableError();
              }

              /*
               * Sau khi giành được Room lock,
               * kiểm tra dữ liệu mới nhất.
               *
               * Có tính cả early check-in giống
               * API booking thật.
               */
              const overlapping = await tx.roomBooking.findFirst({
                where: {
                  roomId,

                  status: "CONFIRMED",

                  endTime: {
                    gt: parsedStartTime,
                  },

                  OR: [
                    {
                      startTime: {
                        lt: parsedEndTime,
                      },
                    },
                    {
                      checkedInAt: {
                        lt: parsedEndTime,
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
               * Request đầu tiên vào được đây
               * sẽ tạo booking.
               */
              await tx.roomBooking.create({
                data: {
                  roomId,

                  userId: testUser.id,

                  startTime: parsedStartTime,

                  endTime: parsedEndTime,

                  status: "CONFIRMED",
                },
              });
            },
            {
              /*
               * Cho các transaction đủ thời gian
               * chờ Room lock trong bài stress test.
               */
              maxWait: 10_000,
              timeout: 20_000,
            },
          );

          return {
            request: index + 1,
            userId: testUser.id,
            status: 201,
            message: "Đặt phòng thành công",
          };
        } catch (error) {
          if (error instanceof BookingConflictError) {
            return {
              request: index + 1,
              userId: testUser.id,
              status: 409,
              message:
                "Khoảng thời gian này đã có người sử dụng hoặc đặt phòng.",
            };
          }

          if (error instanceof RoomUnavailableError) {
            return {
              request: index + 1,
              userId: testUser.id,
              status: 409,
              message: "Phòng không khả dụng",
            };
          }

          console.error(`Multi-user request ${index + 1} error:`, error);

          return {
            request: index + 1,
            userId: testUser.id,
            status: 500,
            message: "Lỗi khi chạy transaction test",
          };
        }
      },
    );

    const results = await Promise.all(requests);

    /*
     * 8. Tổng hợp kết quả.
     */
    const successCount = results.filter(
      (result) => result.status === 201,
    ).length;

    const conflictCount = results.filter(
      (result) => result.status === 409,
    ).length;

    const otherCount = results.length - successCount - conflictCount;

    const passed =
      successCount === 1 && conflictCount === userCount - 1 && otherCount === 0;

    return NextResponse.json({
      message: passed
        ? "Multi-user concurrency test PASS"
        : "Multi-user concurrency test FAIL",

      passed,

      summary: {
        userCount,
        successCount,
        conflictCount,
        otherCount,
      },

      results,
    });
  } catch (error) {
    console.error("Multi-user concurrency test error:", error);

    return NextResponse.json(
      {
        message: "Không thể chạy multi-user concurrency test",
      },
      {
        status: 500,
      },
    );
  } finally {
    /*
     * 9. Cleanup
     *
     * Xóa booking test trước,
     * sau đó mới xóa User test vì FK.
     */
    if (testUsers.length > 0) {
      const testUserIds = testUsers.map((user) => user.id);

      try {
        await prisma.roomBooking.deleteMany({
          where: {
            userId: {
              in: testUserIds,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: testUserIds,
            },
          },
        });
      } catch (cleanupError) {
        console.error("Multi-user cleanup error:", cleanupError);
      }
    }
  }
}
