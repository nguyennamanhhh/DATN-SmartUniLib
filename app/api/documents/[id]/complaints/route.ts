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

    const { id } = await params;
    const body = await req.json();

    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { message: "Vui lòng nhập nội dung khiếu nại" },
        { status: 400 }
      );
    }

    const document = await prisma.document.findUnique({
      where: {
        id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { message: "Không tìm thấy tài liệu" },
        { status: 404 }
      );
    }

    if (document.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Tài liệu này không thể khiếu nại" },
        { status: 409 }
      );
    }

    const complaint = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.documentComplaint.create({
        data: {
          documentId: id,
          complainantId: user.id,
          complainantName: user.fullName,
          complainantEmail: user.email,
          reason,
          status: "PENDING",
        },
      });

      await tx.document.update({
        where: {
          id,
        },
        data: {
          status: "UNDER_REVIEW",
        },
      });

      await tx.documentAuditLog.create({
        data: {
          documentId: id,
          actorId: user.id,
          action: "COMPLAINT_SUBMITTED",
          reason,
          info: `Complaint ID: ${newComplaint.id}`,
        },
      });

      return newComplaint;
    });

    return NextResponse.json(complaint, {
      status: 201,
    });
  } catch (error) {
    console.error("Submit complaint error:", error);

    return NextResponse.json(
      { message: "Không thể gửi khiếu nại" },
      { status: 500 }
    );
  }
}