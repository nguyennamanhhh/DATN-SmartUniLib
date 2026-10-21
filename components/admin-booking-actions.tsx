"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  checkedIn: boolean;
};

export function AdminBookingActions({
  bookingId,
  checkedIn,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckIn() {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/bookings/${bookingId}/check-in`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể check-in"
        );
      }

      alert("Check-in thành công!");

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

  if (checkedIn) {
    return (
      <div className="mt-4">
        <span className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-700">
          Đã check-in
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={loading}
        onClick={handleCheckIn}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Đang xác nhận..." : "Xác nhận check-in"}
      </button>
    </div>
  );
}