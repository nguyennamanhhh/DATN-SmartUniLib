"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  FileUp,
  ShieldCheck,
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 sm:space-y-6"
    >
      {/* Thông tin môn học */}
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <SectionHeader
          icon={BookOpen}
          title="Thông tin môn học"
          description="Nhập môn học mà tài liệu này thuộc về."
        />

        <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-5">
          <Field
            label="Mã môn học"
            required
          >
            <input
              type="text"
              value={subjectCode}
              onChange={(e) =>
                setSubjectCode(e.target.value)
              }
              placeholder="VD: CSE484"
              required
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
            />
          </Field>

          <Field
            label="Tên môn học"
            required
          >
            <input
              type="text"
              value={subjectName}
              onChange={(e) =>
                setSubjectName(e.target.value)
              }
              placeholder="VD: Công nghệ Web"
              required
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
            />
          </Field>
        </div>
      </section>

      {/* Thông tin tài liệu */}
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <SectionHeader
          icon={FileText}
          title="Thông tin tài liệu"
          description="Cung cấp thông tin giúp người dùng hiểu nội dung tài liệu."
        />

        <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
          <Field
            label="Tiêu đề tài liệu"
            required
          >
            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="VD: Tài liệu ôn tập chương 1-5"
              required
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
            />
          </Field>

          <Field label="Mô tả">
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Mô tả ngắn về nội dung tài liệu..."
              rows={5}
              className="w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
            />
          </Field>
        </div>
      </section>

      {/* Bản quyền */}
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <SectionHeader
          icon={ShieldCheck}
          title="Quyền sử dụng"
          description="Khai báo nguồn và quyền chia sẻ tài liệu."
        />

        <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
          <Field
            label="Loại quyền sử dụng"
            required
          >
            <select
              value={copyrightType}
              onChange={(e) =>
                setCopyrightType(e.target.value)
              }
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
            >
              <option value="SELF_CREATED">
                Tài liệu tự biên soạn
              </option>

              <option value="AUTHOR_PERMISSION">
                Có sự cho phép của tác giả
              </option>

              <option value="OPEN_SOURCE">
                Nguồn mở
              </option>
            </select>
          </Field>

          {copyrightType ===
            "OPEN_SOURCE" && (
            <Field
              label="Đường dẫn nguồn"
              required
            >
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) =>
                  setSourceUrl(e.target.value)
                }
                placeholder="https://..."
                required
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
              />
            </Field>
          )}

          {copyrightType ===
            "AUTHOR_PERMISSION" && (
            <Field
              label="Minh chứng cho phép"
              required
            >
              <input
                type="url"
                value={permissionProofUrl}
                onChange={(e) =>
                  setPermissionProofUrl(
                    e.target.value,
                  )
                }
                placeholder="Đường dẫn tới minh chứng..."
                required
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
              />
            </Field>
          )}
        </div>
      </section>

      {/* Upload */}
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <SectionHeader
          icon={FileUp}
          title="Tệp PDF"
          description="Chỉ chấp nhận một file PDF cho mỗi tài liệu."
        />
        <div className="mt-5 min-w-0 sm:mt-6">
          {!uploadedFile ? (
            <div className="max-w-full overflow-hidden">
            <label
              className={`flex min-h-44 flex-col items-center justify-center
                rounded-xl border-2 border-dashed p-6 text-center transition
                ${
                  uploading
                    ? "cursor-not-allowed bg-gray-50 opacity-60"
                    : "cursor-pointer hover:bg-gray-50"
                }`}
            >
              <FileUp className="mb-3 h-8 w-8 text-gray-500" />

              <p className="font-medium">
                {uploading ? "Đang tải PDF..." : "Chọn file PDF"}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Định dạng PDF, tối đa 8 MB
              </p>

              <input
                type="file"
                accept=".pdf,application/pdf"
                disabled={uploading || submitting}
                className="hidden"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];

                  if (file) {
                    void handleFileUpload(file);
                  }

                  e.currentTarget.value = "";
                }}
              />
            </label>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-700" />
                </div>

                <div className="min-w-0">
                  <p className="wrap-break-word font-medium text-green-900">
                    {uploadedFile.name}
                  </p>

                  <p className="mt-1 text-xs text-green-700">
                    {(
                      uploadedFile.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setUploadedFile(null)
                }
                className="self-start text-sm font-medium text-red-600 hover:underline sm:self-auto"
              >
                Chọn lại file
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Xác nhận */}
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <SectionHeader
          icon={CheckCircle2}
          title="Xác nhận và gửi duyệt"
          description="Vui lòng kiểm tra thông tin trước khi gửi tài liệu."
        />

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 p-4 sm:mt-6">
          <input
            type="checkbox"
            checked={copyrightDeclared}
            onChange={(e) =>
              setCopyrightDeclared(
                e.target.checked,
              )
            }
            className="mt-1 h-4 w-4 shrink-0"
          />

          <span className="text-sm leading-6 text-gray-700">
            Tôi xác nhận rằng tôi có quyền sử dụng và chia sẻ
            tài liệu này, đồng thời chịu trách nhiệm về thông
            tin đã cung cấp.
          </span>
        </label>

        <button
          type="submit"
          disabled={
            submitting ||
            uploading ||
            !uploadedFile ||
            !copyrightDeclared
          }
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6"
        >
          {submitting
            ? "Đang gửi..."
            : "Gửi tài liệu để duyệt"}
        </button>
      </section>
    </form>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <Icon className="h-5 w-5 text-gray-700" />
      </div>

      <div className="min-w-0">
        <h2 className="wrap-break-word font-semibold">
          {title}
        </h2>

        <p className="mt-1 wrap-break-word text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}