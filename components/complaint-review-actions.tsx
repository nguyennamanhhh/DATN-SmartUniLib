"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  complaintId: string;
};

export function ComplaintReviewActions({
  complaintId,
}: Props) {
  const router = useRouter();

  const [resolutionNote, setResolutionNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReview(action: "UPHOLD" | "REJECT") {
    if (!resolutionNote.trim()) {
      alert("Vui lòng nhập ghi chú xử lý.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/complaints/${complaintId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            resolutionNote,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể xử lý khiếu nại"
        );
      }

      alert(
        action === "UPHOLD"
          ? "Đã chấp nhận khiếu nại và gỡ tài liệu."
          : "Đã bác khiếu nại và khôi phục tài liệu."
      );

      router.push("/admin/complaints");
      router.refresh();
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
    <div className="space-y-4 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">
        Xử lý khiếu nại
      </h2>

      <textarea
        value={resolutionNote}
        onChange={(e) => setResolutionNote(e.target.value)}
        placeholder="Nhập ghi chú xử lý..."
        className="min-h-28 w-full rounded-md border px-3 py-2"
      />

      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleReview("UPHOLD")}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Chấp nhận khiếu nại
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleReview("REJECT")}
          className="rounded-md border px-4 py-2 disabled:opacity-50"
        >
          Bác khiếu nại
        </button>
      </div>
    </div>
  );
}