import Link from "next/link";
import {
  BookOpenText,
  FileText,
  User,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

export default async function DocumentsPage() {
  await requireUser();

  const documents = await prisma.document.findMany({
    where: {
      status: "APPROVED",
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
          title="Thư viện số"
          description="Khám phá các tài liệu đã được kiểm duyệt và chia sẻ trên hệ thống."
        />

        {documents.length === 0 ? (
          <EmptyState
            icon={BookOpenText}
            title="Chưa có tài liệu"
            description="Hiện tại chưa có tài liệu nào đã được duyệt."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => (
              <article
                key={document.id}
                className="flex min-w-0 flex-col rounded-xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              >
                {/* Icon + trạng thái */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <FileText className="h-6 w-6 text-gray-700" />
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={document.status} />
                  </div>
                </div>

                {/* Nội dung */}
                <div className="mt-5 min-w-0 flex-1">
                  <h2 className="line-clamp-2 wrap-break-word text-lg font-semibold">
                    {document.title}
                  </h2>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">
                      Môn học
                    </p>

                    <p className="mt-1 wrap-break-word text-sm font-medium">
                      {document.subjectCode} - {document.subjectName}
                    </p>
                  </div>

                  <div className="mt-4 flex min-w-0 items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />

                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Người tải
                      </p>

                      <p className="mt-1 wrap-break-word text-sm font-medium">
                        {document.uploader.fullName ||
                          document.uploader.email}
                      </p>
                    </div>
                  </div>

                  {document.description && (
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                      {document.description}
                    </p>
                  )}
                </div>

                {/* Action */}
                <Link
                  href={`/documents/${document.id}`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Xem tài liệu
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}