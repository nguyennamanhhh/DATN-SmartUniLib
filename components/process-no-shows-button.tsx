"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProcessNoShowsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleProcess() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/bookings/process-no-shows",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể xử lý NO_SHOW"
        );
      }

      alert(data.message);

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
    <button
      type="button"
      onClick={handleProcess}
      disabled={loading}
      className="rounded-md border px-4 py-2 disabled:opacity-50"
    >
      {loading
        ? "Đang kiểm tra..."
        : "Kiểm tra lịch quá hạn"}
    </button>
  );
}