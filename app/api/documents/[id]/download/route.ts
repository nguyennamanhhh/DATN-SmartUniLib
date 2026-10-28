import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const BUCKET = "documents";
const SIGNED_URL_EXPIRES_IN = 300; // 5 phút

const STAFF_ROLES = ["ADMIN", "LIBRARIAN"];

/**
 * Chỉ hỗ trợ URL UploadThing cũ.
 * Không redirect tới URL bất kỳ từ database.
 */
function isAllowedLegacyUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    return (
      hostname === "utfs.io" ||
      hostname === "ufs.sh" ||
      hostname.endsWith(".ufs.sh")
    );
  } catch {
    return false;
  }
}

function redirectWithoutCache(url: string) {
  const response = NextResponse.redirect(url, 302);

  response.headers.set("Cache-Control", "private, no-store, max-age=0");

  response.headers.set("Pragma", "no-cache");

  return response;
}

export async function GET(_req: Request, { params }: Props) {
  try {
    // 1. Authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate document ID
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          message: "ID tài liệu không hợp lệ",
        },
        { status: 400 },
      );
    }

    // 3. Lấy thông tin file và trạng thái tài liệu
    const document = await prisma.document.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
        storagePath: true,
        fileUrl: true,
        fileName: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        {
          message: "Không tìm thấy tài liệu",
        },
        { status: 404 },
      );
    }

    // 4. Authorization
    const isStaff = STAFF_ROLES.includes(user.role);

    if (!isStaff && document.status !== "APPROVED") {
      return NextResponse.json(
        {
          message: "Bạn không có quyền truy cập tài liệu này",
        },
        { status: 403 },
      );
    }

    // 5. Tài liệu mới: Supabase private Storage
    if (document.storagePath) {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(document.storagePath, SIGNED_URL_EXPIRES_IN);

      if (error || !data?.signedUrl) {
        console.error("Create Supabase signed URL error:", error);

        return NextResponse.json(
          {
            message: "Không thể mở file PDF",
          },
          { status: 502 },
        );
      }

      // Không trả token về JSON.
      // Chỉ redirect sau khi đã kiểm tra quyền.
      return redirectWithoutCache(data.signedUrl);
    }

    // 6. Tài liệu cũ: UploadThing
    if (document.fileUrl) {
      if (!isAllowedLegacyUrl(document.fileUrl)) {
        console.error("Invalid legacy document URL:", document.id);

        return NextResponse.json(
          {
            message: "Đường dẫn tài liệu không hợp lệ",
          },
          { status: 500 },
        );
      }

      return redirectWithoutCache(document.fileUrl);
    }

    // 7. Không có file
    return NextResponse.json(
      {
        message: "Tài liệu chưa có file hợp lệ",
      },
      { status: 404 },
    );
  } catch (error) {
    console.error("Download document error:", error);

    return NextResponse.json(
      {
        message: "Không thể mở tài liệu",
      },
      { status: 500 },
    );
  }
}
