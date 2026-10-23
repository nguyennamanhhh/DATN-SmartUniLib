import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ReviewAction = "UPHOLD" | "REJECT";

class ComplaintAlreadyProcessedError extends Error {}

class DocumentStateConflictError extends Error {}

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
          message: "ID khiếu nại không hợp lệ",
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

    const { action, resolutionNote } = body as {
      action?: unknown;
      resolutionNote?: unknown;
    };

    /*
     * 5. Validate action
     */
    if (action !== "UPHOLD" && action !== "REJECT") {
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
     * 6. Validate resolution note
     */
    const trimmedNote =
      typeof resolutionNote === "string" ? resolutionNote.trim() : "";

    if (!trimmedNote) {
      return NextResponse.json(
        {
          message: "Phải nhập ghi chú xử lý",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 7. Kiểm tra complaint tồn tại
     */
    const complaint = await prisma.documentComplaint.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
        documentId: true,

        document: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json(
        {
          message: "Không tìm thấy khiếu nại",
        },
        {
          status: 404,
        },
      );
    }

    if (complaint.status !== "PENDING") {
      return NextResponse.json(
        {
          message: "Khiếu nại này đã được xử lý",
        },
        {
          status: 409,
        },
      );
    }

    if (complaint.document.status !== "UNDER_REVIEW") {
      return NextResponse.json(
        {
          message: "Tài liệu không ở trạng thái xem xét",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 8. Transaction
     *
     * Cả complaint và document đều được update với
     * điều kiện trạng thái hiện tại để chống hai Admin
     * xử lý đồng thời.
     */
    const result = await prisma.$transaction(async (tx) => {
      /*
       * Chiếm quyền xử lý complaint.
       */
      const complaintUpdate = await tx.documentComplaint.updateMany({
        where: {
          id,
          status: "PENDING",
        },

        data: {
          status: reviewAction === "UPHOLD" ? "UPHELD" : "REJECTED",

          resolvedById: user.id,
          resolutionNote: trimmedNote,
          resolvedAt: new Date(),
        },
      });

      if (complaintUpdate.count !== 1) {
        throw new ComplaintAlreadyProcessedError();
      }

      /*
       * Chỉ xử lý document nếu nó vẫn đang
       * UNDER_REVIEW.
       */
      const documentUpdate = await tx.document.updateMany({
        where: {
          id: complaint.documentId,
          status: "UNDER_REVIEW",
        },

        data:
          reviewAction === "UPHOLD"
            ? {
                status: "REMOVED",
                isCopyrightVerified: false,
              }
            : {
                status: "APPROVED",
                isCopyrightVerified: true,
              },
      });

      if (documentUpdate.count !== 1) {
        throw new DocumentStateConflictError();
      }

      /*
       * Audit log
       */
      await tx.documentAuditLog.create({
        data: {
          documentId: complaint.documentId,

          actorId: user.id,

          action: reviewAction === "UPHOLD" ? "REMOVED" : "RESTORED",

          reason: trimmedNote,

          info: `Complaint ID: ${id}`,
        },
      });

      return {
        id,
        status:
          reviewAction === "UPHOLD"
            ? ("UPHELD" as const)
            : ("REJECTED" as const),

        documentId: complaint.documentId,

        documentStatus:
          reviewAction === "UPHOLD"
            ? ("REMOVED" as const)
            : ("APPROVED" as const),
      };
    });

    /*
     * 9. Response
     */
    return NextResponse.json({
      message:
        reviewAction === "UPHOLD"
          ? "Đã chấp nhận khiếu nại và gỡ tài liệu"
          : "Đã bác khiếu nại và khôi phục tài liệu",

      complaint: result,
    });
  } catch (error) {
    if (error instanceof ComplaintAlreadyProcessedError) {
      return NextResponse.json(
        {
          message: "Khiếu nại này vừa được xử lý bởi người khác",
        },
        {
          status: 409,
        },
      );
    }

    if (error instanceof DocumentStateConflictError) {
      return NextResponse.json(
        {
          message:
            "Trạng thái tài liệu đã thay đổi, không thể tiếp tục xử lý khiếu nại",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Review complaint error:", error);

    return NextResponse.json(
      {
        message: "Không thể xử lý khiếu nại",
      },
      {
        status: 500,
      },
    );
  }
}
