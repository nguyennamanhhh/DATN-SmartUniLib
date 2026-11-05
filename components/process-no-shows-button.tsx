
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ProcessNoShowsResponse = {
  message?: string;
  processedCount?: number;
};

export function ProcessNoShowsButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  // Ngăn gửi trùng trong cùng một component.
  const submittingRef = useRef(false);

  async function handleProcess() {
    if (submittingRef.current) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn kiểm tra và xử lý các lịch đặt " +
        "đã quá hạn check-in?\n\n" +
        "Những lịch đủ điều kiện có thể được chuyển sang NO_SHOW.",
    );

    if (!confirmed) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/bookings/process-no-shows",
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const data: ProcessNoShowsResponse | null =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Không thể xử lý NO_SHOW (HTTP ${response.status})`,
        );
      }

      alert(
        data?.message ||
          "Đã hoàn tất kiểm tra các lịch quá hạn.",
      );

      // Cập nhật danh sách booking từ Server Component.
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi xử lý NO_SHOW";

      alert(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleProcess}
      disabled={loading}
      className="rounded-md border px-4 py-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading
        ? "Đang kiểm tra..."
        : "Kiểm tra lịch quá hạn"}
    </button>
  );
}
