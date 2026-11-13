import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  BookOpenText,
  CalendarDays,
  ChevronRight,
  Download,
  FileText,
  HardDrive,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DocumentComplaintForm } from "@/components/document-complaint-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes < 0) {
    return "Không xác định";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

  const uploaderName =
    document.uploader.fullName ||
    document.uploader.email;

  const downloadUrl =
    `/api/documents/${encodeURIComponent(document.id)}/download`;

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Đường dẫn trang"
          className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
        >
          <Link
            href="/documents"
            className="transition hover:text-blue-700"
          >
            Thư viện số
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="font-medium text-slate-700">
            Chi tiết tài liệu
          </span>
        </nav>

        {/* Nút quay lại */}
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 transition hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại thư viện
        </Link>

        {/* Thông tin tài liệu chính */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 p-5 sm:p-7 md:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 lg:p-9">
            {/* Bìa PDF */}
            <div className="mx-auto w-full max-w-[300px] md:max-w-none">
              <div className="relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#17468D] via-[#1768C4] to-[#03A7CE] p-6 text-white shadow-lg">
                {/* Họa tiết bìa */}
                <div className="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full border-[28px] border-white/10" />
                <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full border-[36px] border-white/10" />

                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
                    <FileText className="h-10 w-10" />
                  </div>

                  <p className="text-sm font-bold tracking-[0.2em]">
                    SMARTUNILIB
                  </p>

                  <p className="mt-2 text-xs text-blue-100">
                    DIGITAL LIBRARY
                  </p>

                  <div className="mt-6 max-w-full rounded-full border border-white/30 bg-white/20 px-4 py-2">
                    <p className="break-all text-xs font-semibold">
                      {document.subjectCode}
                    </p>
                  </div>
                </div>

                <span className="absolute bottom-5 right-5 rounded-md bg-white px-3 py-1 text-xs font-bold text-blue-800">
                  PDF
                </span>
              </div>

              <p className="mt-3 text-center text-xs text-slate-400">
                Tài liệu học tập đã được kiểm duyệt
              </p>
            </div>

            {/* Thông tin chính */}
            <div className="flex min-w-0 flex-col">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-4 w-4" />
                Đã được kiểm duyệt
              </div>

              <h1 className="break-words text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {document.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {document.subjectCode}
                </span>

                <span className="max-w-full break-words rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  {document.subjectName}
                </span>
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-600">
                Tài liệu được chia sẻ trong thư viện
                học tập SmartUniLib và đã trải qua
                quy trình kiểm duyệt của hệ thống.
              </p>

              {/* Metadata */}
              <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
                <InfoItem
                  icon={BookOpenText}
                  label="Môn học"
                  value={document.subjectName}
                />

                <InfoItem
                  icon={UserRound}
                  label="Người đăng tải"
                  value={uploaderName}
                />

                <InfoItem
                  icon={CalendarDays}
                  label="Ngày đăng tải"
                  value={formatDate(document.createdAt)}
                />

                <InfoItem
                  icon={HardDrive}
                  label="Dung lượng"
                  value={formatFileSize(document.fileSize)}
                />
              </div>

              {/* Nút tải PDF */}
              <div className="mt-auto pt-8">
                <a
                  href={downloadUrl}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1254A5] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 sm:w-auto"
                >
                  <Download className="h-5 w-5" />
                  Tải tài liệu PDF
                </a>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Tệp PDF được cung cấp thông qua
                  chức năng tải tài liệu của SmartUniLib.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Chi tiết bổ sung */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Mô tả và thông tin tệp */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <BookOpen className="h-5 w-5" />
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  Giới thiệu tài liệu
                </h2>
              </div>

              {document.description ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {document.description}
                </p>
              ) : (
                <p className="text-sm leading-7 text-slate-500">
                  Tài liệu này chưa có mô tả chi tiết.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                Thông tin tệp đính kèm
              </h2>

              <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <FileText className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-semibold text-slate-800">
                    {document.fileName || "Tài liệu PDF"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    PDF · {formatFileSize(document.fileSize)}
                  </p>
                </div>

                <a
                  href={downloadUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  <Download className="h-4 w-4" />
                  Tải xuống
                </a>
              </div>
            </section>
          </div>

          {/* Thông tin kiểm duyệt */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Tài liệu đã được duyệt
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Tài liệu hiện có trạng thái APPROVED
              và được phép hiển thị trong thư viện số.
            </p>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Người chia sẻ
              </p>

              <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                {uploaderName}
              </p>

              <p className="mt-1 break-all text-xs text-slate-500">
                {document.uploader.email}
              </p>
            </div>
          </aside>
        </div>

        {/* Giữ nguyên chức năng khiếu nại bản quyền */}
        <DocumentComplaintForm
          documentId={document.id}
        />
      </div>
    </main>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}
