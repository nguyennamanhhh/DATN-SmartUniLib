import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "documents";
const MIN_AGE_HOURS = 24;
const PAGE_SIZE = 100;
const MAX_ENTRIES = 3000;

const HOUR_MS = 60 * 60 * 1000;
const MIN_AGE_MS = MIN_AGE_HOURS * HOUR_MS;

const FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

type StorageObject = {
  path: string;
  size: number | null;
  createdAt: string;
  ageHours: number;
};

type ReviewReason =
  | "NO_UPLOAD_SESSION"
  | "DELETING"
  | "DELETED_BUT_EXISTS"
  | "REGISTERED_WITHOUT_DOCUMENT"
  | "INCONSISTENT_SESSION"
  | "INVALID_PATH"
  | "UNKNOWN_FILE_AGE"
  | "INVALID_SESSION_AGE";

type ReviewItem = {
  path: string;
  reason: ReviewReason;
  uploadStatus: string | null;
};

function isValidStoragePath(path: string, userId: string): boolean {
  const parts = path.split("/");

  return (
    parts.length === 2 &&
    parts[0] === userId &&
    /^user_[A-Za-z0-9_-]+$/.test(parts[0]) &&
    FILE_NAME_PATTERN.test(parts[1])
  );
}

function errorResponse(message: string, status: number) {
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

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

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

    const uploadSessions = await prisma.storageUpload.findMany({
      select: {
        id: true,
        storagePath: true,
        userId: true,
        status: true,
        documentId: true,
        createdAt: true,
      },
    });

    const sessionByPath = new Map(
      uploadSessions.map((session) => [session.storagePath, session]),
    );

    const foldersToScan = [""];
    const visitedFolders = new Set<string>();

    const orphanFiles: StorageObject[] = [];

    const reviewItems: ReviewItem[] = [];

    let totalFiles = 0;
    let registeredFiles = 0;
    let protectedUploadFiles = 0;
    let tooRecentFiles = 0;
    let unknownAgeFiles = 0;
    let missingSessionFiles = 0;
    let deletingFiles = 0;
    let deletedButExistsFiles = 0;
    let inconsistentFiles = 0;
    let entriesScanned = 0;

    const now = Date.now();
    const cutoffMs = now - MIN_AGE_MS;

    function addReview(
      path: string,
      reason: ReviewReason,
      uploadStatus: string | null,
    ) {
      reviewItems.push({
        path,
        reason,
        uploadStatus,
      });
    }

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

          return errorResponse("Không thể đọc đầy đủ danh sách Storage", 502);
        }

        entriesScanned += data.length;

        if (entriesScanned > MAX_ENTRIES) {
          return errorResponse(
            "Danh sách Storage vượt giới hạn quét. Cần sử dụng chức năng phân trang nâng cao.",
            413,
          );
        }

        for (const item of data) {
          const path = folder ? `${folder}/${item.name}` : item.name;

          if (item.id === null) {
            foldersToScan.push(path);
            continue;
          }

          totalFiles++;

          if (registeredPaths.has(path)) {
            registeredFiles++;
            continue;
          }

          const session = sessionByPath.get(path);

          if (!session) {
            missingSessionFiles++;

            addReview(path, "NO_UPLOAD_SESSION", null);

            continue;
          }

          if (session.status === "REGISTERED") {
            protectedUploadFiles++;

            inconsistentFiles++;

            addReview(path, "REGISTERED_WITHOUT_DOCUMENT", session.status);

            continue;
          }

          if (session.status === "DELETING") {
            deletingFiles++;

            addReview(path, "DELETING", session.status);

            continue;
          }

          if (session.status === "DELETED") {
            deletedButExistsFiles++;

            addReview(path, "DELETED_BUT_EXISTS", session.status);

            continue;
          }

          if (session.status !== "PENDING") {
            inconsistentFiles++;

            addReview(path, "INCONSISTENT_SESSION", session.status);

            continue;
          }

          if (
            session.documentId !== null ||
            !isValidStoragePath(path, session.userId)
          ) {
            inconsistentFiles++;

            addReview(path, "INCONSISTENT_SESSION", session.status);

            continue;
          }

          const createdAt = item.created_at;

          if (!createdAt) {
            unknownAgeFiles++;

            addReview(path, "UNKNOWN_FILE_AGE", session.status);

            continue;
          }

          const createdMs = Date.parse(createdAt);

          if (!Number.isFinite(createdMs) || createdMs > now) {
            unknownAgeFiles++;

            addReview(path, "UNKNOWN_FILE_AGE", session.status);

            continue;
          }

          const sessionCreatedMs = session.createdAt.getTime();

          if (
            !Number.isFinite(sessionCreatedMs) ||
            sessionCreatedMs > now ||
            createdMs < sessionCreatedMs
          ) {
            inconsistentFiles++;

            addReview(path, "INVALID_SESSION_AGE", session.status);

            continue;
          }

          if (createdMs > cutoffMs || sessionCreatedMs > cutoffMs) {
            tooRecentFiles++;
            continue;
          }

          const metadataSize = item.metadata?.size;

          orphanFiles.push({
            path,
            size: typeof metadataSize === "number" ? metadataSize : null,
            createdAt,
            ageHours: Math.floor((now - createdMs) / HOUR_MS),
          });
        }

        if (data.length < PAGE_SIZE) {
          break;
        }

        offset += PAGE_SIZE;
      }
    }

    orphanFiles.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    reviewItems.sort((a, b) => a.path.localeCompare(b.path));

    return NextResponse.json(
      {
        message: "Quét Storage thành công",
        mode: "DRY_RUN",
        bucket: BUCKET,
        minimumAgeHours: MIN_AGE_HOURS,

        summary: {
          totalFiles,
          registeredFiles,
          protectedUploadFiles,
          tooRecentFiles,
          unknownAgeFiles,
          missingSessionFiles,
          deletingFiles,
          deletedButExistsFiles,
          inconsistentFiles,
          orphanCount: orphanFiles.length,
          reviewCount: reviewItems.length,
          foldersScanned: visitedFolders.size,
        },

        orphanFiles,
        reviewItems,
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

    return errorResponse("Không thể kiểm tra file mồ côi", 500);
  }
}
