import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpenText,
  Download,
  FileText,
  User,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { DocumentComplaintForm } from "@/components/document-complaint-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DocumentDetailPage({
  params,
}: Props) {
  await requireUser();

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: {
      id,
    },
    include: {
      uploader: true,
    },
  });

  if (!document || document.status !== "APPROVED") {
    notFound();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
        {/* Back */}
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-black"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Quay lại thư viện
        </Link>

        {/* Thông tin chính */}
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <FileText className="h-7 w-7 text-gray-700" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="wrap-break-word text-xl font-bold leading-8 sm:text-2xl">
                    {document.title}
                  </h1>

                  <p className="mt-2 wrap-break-word text-sm text-muted-foreground">
                    {document.subjectCode} - {document.subjectName}
                  </p>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={document.status} />
                </div>
              </div>

              {document.description && (
                <p className="mt-5 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-gray-600 sm:text-base">
                  {document.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Metadata */}
        <section className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            icon={BookOpenText}
            label="Môn học"
            value={`${document.subjectCode} - ${document.subjectName}`}
          />

          <InfoCard
            icon={User}
            label="Người tải"
            value={
              document.uploader.fullName ||
              document.uploader.email
            }
            subValue={document.uploader.email}
          />
        </section>

        {/* File */}
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">
            Tệp tài liệu
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Tải xuống tệp PDF đã được kiểm duyệt.
          </p>

          <div className="mt-4 flex flex-col gap-4 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="wrap-break-word font-medium">
                {document.fileName || "Tài liệu PDF"}
              </p>

              {document.fileSize && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>

            <a
              href={`/api/documents/${document.id}/download`}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Tải tài liệu
            </a>
          </div>
        </section>

        {/* Khiếu nại */}
        <DocumentComplaintForm
          documentId={document.id}
        />
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {label}
          </p>

          <p className="mt-1 wrap-break-word font-medium">
            {value}
          </p>

          {subValue && subValue !== value && (
            <p className="mt-1 wrap-break-word text-xs text-muted-foreground">
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}