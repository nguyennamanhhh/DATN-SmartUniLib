import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "documents";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 },
      );
    }

    const { fileName, fileSize, fileType } = body as {
      fileName?: unknown;
      fileSize?: unknown;
      fileType?: unknown;
    };

    if (typeof fileName !== "string" || !fileName.trim()) {
      return NextResponse.json(
        { message: "Tên file không hợp lệ" },
        { status: 400 },
      );
    }

    if (
      typeof fileSize !== "number" ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        { message: "Kích thước file không hợp lệ" },
        { status: 400 },
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          message: "File PDF không được vượt quá 8 MB",
        },
        { status: 400 },
      );
    }

    if (fileType !== "application/pdf") {
      return NextResponse.json(
        {
          message: "Chỉ chấp nhận file PDF",
        },
        { status: 400 },
      );
    }

    const storagePath = `${user.id}/${randomUUID()}.pdf`;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (error || !data) {
      console.error("Create signed upload URL error:", error);

      return NextResponse.json(
        {
          message: "Không thể chuẩn bị đường dẫn tải file",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        path: storagePath,
        token: data.token,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Create document upload URL error:", error);

    return NextResponse.json(
      {
        message: "Không thể chuẩn bị tải file",
      },
      { status: 500 },
    );
  }
}
