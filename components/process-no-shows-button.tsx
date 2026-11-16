
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

type NoShowSummary = {
  examinedCount: number;
  processedCount: number;
  skippedCount: number;
  bannedCount: number;
  batchSize: number;
  batchLimitReached: boolean;
};

type ProcessNoShowsResponse = {
  message?: string;
  processedCount?: number;
  bannedCount?: number;
  summary?: NoShowSummary;
};

export function ProcessNoShowsButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] =
    useState<ProcessNoShowsResponse | null>(null);

  const submittingRef = useRef(false);

  async function handleProcess() {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/bookings/process-no-shows",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
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

      setResult(
        data ?? {
          message: "Đã hoàn tất kiểm tra lịch quá hạn.",
        },
      );

      setShowConfirm(false);

      // Làm mới dữ liệu từ Server Component.
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi xử lý NO_SHOW.";

      setError(message);

      // API xử lý theo từng transaction.
      // Nếu lỗi xảy ra giữa batch, một số lịch
      // trước đó có thể đã được cập nhật.
      router.refresh();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  const summary = result?.summary;

  return (
    <div className="w-full space-y-3 sm:w-auto">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setError("");
          setResult(null);
          setShowConfirm(true);
        }}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <Clock3 className="h-4 w-4" />
        Kiểm tra lịch quá hạn
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="process-no-shows-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <button
                type="button"
                aria-label="Đóng xác nhận"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2
              id="process-no-shows-title"
              className="mt-4 text-xl font-bold text-slate-900"
            >
              Xác nhận xử lý NO_SHOW?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Hệ thống sẽ kiểm tra các lịch đã quá
              15 phút kể từ giờ bắt đầu nhưng chưa
              check-in.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Lưu ý trước khi tiếp tục
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Những lịch đủ điều kiện sẽ chuyển
                sang NO_SHOW và tăng số lần vi phạm
                của sinh viên. Tài khoản đạt ngưỡng
                có thể bị cấm đặt phòng 7 ngày.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
                <p className="mt-2">
                  Nếu lỗi xảy ra giữa quá trình xử lý,
                  một số lịch có thể đã được cập nhật.
                  Hãy kiểm tra lại danh sách.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="min-h-11 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Quay lại
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleProcess}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1254A5] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Xác nhận xử lý"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !showConfirm && (
        <div
          role="alert"
          className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-semibold">
            Xử lý NO_SHOW gặp lỗi
          </p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs">
            Hãy kiểm tra lại dữ liệu trước khi thử lại.
          </p>
        </div>
      )}

      {result && (
        <div
          role="status"
          aria-live="polite"
          className="w-full max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm sm:w-80"
        >
          <div className="flex items-center gap-2 font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Đã hoàn tất lượt kiểm tra
          </div>

          <p className="mt-2 text-emerald-800">
            {result.message ||
              "Đã hoàn tất kiểm tra lịch quá hạn."}
          </p>

          <div className="mt-4 space-y-2 border-t border-emerald-200 pt-3 text-slate-700">
            {summary && (
              <ResultRow
                label="Lịch đã kiểm tra"
                value={summary.examinedCount}
              />
            )}

            <ResultRow
              label="Chuyển NO_SHOW"
              value={
                summary?.processedCount ??
                result.processedCount ??
                0
              }
            />

            {summary && (
              <ResultRow
                label="Lịch bỏ qua"
                value={summary.skippedCount}
              />
            )}

            <ResultRow
              label="Tài khoản bị cấm mới"
              value={
                summary?.bannedCount ??
                result.bannedCount ??
                0
              }
            />
          </div>

          {summary?.batchLimitReached && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Đã kiểm tra đủ {summary.batchSize} lịch
                trong một lượt. Có thể vẫn còn lịch quá
                hạn chưa được kiểm tra. Bạn có thể chạy
                lại sau khi kiểm tra kết quả.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-bold tabular-nums">
        {value}
      </span>
    </div>
  );
}
