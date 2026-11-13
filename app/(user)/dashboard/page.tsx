
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CalendarDays,
  Clock3,
  FileCheck2,
  FileText,
  FileUp,
  Library,
  Search,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const coverStyles = [
  "from-blue-800 via-blue-600 to-cyan-500",
  "from-teal-800 via-teal-600 to-emerald-400",
  "from-indigo-900 via-indigo-600 to-violet-400",
  "from-sky-900 via-sky-600 to-blue-400",
];

export default async function UserDashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const [
    uploadedDocuments,
    pendingDocuments,
    approvedDocuments,
    futureBookings,
    noShowBookings,
    latestDocuments,
    subjects,
  ] = await Promise.all([
    prisma.document.count({
      where: { uploaderId: user.id },
    }),

    prisma.document.count({
      where: {
        uploaderId: user.id,
        status: "PENDING",
      },
    }),

    prisma.document.count({
      where: {
        uploaderId: user.id,
        status: "APPROVED",
      },
    }),

    prisma.roomBooking.count({
      where: {
        userId: user.id,
        status: "CONFIRMED",
        startTime: { gt: now },
      },
    }),

    prisma.roomBooking.count({
      where: {
        userId: user.id,
        status: "NO_SHOW",
      },
    }),

    // Tài liệu được duyệt mới nhất.
    prisma.document.findMany({
      where: {
        status: "APPROVED",
      },
      select: {
        id: true,
        title: true,
        subjectCode: true,
        subjectName: true,
        uploader: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),

    // Danh mục môn học.
    prisma.document.groupBy({
      by: ["subjectCode", "subjectName"],
      where: {
        status: "APPROVED",
      },
      _count: {
        _all: true,
      },
      orderBy: {
        subjectName: "asc",
      },
    }),
  ]);

  const displayName =
    user.fullName || user.email || "Sinh viên";

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">

        {/* Lời chào */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <BookOpenText className="h-4 w-4" />
            CỔNG THƯ VIỆN SỐ
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Chào mừng đến với SmartUniLib
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Xin chào {displayName}. Khám phá tài liệu
            học tập và các tiện ích dành cho sinh viên.
          </p>
        </section>

        {/* Tìm kiếm tài liệu */}
        <section className="rounded-2xl bg-gradient-to-r from-[#1254A5] to-[#167AC0] p-5 text-white shadow-sm sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-bold sm:text-2xl">
              Học tập dễ dàng hơn cùng SmartUniLib
            </h2>

            <p className="mt-2 text-sm text-blue-100">
              Tìm giáo trình, bài giảng và tài liệu
              tham khảo đã được kiểm duyệt.
            </p>
          </div>

          <form
            method="GET"
            action="/documents"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                name="q"
                placeholder="Nhập tên tài liệu, mã môn học..."
                aria-label="Tìm kiếm tài liệu"
                maxLength={100}
                className="h-12 w-full rounded-xl border border-white/20 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-[#1254A5] transition hover:bg-blue-50"
            >
              <Search className="h-4 w-4" />
              Tìm kiếm
            </button>
          </form>
        </section>

        {/* Danh mục và tài liệu */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* Danh mục môn học */}
          <aside className="w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:w-60">
            <div className="bg-[#1254A5] px-4 py-3 text-sm font-bold text-white">
              DANH MỤC TÀI LIỆU
            </div>

            <div className="space-y-1 p-3">
              <Link
                href="/documents"
                className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700"
              >
                <Library className="h-4 w-4" />
                Tất cả tài liệu
              </Link>

              <div className="my-3 border-t border-slate-100" />

              <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Môn học
              </p>

              {subjects.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">
                  Chưa có danh mục.
                </p>
              ) : (
                subjects.slice(0, 10).map((subject) => (
                  <Link
                    key={`${subject.subjectCode}-${subject.subjectName}`}
                    href={`/documents?subject=${encodeURIComponent(
                      subject.subjectCode,
                    )}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {subject.subjectName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {subject.subjectCode}
                      </span>
                    </span>

                    <span className="text-xs text-slate-400">
                      {subject._count._all}
                    </span>
                  </Link>
                ))
              )}

              <Link
                href="/documents"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Xem toàn bộ thư viện
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>

          {/* Tài liệu mới nhất */}
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Tài liệu mới nhất
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Các tài liệu đã được kiểm duyệt.
                </p>
              </div>

              <Link
                href="/documents"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {latestDocuments.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border bg-white p-8 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-semibold text-slate-800">
                  Chưa có tài liệu được duyệt
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Tài liệu sẽ xuất hiện tại đây sau khi
                  được kiểm duyệt.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {latestDocuments.map((document, index) => (
                  <Link
                    key={document.id}
                    href={`/documents/${document.id}`}
                    className="group flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >
                    <div
                      className={`relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${
                        coverStyles[index % coverStyles.length]
                      } p-3 text-white`}
                    >
                      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" />

                      <FileText className="relative mb-3 h-10 w-10 text-white/90" />

                      <span className="relative text-center text-[10px] font-bold tracking-widest">
                        SMARTUNILIB
                      </span>

                      <span className="relative mt-2 rounded-full bg-white/20 px-3 py-1 text-xs">
                        {document.subjectCode}
                      </span>

                      <span className="absolute bottom-2 right-2 rounded bg-white px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        PDF
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col px-1 pt-3">
                      <p className="truncate text-xs font-semibold text-blue-700">
                        {document.subjectName}
                      </p>

                      <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-bold text-slate-800 transition group-hover:text-blue-700">
                        {document.title}
                      </h3>

                      <p className="mt-auto flex items-center gap-2 pt-4 text-xs text-slate-500">
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {document.uploader.fullName ||
                            document.uploader.email}
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Truy cập nhanh */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Tiện ích dành cho sinh viên
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuickLink
              href="/documents"
              title="Thư viện số"
              description="Tra cứu tài liệu học tập."
              icon={Library}
            />

            <QuickLink
              href="/documents/upload"
              title="Đăng tài liệu"
              description="Chia sẻ tài liệu để kiểm duyệt."
              icon={FileUp}
            />

            <QuickLink
              href="/rooms"
              title="Đặt phòng học"
              description="Chọn phòng và khung giờ."
              icon={BookOpen}
            />

            <QuickLink
              href="/bookings"
              title="Lịch của tôi"
              description="Theo dõi các lịch đã đặt."
              icon={CalendarDays}
            />
          </div>
        </section>

        {/* Thống kê cá nhân */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Hoạt động của bạn
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="Tài liệu đã tải"
              value={uploadedDocuments}
              icon={FileText}
            />

            <StatCard
              title="Đang chờ duyệt"
              value={pendingDocuments}
              icon={Clock3}
            />

            <StatCard
              title="Đã được duyệt"
              value={approvedDocuments}
              icon={FileCheck2}
            />

            <StatCard
              title="Lịch sắp tới"
              value={futureBookings}
              icon={CalendarDays}
            />

            <StatCard
              title="No-show"
              value={noShowBookings}
              icon={TriangleAlert}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </Link>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
