"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  documentId: string;
};

export function DocumentComplaintForm({
  documentId,
}: Props) {
  const router = useRouter();

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!reason.trim()) {
      alert("Vui lòng nhập nội dung khiếu nại.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/documents/${documentId}/complaints`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể gửi khiếu nại"
        );
      }

      alert(
        "Khiếu nại đã được tiếp nhận. Tài liệu sẽ tạm ẩn trong thời gian xem xét."
      );

      setReason("");

      router.replace("/documents");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra";

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border p-6"
    >
      <div>
        <h2 className="text-lg font-semibold">
          Báo cáo / Khiếu nại bản quyền
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Chỉ gửi khi bạn cho rằng tài liệu có vấn đề về
          quyền sử dụng hoặc bản quyền.
        </p>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Nhập lý do khiếu nại..."
        className="min-h-28 w-full rounded-md border px-3 py-2"
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-md border px-4 py-2 disabled:opacity-50"
      >
        {loading ? "Đang gửi..." : "Gửi khiếu nại"}
      </button>
    </form>
  );
}