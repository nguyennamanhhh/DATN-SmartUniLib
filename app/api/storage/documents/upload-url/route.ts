import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const BUCKET = "documents";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: Request) {
  try {
    // 1. Kiểm tra người dùng đăng nhập.
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    // 2. Đọc JSON an toàn.
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return errorResponse("Dữ liệu gửi lên không hợp lệ", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const { fileName, fileSize, fileType } = body as Record<string, unknown>;

    // 3. Kiểm tra tên file.
    if (
      typeof fileName !== "string" ||
      !fileName.trim() ||
      fileName.trim().length > MAX_FILE_NAME_LENGTH ||
      !fileName.trim().toLowerCase().endsWith(".pdf")
    ) {
      return errorResponse("Tên file PDF không hợp lệ", 400);
    }

    // 4. Kiểm tra dung lượng.
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

    // 5. Kiểm tra MIME.
    if (fileType !== "application/pdf") {
      return errorResponse("Chỉ chấp nhận file PDF", 400);
    }

    // 6. Backend tự tạo đường dẫn duy nhất.
    const storagePath = `${user.id}/${randomUUID()}.pdf`;

    // 7. Đăng ký phiên upload trong MySQL.
    // PENDING: mới cấp phiên, chưa chắc đã upload.
    const uploadRecord = await prisma.storageUpload.create({
      data: {
        userId: user.id,
        storagePath,
        fileName: fileName.trim(),
        fileSize,
        status: "PENDING",
      },
      select: {
        id: true,
      },
    });

    // 8. Yêu cầu Supabase cấp signed upload URL.
    let signedData: {
      token: string;
    } | null = null;

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

      signedData = {
        token: data.token,
      };
    } catch (error) {
      console.error("Signed upload preparation failed:", error);

      // Không cấp được token: dọn phiên vừa tạo.
      // Token chưa trả cho client, nên phiên này
      // không được sử dụng theo luồng thông thường.
      try {
        await prisma.storageUpload.deleteMany({
          where: {
            id: uploadRecord.id,
            status: "PENDING",
          },
        });
      } catch (cleanupError) {
        console.error("Cannot clean up failed upload session:", cleanupError);

        // Bản ghi còn sót sẽ cần được xử lý
        // bởi quy trình dọn phiên upload.
      }

      return errorResponse("Không thể chuẩn bị upload PDF", 502);
    }

    // 9. Trả thông tin upload cho frontend.
    // Giữ nguyên cấu trúc path/token hiện tại.
    return NextResponse.json(
      {
        path: storagePath,
        token: signedData.token,
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
