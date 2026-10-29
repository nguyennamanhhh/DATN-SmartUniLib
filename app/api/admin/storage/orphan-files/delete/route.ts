import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const BUCKET = "documents";
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

function respond(message: string, status: number) {
  return NextResponse.json({ message }, { status });
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

    // Chủ động khóa xóa thật trong giai đoạn kiểm thử.
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

    if (
      typeof path !== "string" ||
      !/^user_[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.pdf$/i.test(path) ||
      path.includes("..")
    ) {
      return respond("Đường dẫn file không hợp lệ", 400);
    }

    if (confirmation !== `DELETE:${path}`) {
      return respond("Chưa xác nhận xóa file", 400);
    }

    // Không xóa file đang được một Document sử dụng.
    const existing = await prisma.document.findUnique({
      where: { storagePath: path },
      select: { id: true },
    });

    if (existing) {
      return respond("File đang được sử dụng bởi tài liệu", 409);
    }

    // Tìm đúng file trong folder của người upload.
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

      return respond("Không thể kiểm tra file", 502);
    }

    const target = data.find(
      (item) => item.id !== null && item.name === fileName,
    );

    if (!target) {
      return respond("Không tìm thấy file", 404);
    }

    if (!target.created_at) {
      return respond("Không xác định được tuổi file", 409);
    }

    const createdAt = Date.parse(target.created_at);

    if (
      !Number.isFinite(createdAt) ||
      createdAt > Date.now() ||
      Date.now() - createdAt < MIN_AGE_MS
    ) {
      return respond("File chưa đủ 24 giờ để dọn", 409);
    }

    // Kiểm tra lại ngay trước thao tác xóa.
    const registered = await prisma.document.findUnique({
      where: { storagePath: path },
      select: { id: true },
    });

    if (registered) {
      return respond("File vừa được đăng ký vào Document", 409);
    }

    const { error: deleteError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([path]);

    if (deleteError) {
      console.error("Delete orphan file error:", deleteError);

      return respond("Không thể xóa file", 502);
    }

    console.info("Orphan file deletion", {
      actorId: user.id,
      path,
      deletedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Đã gửi yêu cầu xóa file thành công",
      deletedPath: path,
    });
  } catch (error) {
    console.error("Delete orphan file error:", error);

    return respond("Lỗi xử lý yêu cầu xóa", 500);
  }
}
