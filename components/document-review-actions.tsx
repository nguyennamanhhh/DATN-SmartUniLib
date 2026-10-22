"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Props = {
  documentId: string;
};

export function DocumentReviewActions({
  documentId,
}: Props) {
  const router = useRouter();

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [activeAction, setActiveAction] = useState<
    "APPROVE" | "REJECT" | null
  >(null);

  async function review(
    action: "APPROVE" | "REJECT",
  ) {
    if (
      action === "REJECT" &&
      !rejectionReason.trim()
    ) {
      alert("Vui lòng nhập lý do từ chối.");
      return;
    }

    try {
      setLoading(true);
      setActiveAction(action);

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
              action === "REJECT"
                ? rejectionReason
                : null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Không thể xử lý tài liệu",
        );
      }

      alert(
        action === "APPROVE"
          ? "Đã duyệt tài liệu."
          : "Đã từ chối tài liệu.",
      );

      router.push("/admin/documents");
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
          Kiểm duyệt tài liệu
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Duyệt tài liệu hoặc nhập lý do nếu cần từ chối.
        </p>
      </div>

      {/* Lý do từ chối */}
      <div className="mt-5 sm:mt-6">
        <label className="mb-2 block text-sm font-medium">
          Lý do từ chối
        </label>

        <textarea
          value={rejectionReason}
          onChange={(e) =>
            setRejectionReason(e.target.value)
          }
          placeholder="Chỉ cần nhập khi bạn muốn từ chối tài liệu..."
          disabled={loading}
          rows={5}
          className="min-h-32 w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70 sm:text-sm"
        />

        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Nếu duyệt tài liệu, bạn có thể để trống nội dung này.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            review("APPROVE")
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />

          {loading &&
          activeAction === "APPROVE"
            ? "Đang duyệt..."
            : "Duyệt tài liệu"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            review("REJECT")
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="h-4 w-4 shrink-0" />

          {loading &&
          activeAction === "REJECT"
            ? "Đang từ chối..."
            : "Từ chối tài liệu"}
        </button>
      </div>
    </section>
  );
}