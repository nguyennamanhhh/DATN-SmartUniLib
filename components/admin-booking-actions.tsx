"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LogIn,
} from "lucide-react";

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
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể check-in",
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
        <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />

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
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <LogIn className="h-4 w-4 shrink-0" />

        {loading
          ? "Đang xác nhận..."
          : "Xác nhận check-in"}
      </button>
    </div>
  );
}