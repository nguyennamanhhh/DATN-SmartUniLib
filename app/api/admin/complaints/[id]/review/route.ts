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

    const { action, resolutionNote } = body;

    if (!["UPHOLD", "REJECT"].includes(action)) {
      return NextResponse.json(
        { message: "Hành động không hợp lệ" },
        { status: 400 }
      );
    }

    if (!resolutionNote?.trim()) {
      return NextResponse.json(
        { message: "Phải nhập ghi chú xử lý" },
        { status: 400 }
      );
    }

    const complaint = await prisma.documentComplaint.findUnique({
      where: {
        id,
      },
      include: {
        document: true,
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { message: "Không tìm thấy khiếu nại" },
        { status: 404 }
      );
    }

    if (complaint.status !== "PENDING") {
      return NextResponse.json(
        { message: "Khiếu nại này đã được xử lý" },
        { status: 409 }
      );
    }

    if (complaint.document.status !== "UNDER_REVIEW") {
      return NextResponse.json(
        { message: "Tài liệu không ở trạng thái xem xét" },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "UPHOLD") {
        await tx.document.update({
          where: {
            id: complaint.documentId,
          },
          data: {
            status: "REMOVED",
          },
        });

        const updatedComplaint =
          await tx.documentComplaint.update({
            where: {
              id,
            },
            data: {
              status: "UPHELD",
              resolvedById: user.id,
              resolutionNote: resolutionNote.trim(),
              resolvedAt: new Date(),
            },
          });

        await tx.documentAuditLog.create({
          data: {
            documentId: complaint.documentId,
            actorId: user.id,
            action: "REMOVED",
            reason: resolutionNote.trim(),
            info: `Complaint ID: ${id}`,
          },
        });

        return updatedComplaint;
      }

      await tx.document.update({
        where: {
          id: complaint.documentId,
        },
        data: {
          status: "APPROVED",
        },
      });

      const updatedComplaint =
        await tx.documentComplaint.update({
          where: {
            id,
          },
          data: {
            status: "REJECTED",
            resolvedById: user.id,
            resolutionNote: resolutionNote.trim(),
            resolvedAt: new Date(),
          },
        });

      await tx.documentAuditLog.create({
        data: {
          documentId: complaint.documentId,
          actorId: user.id,
          action: "RESTORED",
          reason: resolutionNote.trim(),
          info: `Complaint ID: ${id}`,
        },
      });

      return updatedComplaint;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Review complaint error:", error);

    return NextResponse.json(
      { message: "Không thể xử lý khiếu nại" },
      { status: 500 }
    );
  }
}