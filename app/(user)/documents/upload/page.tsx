
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileUp,
  ShieldCheck,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default async function UploadDocumentPage() {
  // Giữ nguyên xác thực người dùng.
  await requireUser();

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
            Đăng tài liệu
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

        {/* Giới thiệu */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1254A5] text-white shadow-sm">
                <FileUp className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  Thư viện số SmartUniLib
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Chia sẻ tài liệu học tập
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Đóng góp giáo trình, bài giảng và
                  tài liệu tham khảo để hỗ trợ cộng đồng
                  sinh viên học tập hiệu quả hơn.
                </p>
              </div>
            </div>
          </div>

          {/* Quy trình */}
          <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
            <ProcessStep
              number="01"
              icon={FileUp}
              title="Tải PDF"
              description="Chọn tệp và nhập thông tin tài liệu."
            />

            <ProcessStep
              number="02"
              icon={ShieldCheck}
              title="Kiểm duyệt"
              description="Librarian hoặc Admin xem xét tài liệu."
            />

            <ProcessStep
              number="03"
              icon={BookOpen}
              title="Xuất bản"
              description="Tài liệu được duyệt sẽ có trong thư viện."
            />
          </div>
        </section>

        {/* Lưu ý kiểm duyệt */}
        <section className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-blue-900">
              Tài liệu cần được kiểm duyệt
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Sau khi gửi, tài liệu sẽ có trạng thái
              chờ duyệt (PENDING). Chỉ tài liệu được
              Librarian hoặc Admin chấp nhận mới
              xuất hiện trong thư viện số.
            </p>
          </div>
        </section>

        {/* Form upload */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-blue-700" />

                <h2 className="text-lg font-bold text-slate-900">
                  Thông tin tài liệu
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Điền thông tin và tải tệp PDF lên hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Quy trình kiểm duyệt
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <DocumentUploadForm />
          </div>
        </section>

        {/* Nhắc nhở bản quyền */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Lưu ý về bản quyền
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Chỉ chia sẻ tài liệu do bạn tự tạo,
                được chủ sở hữu quyền cho phép hoặc
                được cấp phép phù hợp. Hãy cung cấp
                nguồn và minh chứng khi biểu mẫu yêu cầu.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProcessStep({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-blue-700">
          BƯỚC {number}
        </p>

        <h3 className="mt-1 text-sm font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
