import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "documents";
const MAX_SESSIONS = 500;

function respond(message: string, status: number) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isMissingStorageObject(error: {
  statusCode?: string;
  message: string;
}): boolean {
  // Mã lỗi Storage mới.
  if (error.statusCode === "NoSuchKey") {
    return true;
  }

  // Một số phiên bản Storage cũ trả về
  // statusCode = "404" và thông báo này.
  if (
    error.statusCode === "404" &&
    error.message.trim().toLowerCase() === "object not found"
  ) {
    return true;
  }

  // Các lỗi khác, kể cả NoSuchBucket,
  // không được xem là PDF đã bị xóa.
  return false;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return respond("Unauthorized", 401);
    }

    if (user.role !== "ADMIN") {
      return respond("Forbidden", 403);
    }

    // Chặn quét không đầy đủ nếu dữ liệu vượt giới hạn.
    const sessions = await prisma.storageUpload.findMany({
      where: {
        status: "DELETING",
      },
      select: {
        id: true,
        storagePath: true,
        userId: true,
        documentId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "asc",
      },
      take: MAX_SESSIONS + 1,
    });

    if (sessions.length > MAX_SESSIONS) {
      return respond("Số phiên DELETING vượt giới hạn kiểm tra", 413);
    }

    const results = [];

    for (const session of sessions) {
      const linkedDocument = await prisma.document.findUnique({
        where: {
          storagePath: session.storagePath,
        },
        select: {
          id: true,
        },
      });

      // Document luôn được ưu tiên bảo vệ.
      if (linkedDocument || session.documentId !== null) {
        results.push({
          storagePath: session.storagePath,
          status: "DELETING",
          finding: "LINKED_DOCUMENT",
          fileExists: null,
          requiresReview: true,
        });

        continue;
      }

      // Kiểm tra trực tiếp file cụ thể.
      // Không suy luận từ danh sách phân trang.
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .info(session.storagePath);

      if (error) {
        if (isMissingStorageObject(error)) {
          results.push({
            storagePath: session.storagePath,
            status: "DELETING",
            finding: "FILE_MISSING",
            fileExists: false,
            requiresReview: true,
          });

          continue;
        }

        console.error("Storage reconciliation error:", {
          path: session.storagePath,
          statusCode: error.statusCode,
          message: error.message,
        });

        results.push({
          storagePath: session.storagePath,
          status: "DELETING",
          finding: "STORAGE_CHECK_FAILED",
          fileExists: null,
          requiresReview: true,
          errorCode: error.statusCode ?? null,
        });

        continue;
      }

      results.push({
        storagePath: session.storagePath,
        status: "DELETING",
        finding: data ? "FILE_STILL_EXISTS" : "STORAGE_CHECK_FAILED",
        fileExists: data ? true : null,
        requiresReview: true,
      });
    }

    return NextResponse.json(
      {
        message: "Đối soát Storage hoàn tất",
        mode: "READ_ONLY",
        bucket: BUCKET,
        summary: {
          deletingSessions: sessions.length,
          requireReview: results.length,
        },
        results,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Storage reconciliation error:", error);

    return respond("Không thể đối soát Storage", 500);
  }
}
