
import Link from "next/link";
import {
  BookOpen,
  BookOpenText,
  FileText,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{
    q?: string;
    subject?: string;
  }>;
};

const coverStyles = [
  "from-blue-800 via-blue-600 to-cyan-500",
  "from-teal-800 via-teal-600 to-emerald-400",
  "from-indigo-900 via-indigo-600 to-violet-400",
  "from-sky-900 via-sky-600 to-blue-400",
  "from-emerald-900 via-emerald-600 to-teal-400",
  "from-violet-900 via-purple-600 to-pink-400",
];

function buildUrl(q: string, subject: string) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (subject) params.set("subject", subject);

  const query = params.toString();
  return query ? `/documents?${query}` : "/documents";
}

export default async function DocumentsPage({
  searchParams,
}: Props) {
  await requireUser();

  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 100);
  const subject = params.subject || "";

  // Danh mục môn học được lấy từ tài liệu đã duyệt.
  const subjects = await prisma.document.groupBy({
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
  });

  const documents = await prisma.document.findMany({
    where: {
      status: "APPROVED",

      ...(subject
        ? {
            subjectCode: subject,
          }
        : {}),

      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { subjectName: { contains: q } },
              { subjectCode: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },

    select: {
      id: true,
      title: true,
      description: true,
      subjectCode: true,
      subjectName: true,
      createdAt: true,
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
  });

  const totalDocuments = subjects.reduce(
    (sum, item) => sum + item._count._all,
    0,
  );

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Tiêu đề */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-blue-700">
            <BookOpenText className="h-4 w-4" />
            <span>THƯ VIỆN SỐ SMARTUNILIB</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Khám phá tài liệu học tập
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Tra cứu tài liệu đã kiểm duyệt, theo môn học
            và nội dung bạn quan tâm.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sidebar danh mục */}
          <aside className="w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6 lg:w-60">
            <div className="bg-[#1254A5] px-4 py-3 text-sm font-bold text-white">
              DANH MỤC TÀI LIỆU
            </div>

            <div className="p-3">
              <Link
                href={buildUrl(q, "")}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                  !subject
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Tất cả tài liệu
                </span>

                <span className="text-xs text-slate-400">
                  {totalDocuments}
                </span>
              </Link>

              <div className="my-3 border-t border-slate-100" />

              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Môn học
              </p>

              <nav
                aria-label="Danh mục môn học"
                className="max-h-[470px] space-y-1 overflow-y-auto"
              >
                {subjects.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-400">
                    Chưa có danh mục.
                  </p>
                ) : (
                  subjects.map((item) => {
                    const active =
                      subject === item.subjectCode;

                    return (
                      <Link
                        key={`${item.subjectCode}-${item.subjectName}`}
                        href={buildUrl(q, item.subjectCode)}
                        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                          active
                            ? "bg-blue-50 font-semibold text-blue-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            {item.subjectName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.subjectCode}
                          </span>
                        </span>

                        <span className="text-xs text-slate-400">
                          {item._count._all}
                        </span>
                      </Link>
                    );
                  })
                )}
              </nav>
            </div>
          </aside>

          {/* Khu vực tài liệu */}
          <section className="min-w-0 flex-1">
            {/* Thanh tìm kiếm */}
            <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <form
                method="GET"
                action="/documents"
                className="flex flex-col gap-3 sm:flex-row"
              >
                {subject && (
                  <input
                    type="hidden"
                    name="subject"
                    value={subject}
                  />
                )}

                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    maxLength={100}
                    placeholder="Tìm tên tài liệu, mã môn hoặc nội dung..."
                    aria-label="Tìm kiếm tài liệu"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1254A5] px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </button>
              </form>
            </div>

            {/* Thông tin kết quả */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {q ? "Kết quả tìm kiếm" : "Kho tài liệu"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Hiển thị {documents.length} tài liệu
                  đã được kiểm duyệt
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                <SlidersHorizontal className="h-4 w-4" />
                Mới nhất trước
              </div>
            </div>

            {/* Danh sách tài liệu */}
            {documents.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
                <BookOpenText className="mb-4 h-12 w-12 text-slate-300" />

                <h3 className="font-semibold text-slate-800">
                  Không tìm thấy tài liệu
                </h3>

                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Hãy thử từ khóa khác hoặc chọn tất cả
                  danh mục.
                </p>

                <Link
                  href="/documents"
                  className="mt-5 rounded-lg bg-[#1254A5] px-4 py-2 text-sm font-semibold text-white"
                >
                  Xóa bộ lọc
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {documents.map((document, index) => {
                  const cover =
                    coverStyles[index % coverStyles.length];

                  return (
                    <article
                      key={document.id}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                    >
                      <Link
                        href={`/documents/${document.id}`}
                        className="block p-3"
                      >
                        {/* Bìa tài liệu mặc định */}
                        <div
                          className={`relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${cover} p-4 text-white`}
                        >
                          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" />
                          <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full border-[20px] border-white/10" />

                          <FileText className="relative mb-3 h-12 w-12 text-white/90" />

                          <span className="relative text-center text-xs font-semibold tracking-widest text-white/80">
                            SMARTUNILIB
                          </span>

                          <span className="relative mt-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                            {document.subjectCode}
                          </span>

                          <span className="absolute bottom-3 right-3 rounded bg-white px-2 py-0.5 text-[10px] font-bold text-blue-800">
                            PDF
                          </span>
                        </div>
                      </Link>

                      <div className="flex flex-1 flex-col px-4 pb-4">
                        <p className="mb-2 truncate text-xs font-medium text-blue-700">
                          {document.subjectName}
                        </p>

                        <Link
                          href={`/documents/${document.id}`}
                          className="line-clamp-2 min-h-11 text-sm font-bold leading-5 text-slate-800 transition group-hover:text-blue-700"
                        >
                          {document.title}
                        </Link>

                        {document.description && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                            {document.description}
                          </p>
                        )}

                        <div className="mt-auto pt-4">
                          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                            <UserRound className="h-3.5 w-3.5 shrink-0" />

                            <span className="truncate">
                              {document.uploader.fullName ||
                                document.uploader.email}
                            </span>
                          </div>

                          <Link
                            href={`/documents/${document.id}`}
                            className="mt-3 flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 transition hover:bg-[#1254A5] hover:text-white"
                          >
                            Xem tài liệu
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
