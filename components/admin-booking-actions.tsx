"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogIn } from "lucide-react";

type Props = {
  bookingId: string;
  checkedIn: boolean;
};

type CheckInResponse = {
  message?: string;
};

export function AdminBookingActions({
  bookingId,
  checkedIn,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const submittingRef = useRef(false);

  async function handleCheckIn() {
    if (
      checkedIn ||
      confirmed ||
      submittingRef.current
    ) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingId)}/check-in`,
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const data: CheckInResponse | null =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Không thể check-in (HTTP ${response.status})`,
        );
      }

      setConfirmed(true);

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi check-in";

      alert(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (checkedIn || confirmed) {
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
