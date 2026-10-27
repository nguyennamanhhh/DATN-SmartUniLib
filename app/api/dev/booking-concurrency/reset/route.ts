import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  /*
   * API này tuyệt đối không hoạt động trên production.
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

  try {
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
     * Parse body an toàn.
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

    const { roomId, startTime, endTime } = body as {
      roomId?: unknown;
      startTime?: unknown;
      endTime?: unknown;
    };

    if (
      typeof roomId !== "string" ||
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      return NextResponse.json(
        {
          message: "Dữ liệu test không hợp lệ",
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

    /*
     * Chỉ xóa booking:
     *
     * - của chính user đang đăng nhập
     * - đúng room
     * - đúng startTime
     * - đúng endTime
     *
     * Không được xóa booking của user khác.
     */
    const deleted = await prisma.roomBooking.deleteMany({
      where: {
        userId: user.id,
        roomId,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
      },
    });

    return NextResponse.json({
      message: "Cleanup thành công",
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error("Booking concurrency cleanup error:", error);

    return NextResponse.json(
      {
        message: "Không thể cleanup dữ liệu test",
      },
      {
        status: 500,
      },
    );
  }
}
