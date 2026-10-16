import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
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

    const { id } = await params;
    const body = await req.json();

    const { action, rejectionReason } = body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { message: "Hành động không hợp lệ" },
        { status: 400 }
      );
    }

    if (action === "REJECT" && !rejectionReason?.trim()) {
      return NextResponse.json(
        { message: "Phải nhập lý do từ chối" },
        { status: 400 }
      );
    }

    const existingDocument = await prisma.document.findUnique({
      where: {
        id,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu" },
        { status: 404 }
      );
    }

    if (existingDocument.status !== "PENDING") {
      return NextResponse.json(
        { message: "Tài liệu này đã được xử lý" },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "APPROVE") {
        const document = await tx.document.update({
          where: {
            id,
          },
          data: {
            status: "APPROVED",
            isCopyrightVerified: true,
            rejectionReason: null,
          },
        });

        await tx.documentAuditLog.create({
          data: {
            documentId: id,
            actorId: user.id,
            action: "APPROVED",
            reason: "Tài liệu được cán bộ duyệt",
          },
        });

        return document;
      }

      const document = await tx.document.update({
        where: {
          id,
        },
        data: {
          status: "REJECTED",
          isCopyrightVerified: false,
          rejectionReason: rejectionReason.trim(),
        },
      });

      await tx.documentAuditLog.create({
        data: {
          documentId: id,
          actorId: user.id,
          action: "REJECTED",
          reason: rejectionReason.trim(),
        },
      });

      return document;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Review document error:", error);

    return NextResponse.json(
      { message: "Không thể xử lý tài liệu" },
      { status: 500 }
    );
  }
}