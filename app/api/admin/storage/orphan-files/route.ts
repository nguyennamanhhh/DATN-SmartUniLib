import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "documents";
const MIN_AGE_HOURS = 24;
const PAGE_SIZE = 100;

// Giới hạn an toàn cho API kiểm tra.
// Nếu vượt giới hạn, API báo lỗi thay vì
// kết luận sai rằng đã quét toàn bộ.
const MAX_ENTRIES = 3000;

type StorageObject = {
  path: string;
  size: number | null;
  createdAt: string;
  ageHours: number;
};

export async function GET() {
  try {
    // 1. Chỉ ADMIN được phép quét Storage.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // 2. Lấy những storagePath đã có Document.
    // Không lọc status: cả tài liệu REMOVED
    // hoặc REJECTED vẫn cần giữ lại file.
    const documents = await prisma.document.findMany({
      where: {
        storagePath: {
          not: null,
        },
      },
      select: {
        storagePath: true,
      },
    });

    const registeredPaths = new Set(
      documents
        .map((document) => document.storagePath)
        .filter((path): path is string => path !== null),
    );

    // 3. Quét các folder và file trong Supabase.
    const foldersToScan = [""];
    const visitedFolders = new Set<string>();

    const orphanFiles: StorageObject[] = [];

    let totalFiles = 0;
    let registeredFiles = 0;
    let tooRecentFiles = 0;
    let unknownAgeFiles = 0;
    let entriesScanned = 0;

    const now = Date.now();
    const minimumAgeMs = MIN_AGE_HOURS * 60 * 60 * 1000;

    while (foldersToScan.length > 0) {
      const folder = foldersToScan.shift()!;

      if (visitedFolders.has(folder)) {
        continue;
      }

      visitedFolders.add(folder);

      let offset = 0;

      while (true) {
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET)
          .list(folder, {
            limit: PAGE_SIZE,
            offset,
            sortBy: {
              column: "name",
              order: "asc",
            },
          });

        if (error || !data) {
          console.error("Supabase list error:", error);

          return NextResponse.json(
            {
              message: "Không thể đọc đầy đủ danh sách Storage",
            },
            { status: 502 },
          );
        }

        entriesScanned += data.length;

        if (entriesScanned > MAX_ENTRIES) {
          return NextResponse.json(
            {
              message:
                "Danh sách Storage vượt giới hạn quét. Cần sử dụng chức năng phân trang nâng cao.",
            },
            { status: 413 },
          );
        }

        for (const item of data) {
          const path = folder ? `${folder}/${item.name}` : item.name;

          // Supabase trả id=null cho folder.
          if (item.id === null) {
            foldersToScan.push(path);
            continue;
          }

          totalFiles++;

          // File đã có Document → tuyệt đối không
          // đưa vào danh sách dọn.
          if (registeredPaths.has(path)) {
            registeredFiles++;
            continue;
          }

          const createdAt = item.created_at;

          if (!createdAt) {
            unknownAgeFiles++;
            continue;
          }

          const createdMs = Date.parse(createdAt);

          if (!Number.isFinite(createdMs) || createdMs > now) {
            unknownAgeFiles++;
            continue;
          }

          const ageMs = now - createdMs;

          if (ageMs < minimumAgeMs) {
            tooRecentFiles++;
            continue;
          }

          const metadataSize = item.metadata?.size;

          orphanFiles.push({
            path,
            size: typeof metadataSize === "number" ? metadataSize : null,
            createdAt,
            ageHours: Math.floor(ageMs / (60 * 60 * 1000)),
          });
        }

        if (data.length < PAGE_SIZE) {
          break;
        }

        offset += PAGE_SIZE;
      }
    }

    // 4. Chỉ trả danh sách xem trước.
    // API KHÔNG xóa hay thay đổi file.
    orphanFiles.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return NextResponse.json(
      {
        message: "Quét Storage thành công",
        mode: "DRY_RUN",
        bucket: BUCKET,
        minimumAgeHours: MIN_AGE_HOURS,
        summary: {
          totalFiles,
          registeredFiles,
          tooRecentFiles,
          unknownAgeFiles,
          orphanCount: orphanFiles.length,
          foldersScanned: visitedFolders.size,
        },
        orphanFiles,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Scan orphan files error:", error);

    return NextResponse.json(
      {
        message: "Không thể kiểm tra file mồ côi",
      },
      { status: 500 },
    );
  }
}
