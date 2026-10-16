import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      title,
      description,
      subjectCode,
      subjectName,
      fileUrl,
      fileName,
      fileSize,
      copyrightType,
      sourceUrl,
      permissionProofUrl,
      copyrightDeclared,
    } = body;

    if (
      !title ||
      !subjectCode ||
      !subjectName ||
      !fileUrl ||
      !copyrightType ||
      copyrightDeclared !== true
    ) {
      return NextResponse.json(
        { message: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const document = await prisma.$transaction(async (tx) => {
      const newDocument = await tx.document.create({
        data: {
          title,
          description: description || null,
          subjectCode,
          subjectName,
          fileUrl,
          fileName: fileName || null,
          fileSize: fileSize ?? null,
          copyrightType,
          sourceUrl: sourceUrl || null,
          permissionProofUrl: permissionProofUrl || null,
          copyrightDeclared: true,
          uploaderId: user.id,
          status: "PENDING",
        },
      });

      await tx.documentAuditLog.create({
        data: {
          documentId: newDocument.id,
          actorId: user.id,
          action: "UPLOADED",
          reason: "Người dùng tải tài liệu lên hệ thống",
        },
      });

      return newDocument;
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Create document error:", error);

    return NextResponse.json(
      { message: "Không thể tạo tài liệu" },
      { status: 500 }
    );
  }
}