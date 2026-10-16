"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";

type UploadedFile = {
  url: string;
  name: string;
  size: number;
};

export function DocumentUploadForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [copyrightType, setCopyrightType] = useState("SELF_CREATED");
  const [sourceUrl, setSourceUrl] = useState("");
  const [permissionProofUrl, setPermissionProofUrl] = useState("");
  const [copyrightDeclared, setCopyrightDeclared] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!uploadedFile) {
      alert("Vui lòng upload file PDF trước.");
      return;
    }

    if (!copyrightDeclared) {
      alert("Bạn phải xác nhận quyền sử dụng tài liệu.");
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
          fileUrl: uploadedFile.url,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          copyrightType,
          sourceUrl,
          permissionProofUrl,
          copyrightDeclared,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo tài liệu");
      }

      alert("Tài liệu đã được gửi và đang chờ duyệt.");

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
        error instanceof Error ? error.message : "Có lỗi xảy ra";

      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block font-medium">
          Mã môn học
        </label>

        <input
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="VD: CSE484"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Tên môn học
        </label>

        <input
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="VD: Công nghệ Web"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Tiêu đề tài liệu
        </label>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="VD: Tài liệu ôn tập chương 1-5"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Mô tả
        </label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-28 w-full rounded-md border px-3 py-2"
          placeholder="Mô tả ngắn về nội dung tài liệu"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Loại quyền sử dụng
        </label>

        <select
          value={copyrightType}
          onChange={(e) => setCopyrightType(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="SELF_CREATED">
            Tài liệu tự biên soạn
          </option>

          <option value="AUTHOR_PERMISSION">
            Có sự cho phép của tác giả
          </option>

          <option value="OPEN_SOURCE">
            Nguồn mở / công khai
          </option>
        </select>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Nguồn tài liệu
        </label>

        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Minh chứng quyền chia sẻ
        </label>

        <input
          value={permissionProofUrl}
          onChange={(e) => setPermissionProofUrl(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Link email / tài liệu xác nhận quyền chia sẻ"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          File PDF
        </label>

        {!uploadedFile ? (
          <UploadDropzone
            endpoint="documentUploader"
            config={{
              mode: "auto",
            }}
            onClientUploadComplete={(res) => {
              const file = res?.[0];

              if (!file) {
                return;
              }

              const uploaded = {
                url: file.serverData?.url ?? file.url,
                name: file.serverData?.name ?? file.name,
                size: file.serverData?.size ?? file.size,
              };

              setUploadedFile(uploaded);

              console.log("Upload thành công:", uploaded);
            }}
            onUploadError={(error: Error) => {
              console.error("Upload lỗi:", error);
              alert(`Upload thất bại: ${error.message}`);
            }}
          />
        ) : (
          <div className="rounded-md border p-4">
            <p className="font-medium">
              Đã upload: {uploadedFile.name}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>

            <button
              type="button"
              onClick={() => setUploadedFile(null)}
              className="mt-3 text-sm underline"
            >
              Chọn file khác
            </button>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={copyrightDeclared}
          onChange={(e) =>
            setCopyrightDeclared(e.target.checked)
          }
          className="mt-1"
        />

        <span className="text-sm">
          Tôi xác nhận mình có quyền sử dụng và chia sẻ tài liệu này
          theo chính sách của hệ thống.
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting || !uploadedFile}
        className="w-full rounded-md bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Đang gửi..."
          : "Gửi tài liệu để duyệt"}
      </button>
    </form>
  );
}