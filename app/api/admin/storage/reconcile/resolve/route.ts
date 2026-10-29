import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "documents";

const PDF_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

type Finding = "FILE_STILL_EXISTS" | "FILE_MISSING";

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

function isValidStoragePath(path: string): boolean {
  const parts = path.split("/");

  return (
    parts.length === 2 &&
    /^user_[A-Za-z0-9_-]+$/.test(parts[0]) &&
    PDF_NAME_PATTERN.test(parts[1])
  );
}

function isMissingStorageObject(error: {
  statusCode?: string;
  message: string;
}): boolean {
  if (error.statusCode === "NoSuchKey") {
    return true;
  }

  return (
    error.statusCode === "404" &&
    error.message.trim().toLowerCase() === "object not found"
  );
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return respond("Unauthorized", 401);
    }

    if (user.role !== "ADMIN") {
      return respond("Forbidden", 403);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return respond("JSON không hợp lệ", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respond("Dữ liệu không hợp lệ", 400);
    }

    const { path, confirmation, expectedFinding } = body as Record<
      string,
      unknown
    >;

    if (typeof path !== "string" || !isValidStoragePath(path)) {
      return respond("Đường dẫn Storage không hợp lệ", 400);
    }

    if (confirmation !== `RECONCILE:${path}`) {
      return respond("Chưa xác nhận đối soát", 400);
    }

    if (
      expectedFinding !== "FILE_STILL_EXISTS" &&
      expectedFinding !== "FILE_MISSING"
    ) {
      return respond("Kết quả đối soát mong đợi không hợp lệ", 400);
    }

    const session = await prisma.storageUpload.findUnique({
      where: {
        storagePath: path,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        documentId: true,
      },
    });

    if (!session) {
      return respond("Không tìm thấy phiên StorageUpload", 404);
    }

    if (session.userId !== path.split("/")[0]) {
      return respond("Đường dẫn không khớp chủ sở hữu phiên", 409);
    }

    if (session.status !== "DELETING") {
      return respond("Phiên không còn ở trạng thái DELETING", 409);
    }

    const linkedDocument = await prisma.document.findUnique({
      where: {
        storagePath: path,
      },
      select: {
        id: true,
      },
    });

    if (linkedDocument || session.documentId !== null) {
      return respond("File có liên kết Document, cần kiểm tra riêng", 409);
    }

    const { data, error } = await supabaseAdmin.storage.from(BUCKET).info(path);

    let finding: Finding;

    if (error) {
      if (!isMissingStorageObject(error)) {
        console.error("Reconcile Storage check error:", {
          path,
          statusCode: error.statusCode,
          message: error.message,
        });

        return respond("Không thể xác minh trạng thái file trên Supabase", 502);
      }

      finding = "FILE_MISSING";
    } else if (data) {
      finding = "FILE_STILL_EXISTS";
    } else {
      return respond("Supabase không cung cấp kết quả xác minh", 502);
    }

    if (finding !== expectedFinding) {
      return respond("Trạng thái file đã thay đổi. Hãy đối soát lại.", 409);
    }

    const log = await prisma.$transaction(async (tx) => {
      const current = await tx.storageUpload.findUnique({
        where: {
          id: session.id,
        },
        select: {
          status: true,
          documentId: true,
        },
      });

      if (
        !current ||
        current.status !== "DELETING" ||
        current.documentId !== null
      ) {
        return null;
      }

      const documentInTransaction = await tx.document.findUnique({
        where: {
          storagePath: path,
        },
        select: {
          id: true,
        },
      });

      if (documentInTransaction) {
        return null;
      }

      return tx.storageCleanupLog.create({
        data: {
          storagePath: path,
          actorId: user.id,
          action: "RECONCILED",
          uploadStatus: "DELETING",
          message:
            finding === "FILE_STILL_EXISTS"
              ? "Đối soát: PDF vẫn tồn tại trên Supabase. Chưa thay đổi trạng thái."
              : "Đối soát: Supabase báo không tìm thấy PDF. Chưa thay đổi trạng thái.",
        },
        select: {
          id: true,
          createdAt: true,
        },
      });
    });

    if (!log) {
      return respond(
        "Dữ liệu MySQL đã thay đổi. Không ghi nhận kết quả đối soát.",
        409,
      );
    }

    return NextResponse.json(
      {
        message: "Đã ghi nhận kết quả đối soát",
        mode: "LOG_ONLY",
        storagePath: path,
        finding,
        uploadStatus: "DELETING",
        logId: log.id,
        loggedAt: log.createdAt,
        fileDeleted: false,
        stateChanged: false,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Resolve Storage reconciliation error:", error);

    return respond("Không thể ghi nhận kết quả đối soát", 500);
  }
}
