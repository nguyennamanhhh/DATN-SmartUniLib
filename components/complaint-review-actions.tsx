"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Props = {
  complaintId: string;
};

export function ComplaintReviewActions({
  complaintId,
}: Props) {
  const router = useRouter();

  const [resolutionNote, setResolutionNote] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [activeAction, setActiveAction] = useState<
    "UPHOLD" | "REJECT" | null
  >(null);

  async function handleReview(
    action: "UPHOLD" | "REJECT",
  ) {
    if (!resolutionNote.trim()) {
      alert("Vui lòng nhập ghi chú xử lý.");
      return;
    }

    try {
      setLoading(true);
      setActiveAction(action);

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
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Không thể xử lý khiếu nại",
        );
      }

      alert(
        action === "UPHOLD"
          ? "Đã chấp nhận khiếu nại và gỡ tài liệu."
          : "Đã bác khiếu nại và khôi phục tài liệu.",
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
      setActiveAction(null);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-4 sm:p-6">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">
          Xử lý khiếu nại
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Nhập ghi chú xử lý trước khi đưa ra quyết định.
        </p>
      </div>

      {/* Ghi chú */}
      <div className="mt-5 sm:mt-6">
        <label className="mb-2 block text-sm font-medium">
          Ghi chú xử lý
        </label>

        <textarea
          value={resolutionNote}
          onChange={(e) =>
            setResolutionNote(e.target.value)
          }
          placeholder="Nhập lý do và nội dung xử lý khiếu nại..."
          disabled={loading}
          rows={5}
          className="min-h-32 w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70 sm:text-sm"
        />

        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Ghi chú này sẽ được lưu lại cùng kết quả xử lý
          khiếu nại.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            handleReview("UPHOLD")
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />

          {loading &&
          activeAction === "UPHOLD"
            ? "Đang xử lý..."
            : "Chấp nhận khiếu nại"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            handleReview("REJECT")
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="h-4 w-4 shrink-0" />

          {loading &&
          activeAction === "REJECT"
            ? "Đang xử lý..."
            : "Bác khiếu nại"}
        </button>
      </div>
    </section>
  );
}