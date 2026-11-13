"use client";

import { useState } from "react";
import {
  BookOpen,
  AlertCircle,
  ArrowRight,
  FileCheck2,
  CheckCircle2,
  FileText,
  FileUp,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { supabase } from "@/lib/supabase-client";

type UploadedFile = {
  storagePath: string;
  name: string;
  size: number;
};

export function DocumentUploadForm() {
  const [uploading, setUploading] =
  useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const [copyrightType, setCopyrightType] =
    useState("SELF_CREATED");

  const [sourceUrl, setSourceUrl] = useState("");
  const [permissionProofUrl, setPermissionProofUrl] =
    useState("");

  const [copyrightDeclared, setCopyrightDeclared] =
    useState(false);

  const [uploadedFile, setUploadedFile] =
    useState<UploadedFile | null>(null);

  const [submitting, setSubmitting] = useState(false);
  
  async function handleFileUpload(file: File) {
    const MAX_FILE_SIZE = 8 * 1024 * 1024;

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Chỉ chấp nhận file PDF.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      alert("File PDF phải có dung lượng từ 1 byte đến 8 MB.");
      return;
    }

    try {
      setUploading(true);

      // Bước 1: Xin signed upload token từ backend.
      const response = await fetch(
        "/api/storage/documents/upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể tạo đường dẫn upload"
        );
      }

      const { path, token } = data as {
        path: string;
        token: string;
      };

      if (!path || !token) {
        throw new Error("Thông tin upload không hợp lệ");
      }

      // Bước 2: Upload PDF vào private bucket.
      const { error } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(path, token, file, {
          contentType: "application/pdf",
        });

      if (error) {
        throw new Error(error.message);
      }

      // Bước 3: Lưu thông tin file để gửi duyệt.
      setUploadedFile({
        storagePath: path,
        name: file.name,
        size: file.size,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra";

      alert(`Upload thất bại: ${message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (uploading || submitting) {
      return;
    }

    if (!uploadedFile) {
      alert("Vui lòng tải lên file PDF.");
      return;
    }

    if (!copyrightDeclared) {
      alert(
        "Bạn cần xác nhận cam kết về quyền sử dụng tài liệu.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/documents", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          title,
          description,

          subjectCode,
          subjectName,

          storagePath: uploadedFile.storagePath,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,

          copyrightType,

          sourceUrl:
            sourceUrl.trim() || null,

          permissionProofUrl:
            permissionProofUrl.trim() || null,

          copyrightDeclared,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể gửi tài liệu",
        );
      }

      alert(
        "Tài liệu đã được gửi và đang chờ duyệt.",
      );

      setTitle("");
      setDescription("");

      setSubjectCode("");
      setSubjectName("");

      setCopyrightType("SELF_CREATED");

      setSourceUrl("");
      setPermissionProofUrl("");

      setCopyrightDeclared(false);
      setUploadedFile(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra";

      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClassName =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionHeader
          number="01"
          icon={BookOpen}
          title="Thông tin môn học"
          description="Phân loại tài liệu để sinh viên có thể tìm kiếm dễ dàng hơn."
        />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Mã môn học" htmlFor="doc-subject-code" required>
            <input
              id="doc-subject-code"
              type="text"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              placeholder="Ví dụ: CSE484"
              required
              disabled={submitting}
              className={inputClassName}
            />
          </Field>
          <Field label="Tên môn học" htmlFor="doc-subject-name" required>
            <input
              id="doc-subject-name"
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Ví dụ: Công nghệ Web"
              required
              disabled={submitting}
              className={inputClassName}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionHeader
          number="02"
          icon={FileText}
          title="Thông tin tài liệu"
          description="Cung cấp tiêu đề và mô tả để người đọc hiểu nội dung tài liệu."
        />
        <div className="mt-6 space-y-5">
          <Field label="Tiêu đề tài liệu" htmlFor="doc-title" required>
            <input
              id="doc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Tài liệu ôn tập chương 1–5"
              required
              disabled={submitting}
              className={inputClassName}
            />
          </Field>
          <Field label="Mô tả" htmlFor="doc-description">
            <textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nội dung chính, đối tượng phù hợp, những chủ đề có trong tài liệu..."
              rows={5}
              disabled={submitting}
              className={`${inputClassName} resize-y`}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionHeader
          number="03"
          icon={ShieldCheck}
          title="Quyền sử dụng và bản quyền"
          description="Khai báo cơ sở pháp lý cho việc chia sẻ tài liệu trên hệ thống."
        />
        <div className="mt-6 space-y-5">
          <Field label="Loại quyền sử dụng" htmlFor="doc-copyright-type" required>
            <select
              id="doc-copyright-type"
              value={copyrightType}
              onChange={(e) => setCopyrightType(e.target.value)}
              disabled={submitting}
              className={inputClassName}
            >
              <option value="SELF_CREATED">Tài liệu tự biên soạn</option>
              <option value="AUTHOR_PERMISSION">Có sự cho phép của tác giả</option>
              <option value="OPEN_SOURCE">Nguồn mở</option>
            </select>
          </Field>

          {copyrightType === "OPEN_SOURCE" && (
            <Field label="Đường dẫn nguồn" htmlFor="doc-source-url" required>
              <input
                id="doc-source-url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                required
                disabled={submitting}
                className={inputClassName}
              />
            </Field>
          )}

          {copyrightType === "AUTHOR_PERMISSION" && (
            <Field label="Liên kết minh chứng cho phép" htmlFor="doc-proof-url" required>
              <input
                id="doc-proof-url"
                type="url"
                value={permissionProofUrl}
                onChange={(e) => setPermissionProofUrl(e.target.value)}
                placeholder="https://..."
                required
                disabled={submitting}
                className={inputClassName}
              />
            </Field>
          )}
          <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Chỉ đăng tài liệu bạn có quyền chia sẻ. Tài liệu sẽ được kiểm duyệt trước khi xuất hiện trong thư viện.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionHeader
          number="04"
          icon={FileUp}
          title="Tệp PDF"
          description="Chọn một tệp PDF, tối đa 8 MB. Tệp được tải vào vùng lưu trữ riêng tư."
        />
        <div className="mt-6">
          {!uploadedFile ? (
            <label
              className={`group flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center transition ${
                uploading || submitting
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#1254A5] shadow-sm">
                {uploading ? <LoaderCircle className="h-8 w-8 animate-spin" /> : <UploadCloud className="h-8 w-8" />}
              </div>
              <span className="text-base font-bold text-slate-800">
                {uploading ? "Đang tải tệp PDF..." : "Nhấn để chọn tệp PDF"}
              </span>
              <span className="mt-2 text-sm text-slate-500">Định dạng .pdf · Dung lượng tối đa 8 MB</span>
              <span className="mt-4 rounded-lg bg-[#1254A5] px-5 py-2.5 text-sm font-semibold text-white group-hover:bg-blue-800">
                Chọn từ thiết bị
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={uploading || submitting}
                className="sr-only"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) void handleFileUpload(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="break-all text-sm font-bold text-emerald-900">{uploadedFile.name}</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · Đã upload lên storage
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={uploading || submitting}
                onClick={() => setUploadedFile(null)}
                className="shrink-0 self-start rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 sm:self-auto"
              >
                Chọn tệp khác
              </button>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Lưu ý: nếu chọn tệp khác sau khi đã upload, tệp cũ có thể còn trên storage cho đến khi hệ thống dọn dẹp tệp chưa sử dụng.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionHeader
          number="05"
          icon={CheckCircle2}
          title="Xác nhận và gửi kiểm duyệt"
          description="Kiểm tra lại thông tin trước khi gửi tới Librarian/Admin."
        />
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={copyrightDeclared}
            onChange={(e) => setCopyrightDeclared(e.target.checked)}
            disabled={submitting}
            className="mt-1 h-4 w-4 shrink-0 accent-[#1254A5]"
          />
          <span className="text-sm leading-6 text-slate-700">
            Tôi xác nhận mình có quyền sử dụng và chia sẻ tài liệu này, đồng thời chịu trách nhiệm về thông tin đã cung cấp.
          </span>
        </label>
        <button
          type="submit"
          disabled={submitting || uploading || !uploadedFile || !copyrightDeclared}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1254A5] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
          {submitting ? "Đang gửi..." : "Gửi tài liệu để duyệt"}
        </button>
      </section>
    </form>
  );
}

function SectionHeader({
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
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1254A5]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wide text-blue-700">BƯỚC {number}</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
