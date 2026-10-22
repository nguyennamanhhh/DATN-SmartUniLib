import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileWarning,
  Mail,
  User,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { ComplaintReviewActions } from "@/components/complaint-review-actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminComplaintDetailPage({
  params,
}: Props) {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const { id } = await params;

  const complaint =
    await prisma.documentComplaint.findUnique({
      where: {
        id,
      },
      include: {
        document: {
          include: {
            uploader: true,
          },
        },
        complainant: true,
        resolvedBy: true,
      },
    });

  if (!complaint) {
    notFound();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        {/* Quay lại */}
        <Link
          href="/admin/complaints"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-black"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Quay lại danh sách khiếu nại
        </Link>

        {/* Thông tin chính */}
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-50">
              <FileWarning className="h-7 w-7 text-red-600" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold leading-8 sm:text-2xl">
                    Khiếu nại bản quyền
                  </h1>

                  <p className="mt-2 wrap-break-word text-sm text-muted-foreground">
                    Tài liệu: {complaint.document.title}
                  </p>
                </div>

                <div className="shrink-0">
                  <StatusBadge
                    status={complaint.status}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-gray-50 p-4 sm:mt-6">
                <p className="text-sm font-medium">
                  Nội dung khiếu nại
                </p>

                <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-gray-700">
                  {complaint.reason}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Người khiếu nại */}
        <section className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            icon={User}
            label="Người khiếu nại"
            value={
              complaint.complainant?.fullName ||
              complaint.complainantName ||
              "Không xác định"
            }
          />

          <InfoCard
            icon={Mail}
            label="Email"
            value={
              complaint.complainant?.email ||
              complaint.complainantEmail ||
              "Không có"
            }
          />
        </section>

        {/* Tài liệu bị khiếu nại */}
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                Tài liệu bị khiếu nại
              </h2>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Kiểm tra lại tài liệu trước khi đưa ra quyết định.
              </p>
            </div>

            <div className="shrink-0">
              <StatusBadge
                status={complaint.document.status}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Tiêu đề"
              value={complaint.document.title}
            />

            <DetailItem
              label="Môn học"
              value={`${complaint.document.subjectCode} - ${complaint.document.subjectName}`}
            />

            <DetailItem
              label="Người tải"
              value={
                complaint.document.uploader.fullName ||
                complaint.document.uploader.email
              }
            />

            <DetailItem
              label="Ngày gửi khiếu nại"
              value={complaint.createdAt.toLocaleString(
                "vi-VN",
              )}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={complaint.document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 sm:w-auto"
            >
              Mở PDF
            </a>

            <Link
              href={`/admin/documents/${complaint.document.id}`}
              className="inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50 sm:w-auto"
            >
              Xem chi tiết tài liệu
            </Link>
          </div>
        </section>

        {/* Xử lý khiếu nại */}
        {complaint.status === "PENDING" && (
          <ComplaintReviewActions
            complaintId={complaint.id}
          />
        )}

        {/* Kết quả đã xử lý */}
        {complaint.status !== "PENDING" && (
          <section className="rounded-xl border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">
              Kết quả xử lý
            </h2>

            <div className="mt-4 space-y-5 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-muted-foreground">
                  Trạng thái:
                </span>

                <div className="w-fit">
                  <StatusBadge
                    status={complaint.status}
                  />
                </div>
              </div>

              {complaint.resolutionNote && (
                <div className="min-w-0">
                  <p className="text-muted-foreground">
                    Ghi chú xử lý
                  </p>

                  <p className="mt-1 whitespace-pre-wrap wrap-break-word leading-6">
                    {complaint.resolutionNote}
                  </p>
                </div>
              )}

              {complaint.resolvedBy && (
                <div className="min-w-0">
                  <p className="text-muted-foreground">
                    Người xử lý
                  </p>

                  <p className="mt-1 wrap-break-word font-medium">
                    {complaint.resolvedBy.fullName ||
                      complaint.resolvedBy.email}
                  </p>
                </div>
              )}

              {complaint.resolvedAt && (
                <div>
                  <p className="text-muted-foreground">
                    Thời gian xử lý
                  </p>

                  <p className="mt-1 font-medium">
                    {complaint.resolvedAt.toLocaleString(
                      "vi-VN",
                    )}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
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
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 wrap-break-word font-medium">
        {value}
      </p>
    </div>
  );
}