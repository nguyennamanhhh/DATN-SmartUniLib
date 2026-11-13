
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarX2,
  Loader2,
  X,
} from "lucide-react";

type Props = {
  bookingId: string;
  roomName: string;
};

export function CancelBookingButton({
  bookingId,
  roomName,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể hủy lịch đặt.",
        );
      }

      setOpen(false);

      // Yêu cầu Next.js lấy lại danh sách lịch từ server.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi hủy lịch.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto"
      >
        <CalendarX2 className="h-4 w-4" />
        Hủy lịch đặt
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-title-${bookingId}`}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <CalendarX2 className="h-6 w-6" />
              </div>

              <button
                type="button"
                aria-label="Đóng hộp thoại"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2
              id={`cancel-title-${bookingId}`}
              className="mt-4 text-xl font-bold text-slate-900"
            >
              Xác nhận hủy lịch?
            </h2>

            <p className="mt-3 break-words text-sm leading-6 text-slate-600">
              Bạn có chắc muốn hủy lịch sử dụng{" "}
              <span className="font-bold text-slate-900">
                phòng {roomName}
              </span>
              ?
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Lịch đã bắt đầu hoặc đã check-in sẽ
              không thể hủy.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Giữ lịch đặt
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleCancel}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang hủy...
                  </>
                ) : (
                  "Xác nhận hủy"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
