import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

class DocumentComplaintConflictError extends Error {}

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
     * 2. Validate document ID
     */
    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("ID tài liệu không hợp lệ", 400);
    }

    /*
     * 3. Parse JSON
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

    const { reason } = body as Record<string, unknown>;

    /*
     * 4. Validate complaint reason
     */
    if (typeof reason !== "string") {
      return errorResponse("Vui lòng nhập nội dung khiếu nại", 400);
    }

    const trimmedReason = reason.trim();

    if (trimmedReason.length < MIN_REASON_LENGTH) {
      return errorResponse("Nội dung khiếu nại phải có ít nhất 10 ký tự", 400);
    }

    if (trimmedReason.length > MAX_REASON_LENGTH) {
      return errorResponse(
        "Nội dung khiếu nại không được vượt quá 2000 ký tự",
        400,
      );
    }

    /*
     * 5. Check document existence
     */
    const document = await prisma.document.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!document) {
      return errorResponse("Không tìm thấy tài liệu", 404);
    }

    if (document.status !== "APPROVED") {
      return errorResponse("Tài liệu này hiện không thể gửi khiếu nại", 409);
    }

    /*
     * 6. Transaction
     *
     * Thứ tự:
     * - Chuyển APPROVED -> UNDER_REVIEW
     * - Tạo DocumentComplaint
     * - Ghi DocumentAuditLog
     *
     * Nếu một bước thất bại, transaction rollback.
     */
    const complaint = await prisma.$transaction(
      async (tx) => {
        /*
         * 6.1 Atomic status transition
         *
         * Chỉ một request có thể chuyển tài liệu
         * từ APPROVED sang UNDER_REVIEW.
         */
        const updated = await tx.document.updateMany({
          where: {
            id,
            status: "APPROVED",
          },
          data: {
            status: "UNDER_REVIEW",
          },
        });

        if (updated.count !== 1) {
          throw new DocumentComplaintConflictError();
        }

        /*
         * 6.2 Create complaint
         */
        const newComplaint = await tx.documentComplaint.create({
          data: {
            documentId: id,
            complainantId: user.id,
            complainantName: user.fullName,
            complainantEmail: user.email,
            reason: trimmedReason,
            status: "PENDING",
          },
        });

        /*
         * 6.3 Audit log
         */
        await tx.documentAuditLog.create({
          data: {
            documentId: id,
            actorId: user.id,
            action: "COMPLAINT_SUBMITTED",
            reason: trimmedReason,
            info: `Complaint ID: ${newComplaint.id}`,
          },
        });

        return newComplaint;
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    /*
     * 7. Success response
     */
    return NextResponse.json(
      {
        message:
          "Đã tiếp nhận khiếu nại. Tài liệu được tạm ngừng phân phối để xem xét.",
        complaint,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DocumentComplaintConflictError) {
      return errorResponse(
        "Tài liệu vừa được chuyển trạng thái bởi yêu cầu khác. Vui lòng tải lại trang.",
        409,
      );
    }

    console.error("Submit complaint error:", error);

    return errorResponse("Không thể gửi khiếu nại", 500);
  }
}
