import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "documents";
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

const FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

class DeleteConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeleteConflictError";
  }
}

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

function isValidStoragePath(path: string) {
  const parts = path.split("/");

  return (
    parts.length === 2 &&
    /^user_[A-Za-z0-9_-]+$/.test(parts[0]) &&
    FILE_NAME_PATTERN.test(parts[1])
  );
}

async function recordDeleteFailure(
  path: string,
  actorId: string,
  message: string,
) {
  try {
    await prisma.storageCleanupLog.create({
      data: {
        storagePath: path,
        actorId,
        action: "DELETE_FAILED",
        uploadStatus: "DELETING",
        message,
      },
    });
  } catch (logError) {
    console.error("Cannot record StorageCleanupLog failure:", logError);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return respond("Unauthorized", 401);
    }

    if (user.role !== "ADMIN") {
      return respond("Forbidden", 403);
    }

    if (process.env.ENABLE_ORPHAN_DELETE !== "true") {
      return respond("Chức năng xóa thật chưa được kích hoạt", 403);
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

    const { path, confirmation } = body as Record<string, unknown>;

    if (typeof path !== "string" || !isValidStoragePath(path)) {
      return respond("Đường dẫn file không hợp lệ", 400);
    }

    if (confirmation !== `DELETE:${path}`) {
      return respond("Chưa xác nhận xóa file", 400);
    }

    const session = await prisma.storageUpload.findUnique({
      where: {
        storagePath: path,
      },
      select: {
        id: true,
        status: true,
        documentId: true,
        createdAt: true,
      },
    });

    if (!session) {
      return respond(
        "File chưa có phiên StorageUpload. Cần đối chiếu dữ liệu cũ trước khi xóa.",
        409,
      );
    }

    if (session.status !== "PENDING" || session.documentId !== null) {
      return respond("Phiên upload không còn ở trạng thái cho phép dọn", 409);
    }

    const cutoff = new Date(Date.now() - MIN_AGE_MS);

    if (session.createdAt > cutoff) {
      return respond("Phiên upload chưa đủ 24 giờ", 409);
    }

    const existing = await prisma.document.findUnique({
      where: {
        storagePath: path,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return respond("File đang được sử dụng bởi tài liệu", 409);
    }

    const slashIndex = path.lastIndexOf("/");
    const folder = path.slice(0, slashIndex);
    const fileName = path.slice(slashIndex + 1);

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(folder, {
        limit: 100,
        search: fileName,
      });

    if (error || !data) {
      console.error("Storage list error:", error);

      return respond("Không thể kiểm tra file trên Storage", 502);
    }

    const target = data.find(
      (item) => item.id !== null && item.name === fileName,
    );

    if (!target) {
      return respond("Không tìm thấy file trên Supabase", 404);
    }

    if (!target.created_at) {
      return respond("Không xác định được tuổi file", 409);
    }

    const createdAt = Date.parse(target.created_at);

    const now = Date.now();

    if (
      !Number.isFinite(createdAt) ||
      createdAt > now ||
      now - createdAt < MIN_AGE_MS
    ) {
      return respond("File chưa đủ 24 giờ để dọn", 409);
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const claim = await tx.storageUpload.updateMany({
            where: {
              id: session.id,
              storagePath: path,
              status: "PENDING",
              documentId: null,
              createdAt: {
                lte: cutoff,
              },
            },
            data: {
              status: "DELETING",
            },
          });

          if (claim.count !== 1) {
            throw new DeleteConflictError(
              "Phiên upload đã được xử lý bởi yêu cầu khác",
            );
          }

          const linkedDocument = await tx.document.findUnique({
            where: {
              storagePath: path,
            },
            select: {
              id: true,
            },
          });

          if (linkedDocument) {
            throw new DeleteConflictError("File vừa được đăng ký vào tài liệu");
          }

          await tx.storageCleanupLog.create({
            data: {
              storagePath: path,
              actorId: user.id,
              action: "DELETE_REQUESTED",
              uploadStatus: "DELETING",
              message: "ADMIN yêu cầu xóa PDF mồ côi",
            },
          });
        },
        {
          maxWait: 10000,
          timeout: 10000,
        },
      );
    } catch (error) {
      if (error instanceof DeleteConflictError) {
        return respond(error.message, 409);
      }

      throw error;
    }

    let deletionConfirmed = false;
    let deletionFailureMessage = "";

    try {
      const { data: deletedFiles, error: deleteError } =
        await supabaseAdmin.storage.from(BUCKET).remove([path]);

      if (deleteError) {
        console.error("Supabase delete error:", deleteError);

        deletionFailureMessage = "Supabase trả về lỗi khi xóa file";
      } else if (
        !deletedFiles ||
        !deletedFiles.some(
          (item) => item.name === path || item.name === fileName,
        )
      ) {
        deletionFailureMessage = "Supabase không xác nhận đúng file đã xóa";
      } else {
        deletionConfirmed = true;
      }
    } catch (storageError) {
      console.error("Supabase delete exception:", storageError);

      deletionFailureMessage = "Lỗi kết nối hoặc ngoại lệ khi xóa Supabase";
    }

    if (!deletionConfirmed) {
      await recordDeleteFailure(path, user.id, deletionFailureMessage);

      return respond(
        "Chưa xác nhận được kết quả xóa. Phiên được giữ ở DELETING để đối soát.",
        502,
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.storageUpload.updateMany({
          where: {
            id: session.id,
            storagePath: path,
            status: "DELETING",
            documentId: null,
          },
          data: {
            status: "DELETED",
            deletedAt: new Date(),
          },
        });

        if (updated.count !== 1) {
          throw new DeleteConflictError(
            "Không thể xác nhận trạng thái DELETED",
          );
        }

        await tx.storageCleanupLog.create({
          data: {
            storagePath: path,
            actorId: user.id,
            action: "DELETE_SUCCEEDED",
            uploadStatus: "DELETED",
            message: "Đã xóa PDF mồ côi và hoàn tất trạng thái MySQL",
          },
        });
      });
    } catch (finalizeError) {
      console.error("Cannot finalize orphan deletion:", finalizeError);

      await recordDeleteFailure(
        path,
        user.id,
        "Supabase báo xóa thành công nhưng MySQL chưa hoàn tất. Cần đối soát.",
      );

      return respond(
        "File đã được xử lý trên Supabase nhưng MySQL chưa xác nhận thành công. Cần đối soát.",
        500,
      );
    }

    console.info("Orphan file deleted", {
      actorId: user.id,
      uploadId: session.id,
      path,
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        message: "Đã xóa file mồ côi",
        deletedPath: path,
        status: "DELETED",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return respond(
        "Có giao dịch đồng thời. Vui lòng kiểm tra lại trạng thái file.",
        409,
      );
    }

    console.error("Delete orphan file error:", error);

    return respond("Lỗi xử lý yêu cầu xóa", 500);
  }
}
