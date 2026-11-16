
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogIn,
  X,
} from "lucide-react";

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
  const [showConfirmation, setShowConfirmation] =
    useState(false);
  const [error, setError] = useState("");

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
    setError("");

    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(
          bookingId,
        )}/check-in`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
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
      setShowConfirmation(false);

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi check-in";

      setError(message);

      // Đồng bộ trạng thái mới nhất nếu booking
      // đã bị hủy, check-in hoặc chuyển NO_SHOW.
      router.refresh();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (checkedIn || confirmed) {
    return (
      <div
        role="status"
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Đã check-in
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showConfirmation ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setError("");
            setShowConfirmation(true);
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1254A5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          Xác nhận check-in
        </button>
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-blue-900">
                Xác nhận sinh viên đã đến?
              </p>

              <p className="mt-2 text-xs leading-5 text-blue-800">
                Chỉ thực hiện check-in khi đã xác minh
                sinh viên có mặt tại phòng.
              </p>
            </div>

            <button
              type="button"
              aria-label="Đóng xác nhận"
              disabled={loading}
              onClick={() => {
                setShowConfirmation(false);
                setError("");
              }}
              className="rounded-md p-1 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleCheckIn}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1254A5] px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Xác nhận sinh viên đã đến
                </>
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setShowConfirmation(false);
                setError("");
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Quay lại
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
