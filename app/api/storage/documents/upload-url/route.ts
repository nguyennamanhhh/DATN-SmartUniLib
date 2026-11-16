import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const BUCKET = "documents";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

/**
 * Trả về thông báo lỗi theo định dạng JSON.
 */
function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

/**
 * Kiểm tra tên file PDF.
 *
 * Điều kiện:
 * - Phải là chuỗi.
 * - Không được rỗng.
 * - Tối đa 255 ký tự.
 * - Phải có phần mở rộng .pdf.
 * - Không chứa dấu phân cách đường dẫn.
 * - Không chứa ký tự điều khiển.
 */
function isValidPdfFileName(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const name = value.trim();

  if (
    name.length === 0 ||
    name.length > MAX_FILE_NAME_LENGTH ||
    !name.toLowerCase().endsWith(".pdf")
  ) {
    return false;
  }

  // Chặn dấu phân cách đường dẫn và ký tự điều khiển.
  if (/[/\\\x00-\x1F\x7F]/.test(name)) {
    return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    /*
     * 1. Authentication
     * Kiểm tra tài khoản đã đăng nhập.
     */
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    /*
     * 2. Parse JSON
     * Đọc và kiểm tra request body.
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

    const { fileName, fileSize, fileType } = body as Record<string, unknown>;

    /*
     * 3. Validate file name
     * Kiểm tra tên file bằng hàm riêng.
     */
    if (!isValidPdfFileName(fileName)) {
      return errorResponse("Tên file PDF không hợp lệ", 400);
    }

    const normalizedFileName = fileName.trim();

    /*
     * 4. Validate file size
     * Tối đa 8 MB.
     */
    if (
      typeof fileSize !== "number" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return errorResponse(
        "Dung lượng PDF phải lớn hơn 0 và không vượt quá 8 MB",
        400,
      );
    }

    /*
     * 5. Validate MIME type
     * Đây là kiểm tra ban đầu.
     * API /api/documents sẽ xác minh nội dung PDF.
     */
    if (fileType !== "application/pdf") {
      return errorResponse("Chỉ chấp nhận file PDF", 400);
    }

    /*
     * 6. Generate storage path
     *
     * Backend tự tạo đường dẫn ngẫu nhiên.
     * Không sử dụng tên file của người dùng làm path.
     *
     * Ví dụ:
     * userId/uuid.pdf
     */
    const storagePath = `${user.id}/${randomUUID()}.pdf`;

    /*
     * 7. Create upload session
     *
     * PENDING:
     * Phiên upload vừa được tạo.
     * Chưa chắc PDF đã được gửi lên Supabase.
     */
    const uploadRecord = await prisma.storageUpload.create({
      data: {
        userId: user.id,
        storagePath,
        fileName: normalizedFileName,
        fileSize,
        status: "PENDING",
      },
      select: {
        id: true,
      },
    });

    /*
     * 8. Create signed upload URL
     *
     * Supabase cấp token để frontend
     * upload PDF vào đúng storagePath.
     *
     * upsert: false nhằm không cho phép
     * ghi đè file đã tồn tại qua token này.
     */
    let uploadToken: string;

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUploadUrl(storagePath, {
          upsert: false,
        });

      if (error || !data?.token) {
        console.error("Create signed upload URL error:", error);

        throw new Error("Supabase không cấp được upload token");
      }

      uploadToken = data.token;
    } catch (error) {
      console.error("Signed upload preparation failed:", error);

      /*
       * 9. Cleanup failed session
       *
       * Nếu không cấp được token,
       * xóa phiên PENDING vừa tạo.
       *
       * Nếu cleanup lỗi, bản ghi còn sót
       * sẽ cần được dọn bởi quy trình
       * xử lý phiên upload bỏ dở.
       */
      try {
        await prisma.storageUpload.deleteMany({
          where: {
            id: uploadRecord.id,
            status: "PENDING",
            documentId: null,
          },
        });
      } catch (cleanupError) {
        console.error("Cannot clean up failed upload session:", cleanupError);
      }

      return errorResponse("Không thể chuẩn bị upload PDF", 502);
    }

    /*
     * 10. Success response
     *
     * Giữ nguyên cấu trúc path/token
     * để tương thích với frontend hiện tại.
     */
    return NextResponse.json(
      {
        path: storagePath,
        token: uploadToken,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Create document upload URL error:", error);

    return errorResponse("Không thể chuẩn bị tải file", 500);
  }
}
