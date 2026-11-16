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

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 },
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
    const MAX_REJECTION_REASON_LENGTH = 2000;

    if (
      reviewAction === "REJECT" &&
      trimmedReason.length > MAX_REJECTION_REASON_LENGTH
    ) {
      return NextResponse.json(
        {
          message: "Lý do từ chối không được vượt quá 2000 ký tự",
        },
        { status: 400 },
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
        storagePath: true,
        copyrightType: true,
        copyrightDeclared: true,
        sourceUrl: true,
        permissionProofUrl: true,
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
     * Kiểm tra điều kiện tối thiểu trước khi duyệt.
     *
     * Đây là kiểm tra tính đầy đủ của khai báo.
     * Cán bộ vẫn phải xác minh bản quyền thực tế.
     */
    if (reviewAction === "APPROVE") {
      if (!existingDocument.copyrightDeclared) {
        return NextResponse.json(
          {
            message: "Tài liệu chưa có cam kết bản quyền của người tải lên.",
          },
          { status: 409 },
        );
      }

      if (!existingDocument.storagePath) {
        return NextResponse.json(
          {
            message: "Tài liệu chưa có đường dẫn PDF hợp lệ để kiểm duyệt.",
          },
          { status: 409 },
        );
      }

      if (
        existingDocument.copyrightType === "OPEN_SOURCE" &&
        !existingDocument.sourceUrl?.trim()
      ) {
        return NextResponse.json(
          {
            message: "Tài liệu nguồn mở chưa có đường dẫn nguồn.",
          },
          { status: 409 },
        );
      }

      if (
        existingDocument.copyrightType === "AUTHOR_PERMISSION" &&
        !existingDocument.permissionProofUrl?.trim()
      ) {
        return NextResponse.json(
          {
            message: "Tài liệu chưa có minh chứng cho phép của tác giả.",
          },
          { status: 409 },
        );
      }
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
