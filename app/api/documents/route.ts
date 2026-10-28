import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "documents";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const COPYRIGHT_TYPES = [
  "SELF_CREATED",
  "AUTHOR_PERMISSION",
  "OPEN_SOURCE",
] as const;

type CopyrightType = (typeof COPYRIGHT_TYPES)[number];

const PDF_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidStoragePath(path: string, userId: string): boolean {
  const parts = path.split("/");

  return (
    parts.length === 2 && parts[0] === userId && PDF_PATH_PATTERN.test(parts[1])
  );
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return errorResponse("Dữ liệu gửi lên không hợp lệ", 400);
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const {
      title,
      description,
      subjectCode,
      subjectName,
      storagePath,
      fileName,
      fileSize,
      copyrightType,
      sourceUrl,
      permissionProofUrl,
      copyrightDeclared,
    } = body as Record<string, unknown>;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      typeof subjectCode !== "string" ||
      !subjectCode.trim() ||
      subjectCode.trim().length > 50 ||
      typeof subjectName !== "string" ||
      !subjectName.trim() ||
      subjectName.trim().length > 200
    ) {
      return errorResponse("Thông tin tài liệu hoặc môn học không hợp lệ", 400);
    }

    const normalizedDescription = optionalText(description);

    if (normalizedDescription && normalizedDescription.length > 5000) {
      return errorResponse("Mô tả tài liệu quá dài", 400);
    }

    if (
      typeof storagePath !== "string" ||
      !isValidStoragePath(storagePath, user.id)
    ) {
      return errorResponse(
        "Đường dẫn file không hợp lệ hoặc không thuộc người dùng",
        403,
      );
    }

    if (
      typeof fileName !== "string" ||
      !fileName.trim() ||
      fileName.trim().length > 255 ||
      !fileName.trim().toLowerCase().endsWith(".pdf")
    ) {
      return errorResponse("Tên file PDF không hợp lệ", 400);
    }

    if (
      typeof fileSize !== "number" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return errorResponse("Dung lượng PDF không hợp lệ", 400);
    }

    if (
      typeof copyrightType !== "string" ||
      !COPYRIGHT_TYPES.includes(copyrightType as CopyrightType)
    ) {
      return errorResponse("Loại quyền sử dụng không hợp lệ", 400);
    }

    if (copyrightDeclared !== true) {
      return errorResponse("Bạn phải xác nhận quyền sử dụng tài liệu", 400);
    }

    const normalizedSourceUrl = optionalText(sourceUrl);

    const normalizedPermissionProofUrl = optionalText(permissionProofUrl);

    if (
      normalizedSourceUrl &&
      (normalizedSourceUrl.length > 2000 ||
        !isValidHttpUrl(normalizedSourceUrl))
    ) {
      return errorResponse("Đường dẫn nguồn không hợp lệ", 400);
    }

    if (
      normalizedPermissionProofUrl &&
      (normalizedPermissionProofUrl.length > 2000 ||
        !isValidHttpUrl(normalizedPermissionProofUrl))
    ) {
      return errorResponse("Đường dẫn minh chứng không hợp lệ", 400);
    }

    if (copyrightType === "OPEN_SOURCE" && !normalizedSourceUrl) {
      return errorResponse("Vui lòng cung cấp đường dẫn nguồn", 400);
    }

    if (
      copyrightType === "AUTHOR_PERMISSION" &&
      !normalizedPermissionProofUrl
    ) {
      return errorResponse("Vui lòng cung cấp minh chứng cho phép", 400);
    }

    const existingDocument = await prisma.document.findUnique({
      where: {
        storagePath,
      },
      select: {
        id: true,
      },
    });

    if (existingDocument) {
      return errorResponse("File này đã được sử dụng cho một tài liệu", 409);
    }

    const { data: fileInfo, error: infoError } = await supabaseAdmin.storage
      .from(BUCKET)
      .info(storagePath);

    if (infoError || !fileInfo) {
      console.error("Supabase file info error:", infoError);

      return errorResponse(
        "Không tìm thấy hoặc không thể kiểm tra PDF trên Supabase",
        400,
      );
    }

    const actualSize = fileInfo.size;

    const actualContentType = fileInfo.contentType
      ?.split(";")[0]
      ?.trim()
      ?.toLowerCase();

    if (
      typeof actualSize !== "number" ||
      !Number.isSafeInteger(actualSize) ||
      actualSize <= 0 ||
      actualSize > MAX_FILE_SIZE
    ) {
      return errorResponse("Dung lượng PDF thực tế không hợp lệ", 400);
    }

    if (actualContentType !== "application/pdf") {
      return errorResponse(
        "File trên Storage không có định dạng PDF hợp lệ",
        400,
      );
    }

    if (actualSize !== fileSize) {
      return errorResponse(
        "Dung lượng file không khớp với dữ liệu đã upload",
        400,
      );
    }

    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error("Supabase PDF verification error:", downloadError);

      return errorResponse("Không thể xác minh nội dung PDF", 502);
    }

    if (fileBlob.size !== actualSize || fileBlob.size > MAX_FILE_SIZE) {
      return errorResponse("Dung lượng PDF thay đổi hoặc không hợp lệ", 400);
    }

    const header = new Uint8Array(await fileBlob.slice(0, 5).arrayBuffer());

    const hasPdfHeader =
      header.length === 5 &&
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46 &&
      header[4] === 0x2d;

    if (!hasPdfHeader) {
      return errorResponse("Nội dung file không phải PDF hợp lệ", 400);
    }

    const document = await prisma.$transaction(async (tx) => {
      const newDocument = await tx.document.create({
        data: {
          title: title.trim(),
          description: normalizedDescription,
          subjectCode: subjectCode.trim(),
          subjectName: subjectName.trim(),

          fileUrl: null,
          storagePath,
          fileName: fileName.trim(),
          fileSize: actualSize,

          copyrightType: copyrightType as CopyrightType,

          sourceUrl: normalizedSourceUrl,
          permissionProofUrl: normalizedPermissionProofUrl,

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

    return NextResponse.json(
      {
        id: document.id,
        status: document.status,
        message: "Đã gửi tài liệu để duyệt",
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse("File này đã được sử dụng cho một tài liệu", 409);
    }

    console.error("Create document error:", error);

    return errorResponse("Không thể tạo tài liệu", 500);
  }
}
