"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  documentId: string;
};

export function DocumentReviewActions({ documentId }: Props) {
  const router = useRouter();

  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function review(action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !rejectionReason.trim()) {
      alert("Vui lòng nhập lý do từ chối.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/documents/${documentId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            rejectionReason:
              action === "REJECT" ? rejectionReason : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể xử lý tài liệu");
      }

      alert(
        action === "APPROVE"
          ? "Đã duyệt tài liệu."
          : "Đã từ chối tài liệu."
      );

      router.push("/admin/documents");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Có lỗi xảy ra";

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Kiểm duyệt tài liệu</h2>

      <textarea
        value={rejectionReason}
        onChange={(e) => setRejectionReason(e.target.value)}
        placeholder="Nhập lý do nếu từ chối..."
        className="min-h-28 w-full rounded-md border px-3 py-2"
      />

      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => review("APPROVE")}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Duyệt
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => review("REJECT")}
          className="rounded-md border px-4 py-2 disabled:opacity-50"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}