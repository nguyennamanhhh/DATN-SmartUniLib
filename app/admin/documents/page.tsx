import Link from "next/link";
import {
  CalendarDays,
  FileCheck2,
  User,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminDocumentsPage() {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const documents = await prisma.document.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      uploader: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <PageHeader
          title="Tài liệu chờ duyệt"
          description="Kiểm tra và xử lý các tài liệu đang chờ phê duyệt."
        />

        {documents.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="Không có tài liệu chờ duyệt"
            description="Các tài liệu mới được tải lên sẽ xuất hiện tại đây."
          />
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-4 md:hidden">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-xl border bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold">
                        {document.title}
                      </h2>

                      {document.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {document.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <StatusBadge status={document.status} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Môn học
                      </p>

                      <p className="mt-1 font-medium">
                        {document.subjectCode}
                      </p>

                      <p className="text-sm text-gray-600">
                        {document.subjectName}
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />

                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Người tải
                        </p>

                        <p className="mt-1 wrap-break-word font-medium">
                          {document.uploader.fullName ||
                            document.uploader.email}
                        </p>

                        <p className="wrap-break-word text-xs text-muted-foreground">
                          {document.uploader.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ngày tải
                        </p>

                        <p className="mt-1 font-medium">
                          {document.createdAt.toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/documents/${document.id}`}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                  >
                    Xem chi tiết
                  </Link>
                </article>
              ))}
            </div>

            {/* Desktop / Tablet */}
            <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-225 text-left text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-5 py-4 font-medium text-gray-600">
                        Tài liệu
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Môn học
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Người tải
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Trạng thái
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Ngày tải
                      </th>

                      <th className="px-5 py-4 text-right font-medium text-gray-600">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {documents.map((document) => (
                      <tr
                        key={document.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="max-w-xs">
                            <p className="font-medium">
                              {document.title}
                            </p>

                            {document.description && (
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                {document.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          <div>
                            <p className="font-medium text-gray-800">
                              {document.subjectCode}
                            </p>

                            <p className="mt-1 text-xs">
                              {document.subjectName}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium">
                              {document.uploader.fullName ||
                                document.uploader.email}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {document.uploader.email}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={document.status}
                          />
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {document.createdAt.toLocaleString(
                            "vi-VN",
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/documents/${document.id}`}
                            className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                          >
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}