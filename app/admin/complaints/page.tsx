import Link from "next/link";
import {
  CalendarDays,
  MessageSquareWarning,
  User,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminComplaintsPage() {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const complaints = await prisma.documentComplaint.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      document: true,
      complainant: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <PageHeader
          title="Khiếu nại bản quyền"
          description="Kiểm tra và xử lý các khiếu nại đang chờ xác minh."
        />

        {complaints.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title="Không có khiếu nại chờ xử lý"
            description="Các khiếu nại mới sẽ xuất hiện tại đây."
          />
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-4 md:hidden">
              {complaints.map((complaint) => {
                const complainantName =
                  complaint.complainant?.fullName ||
                  complaint.complainantName ||
                  complaint.complainantEmail ||
                  "Không xác định";

                const complainantEmail =
                  complaint.complainant?.email ||
                  complaint.complainantEmail;

                return (
                  <article
                    key={complaint.id}
                    className="rounded-xl border bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold">
                          {complaint.document.title}
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {complaint.document.subjectCode} -{" "}
                          {complaint.document.subjectName}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={complaint.status} />
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {/* Người khiếu nại */}
                      <div className="flex items-start gap-3">
                        <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />

                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Người khiếu nại
                          </p>

                          <p className="mt-1 wrap-break-word text-sm font-medium">
                            {complainantName}
                          </p>

                          {complainantEmail && (
                            <p className="wrap-break-word text-xs text-muted-foreground">
                              {complainantEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Lý do */}
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Lý do khiếu nại
                        </p>

                        <p className="mt-1 line-clamp-3 text-sm leading-6 text-gray-700">
                          {complaint.reason}
                        </p>
                      </div>

                      {/* Ngày gửi */}
                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Ngày gửi
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {complaint.createdAt.toLocaleString(
                              "vi-VN",
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/admin/complaints/${complaint.id}`}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    >
                      Xem chi tiết
                    </Link>
                  </article>
                );
              })}
            </div>

            {/* Desktop / Tablet */}
            <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-5 py-4 font-medium text-gray-600">
                        Tài liệu
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Người khiếu nại
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Lý do
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Trạng thái
                      </th>

                      <th className="px-5 py-4 font-medium text-gray-600">
                        Ngày gửi
                      </th>

                      <th className="px-5 py-4 text-right font-medium text-gray-600">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {complaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="max-w-xs">
                            <p className="font-medium">
                              {complaint.document.title}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {complaint.document.subjectCode} -{" "}
                              {complaint.document.subjectName}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-xs">
                            <p className="font-medium">
                              {complaint.complainant?.fullName ||
                                complaint.complainantName ||
                                complaint.complainantEmail ||
                                "Không xác định"}
                            </p>

                            {(complaint.complainant?.email ||
                              complaint.complainantEmail) && (
                              <p className="mt-1 wrap-break-word text-xs text-muted-foreground">
                                {complaint.complainant?.email ||
                                  complaint.complainantEmail}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-sm line-clamp-2 text-gray-600">
                            {complaint.reason}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={complaint.status}
                          />
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {complaint.createdAt.toLocaleString(
                            "vi-VN",
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/complaints/${complaint.id}`}
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