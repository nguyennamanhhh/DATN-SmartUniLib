import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ReviewAction = "APPROVE" | "REJECT";

class DocumentAlreadyProcessedError extends Error {}

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
          message: "ID tài liệu không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 4. Parse body
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

    const { action, rejectionReason } = body as {
      action?: unknown;
      rejectionReason?: unknown;
    };

    /*
     * 5. Validate action
     */
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        {
          message: "Hành động không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const reviewAction: ReviewAction = action;

    /*
     * 6. Validate rejection reason
     */
    const trimmedReason =
      typeof rejectionReason === "string" ? rejectionReason.trim() : "";

    if (reviewAction === "REJECT" && !trimmedReason) {
      return NextResponse.json(
        {
          message: "Phải nhập lý do từ chối",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 7. Kiểm tra tài liệu tồn tại
     */
    const existingDocument = await prisma.document.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        {
          message: "Không tìm thấy tài liệu",
        },
        {
          status: 404,
        },
      );
    }

    if (existingDocument.status !== "PENDING") {
      return NextResponse.json(
        {
          message: "Tài liệu này đã được xử lý",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 8. Transaction
     *
     * updateMany + điều kiện status=PENDING giúp chống
     * trường hợp hai request xử lý cùng một tài liệu
     * gần như đồng thời.
     */
    const result = await prisma.$transaction(async (tx) => {
      if (reviewAction === "APPROVE") {
        const updated = await tx.document.updateMany({
          where: {
            id,
            status: "PENDING",
          },

          data: {
            status: "APPROVED",
            isCopyrightVerified: true,
            rejectionReason: null,
          },
        });

        if (updated.count !== 1) {
          throw new DocumentAlreadyProcessedError();
        }

        await tx.documentAuditLog.create({
          data: {
            documentId: id,
            actorId: user.id,
            action: "APPROVED",
            reason: "Tài liệu được cán bộ duyệt",
          },
        });

        return {
          id,
          status: "APPROVED" as const,
        };
      }

      const updated = await tx.document.updateMany({
        where: {
          id,
          status: "PENDING",
        },

        data: {
          status: "REJECTED",
          isCopyrightVerified: false,
          rejectionReason: trimmedReason,
        },
      });

      if (updated.count !== 1) {
        throw new DocumentAlreadyProcessedError();
      }

      await tx.documentAuditLog.create({
        data: {
          documentId: id,
          actorId: user.id,
          action: "REJECTED",
          reason: trimmedReason,
        },
      });

      return {
        id,
        status: "REJECTED" as const,
      };
    });

    /*
     * 9. Response
     */
    return NextResponse.json({
      message:
        reviewAction === "APPROVE"
          ? "Đã duyệt tài liệu"
          : "Đã từ chối tài liệu",

      document: result,
    });
  } catch (error) {
    if (error instanceof DocumentAlreadyProcessedError) {
      return NextResponse.json(
        {
          message: "Tài liệu này vừa được xử lý bởi người khác",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Review document error:", error);

    return NextResponse.json(
      {
        message: "Không thể xử lý tài liệu",
      },
      {
        status: 500,
      },
    );
  }
}
