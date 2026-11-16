import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ReviewAction = "UPHOLD" | "REJECT";

const MAX_RESOLUTION_NOTE_LENGTH = 2000;

class ComplaintAlreadyProcessedError extends Error {}

class DocumentStateConflictError extends Error {}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: Request, { params }: Props) {
  try {
    /*
     * 1. Authentication
     */
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    /*
     * 2. Authorization
     */
    if (user.role !== "ADMIN" && user.role !== "LIBRARIAN") {
      return errorResponse("Forbidden", 403);
    }

    /*
     * 3. Validate complaint ID
     */
    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("ID khiếu nại không hợp lệ", 400);
    }

    /*
     * 4. Parse JSON safely
     */
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return errorResponse("Dữ liệu gửi lên không hợp lệ", 400);
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const { action, resolutionNote } = body as {
      action?: unknown;
      resolutionNote?: unknown;
    };

    /*
     * 5. Validate action
     */
    if (action !== "UPHOLD" && action !== "REJECT") {
      return errorResponse("Hành động không hợp lệ", 400);
    }

    const reviewAction: ReviewAction = action;

    /*
     * 6. Validate resolution note
     */
    if (typeof resolutionNote !== "string") {
      return errorResponse("Phải nhập ghi chú xử lý", 400);
    }

    const trimmedNote = resolutionNote.trim();

    if (!trimmedNote) {
      return errorResponse("Phải nhập ghi chú xử lý", 400);
    }

    if (trimmedNote.length > MAX_RESOLUTION_NOTE_LENGTH) {
      return errorResponse("Ghi chú xử lý không được vượt quá 2000 ký tự", 400);
    }

    /*
     * 7. Check complaint existence
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
      return errorResponse("Không tìm thấy khiếu nại", 404);
    }

    if (complaint.status !== "PENDING") {
      return errorResponse("Khiếu nại này đã được xử lý", 409);
    }

    if (complaint.document.status !== "UNDER_REVIEW") {
      return errorResponse("Tài liệu không ở trạng thái xem xét", 409);
    }

    /*
     * 8. Transaction
     *
     * Thứ tự:
     * Document
     *   ↓
     * DocumentComplaint
     *   ↓
     * DocumentAuditLog
     *
     * Đồng bộ với API tiếp nhận khiếu nại.
     */
    const result = await prisma.$transaction(
      async (tx) => {
        const transactionNow = new Date();

        const nextDocumentStatus =
          reviewAction === "UPHOLD"
            ? ("REMOVED" as const)
            : ("APPROVED" as const);

        const nextComplaintStatus =
          reviewAction === "UPHOLD"
            ? ("UPHELD" as const)
            : ("REJECTED" as const);

        /*
         * 8.1 Atomic document transition
         *
         * Chỉ chuyển trạng thái nếu tài liệu
         * vẫn đang UNDER_REVIEW.
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
         * 8.2 Atomic complaint transition
         *
         * Chỉ xử lý complaint PENDING.
         *
         * Nếu thất bại, transaction rollback
         * cả cập nhật Document phía trên.
         */
        const complaintUpdate = await tx.documentComplaint.updateMany({
          where: {
            id,
            documentId: complaint.documentId,
            status: "PENDING",
          },

          data: {
            status: nextComplaintStatus,
            resolvedById: user.id,
            resolutionNote: trimmedNote,
            resolvedAt: transactionNow,
          },
        });

        if (complaintUpdate.count !== 1) {
          throw new ComplaintAlreadyProcessedError();
        }

        /*
         * 8.3 Audit log
         *
         * Lưu người xử lý, quyết định
         * và lý do giải quyết khiếu nại.
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

        /*
         * 8.4 Transaction result
         */
        return {
          id,
          status: nextComplaintStatus,
          documentId: complaint.documentId,
          documentStatus: nextDocumentStatus,
        };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    /*
     * 9. Success response
     *
     * Giữ nguyên response contract.
     */
    return NextResponse.json({
      message:
        reviewAction === "UPHOLD"
          ? "Đã chấp nhận khiếu nại và gỡ tài liệu"
          : "Đã bác khiếu nại và khôi phục tài liệu",

      complaint: result,
    });
  } catch (error) {
    /*
     * Complaint already processed
     */
    if (error instanceof ComplaintAlreadyProcessedError) {
      return errorResponse("Khiếu nại này vừa được xử lý bởi người khác", 409);
    }

    /*
     * Document state changed
     */
    if (error instanceof DocumentStateConflictError) {
      return errorResponse(
        "Trạng thái tài liệu đã thay đổi, không thể tiếp tục xử lý khiếu nại",
        409,
      );
    }

    /*
     * Prisma transaction conflict/deadlock
     */
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2034") {
        return errorResponse(
          "Có giao dịch đồng thời đang xử lý tài liệu. Vui lòng tải lại trang và thử lại.",
          409,
        );
      }
    }

    console.error("Review complaint error:", error);

    return errorResponse("Không thể xử lý khiếu nại", 500);
  }
}
