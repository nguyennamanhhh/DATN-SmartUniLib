
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";

type Props = {
  roomId: string;
  roomName: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const MAX_DURATION_MINUTES = 120;
const MAX_ADVANCE_DAYS = 2;

function timeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${remaining} phút`;
  if (remaining === 0) return `${hours} giờ`;

  return `${hours} giờ ${remaining} phút`;
}

function formatSelectedDate(value: string): string {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function RoomBookingForm({
  roomId,
  roomName,
}: Props) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const duration =
    startMinutes !== null && endMinutes !== null
      ? endMinutes - startMinutes
      : null;

  const validDuration =
    duration !== null &&
    duration > 0 &&
    duration <= MAX_DURATION_MINUTES;

  const validQuarterHour =
    startMinutes !== null &&
    endMinutes !== null &&
    startMinutes % 15 === 0 &&
    endMinutes % 15 === 0;

  function updateDate(value: string) {
    setDate(value);
    setNotice(null);
  }

  function updateStartTime(value: string) {
    setStartTime(value);
    setNotice(null);
  }

  function updateEndTime(value: string) {
    setEndTime(value);
    setNotice(null);
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (loading) return;

    setNotice(null);

    if (!date || !startTime || !endTime) {
      setNotice({
        type: "error",
        message: "Vui lòng nhập đầy đủ ngày và thời gian.",
      });
      return;
    }

    if (!validDuration || !validQuarterHour) {
      setNotice({
        type: "error",
        message:
          "Khung giờ phải theo bước 15 phút, " +
          "giờ kết thúc sau giờ bắt đầu và " +
          "thời lượng tối đa 2 giờ.",
      });
      return;
    }

    // Giữ cách tạo thời gian local rồi chuyển ISO
    // như component gốc của dự án.
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setNotice({
        type: "error",
        message: "Thời gian không hợp lệ.",
      });
      return;
    }

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const lastAllowedDate = new Date(today);
    lastAllowedDate.setDate(
      lastAllowedDate.getDate() + MAX_ADVANCE_DAYS,
    );

    const selectedDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );

    if (
      selectedDay < today ||
      selectedDay > lastAllowedDate
    ) {
      setNotice({
        type: "error",
        message:
          "Bạn chỉ có thể đặt từ hôm nay " +
          "đến tối đa 2 ngày tiếp theo.",
      });
      return;
    }

    if (start <= now) {
      setNotice({
        type: "error",
        message: "Giờ bắt đầu phải ở trong tương lai.",
      });
      return;
    }

    if (end <= start) {
      setNotice({
        type: "error",
        message: "Giờ kết thúc phải sau giờ bắt đầu.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/book`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể đặt phòng",
        );
      }

      setNotice({
        type: "success",
        message:
          `Đặt phòng ${roomName} thành công! ` +
          "Bạn có thể xem lịch trong mục Lịch đặt của tôi.",
      });

      setDate("");
      setStartTime("");
      setEndTime("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra";

      setNotice({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Thông tin form */}
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-700" />

          <h3 className="text-lg font-bold text-slate-900">
            Chọn thời gian sử dụng
          </h3>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Bạn đang đặt phòng{" "}
          <span className="font-semibold text-blue-700">
            {roomName}
          </span>
          . Vui lòng chọn ngày và khung giờ.
        </p>
      </div>

      {/* Quy định */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <div>
            <p className="text-sm font-bold text-blue-900">
              Quy định đặt phòng
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-blue-800">
              <li>Mỗi lượt đặt tối đa 2 giờ.</li>
              <li>Thời gian theo bước 15 phút.</li>
              <li>Chỉ đặt trước tối đa 2 ngày.</li>
              <li>Khung giờ phải còn trống khi gửi yêu cầu.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Trường nhập */}
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <Field
          id="booking-date"
          icon={CalendarDays}
          label="Ngày sử dụng"
        >
          <input
            id="booking-date"
            type="date"
            value={date}
            onChange={(e) => updateDate(e.target.value)}
            required
            disabled={loading}
            className="h-12 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:text-sm"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="booking-start"
            icon={Clock3}
            label="Giờ bắt đầu"
          >
            <input
              id="booking-start"
              type="time"
              step={900}
              value={startTime}
              onChange={(e) =>
                updateStartTime(e.target.value)
              }
              required
              disabled={loading}
              className="h-12 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:text-sm"
            />
          </Field>

          <Field
            id="booking-end"
            icon={Clock3}
            label="Giờ kết thúc"
          >
            <input
              id="booking-end"
              type="time"
              step={900}
              value={endTime}
              onChange={(e) =>
                updateEndTime(e.target.value)
              }
              required
              disabled={loading}
              className="h-12 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:text-sm"
            />
          </Field>
        </div>

        {/* Tóm tắt */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-blue-700" />

            <h4 className="text-sm font-bold text-slate-900">
              Tóm tắt lịch đặt
            </h4>
          </div>

          <div className="space-y-3 text-sm">
            <SummaryRow
              label="Phòng học"
              value={roomName}
            />

            <SummaryRow
              label="Ngày sử dụng"
              value={
                date
                  ? formatSelectedDate(date)
                  : "Chưa chọn"
              }
            />

            <SummaryRow
              label="Bắt đầu"
              value={startTime || "Chưa chọn"}
            />

            <SummaryRow
              label="Kết thúc"
              value={endTime || "Chưa chọn"}
            />

            <div className="border-t border-slate-200 pt-3">
              <SummaryRow
                label="Tổng thời lượng"
                value={
                  duration !== null && duration > 0
                    ? formatDuration(duration)
                    : "Chưa xác định"
                }
                emphasized
              />
            </div>
          </div>

          {duration !== null && !validDuration && (
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Thời lượng không hợp lệ.
              Mỗi lượt đặt tối đa 2 giờ.
            </p>
          )}

          {duration !== null &&
            validDuration &&
            !validQuarterHour && (
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Vui lòng chọn giờ theo mốc 15 phút.
              </p>
            )}
        </div>
      </div>

      {/* Lưu ý */}
      <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

        <p className="text-sm leading-6 text-slate-600">
          Việc chọn thời gian không giữ chỗ trước.
          Lịch chỉ được xác nhận khi hệ thống xử lý
          thành công yêu cầu đặt phòng.
        </p>
      </div>

      {/* Thông báo kết quả */}
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          aria-live={notice.type === "success" ? "polite" : undefined}
          className={`rounded-xl border p-4 ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-start gap-3">
            {notice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}

            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {notice.type === "success"
                  ? "Đặt phòng thành công"
                  : "Không thể đặt phòng"}
              </p>

              <p className="mt-1 break-words text-sm leading-6">
                {notice.message}
              </p>

              {notice.type === "success" && (
                <Link
                  href="/bookings"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
                >
                  Xem lịch đặt của tôi
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nút gửi */}
      <button
        type="submit"
        disabled={
          loading ||
          !date ||
          !validDuration ||
          !validQuarterHour
        }
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1254A5] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang xử lý đặt phòng...
          </>
        ) : (
          <>
            <CalendarCheck2 className="h-5 w-5" />
            Xác nhận đặt phòng
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  icon: Icon,
  label,
  children,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
      >
        <Icon className="h-4 w-4 shrink-0 text-blue-700" />
        {label}
        <span className="text-red-500">*</span>
      </label>

      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-slate-500">
        {label}
      </span>

      <span
        className={`min-w-0 break-words text-right ${
          emphasized
            ? "font-bold text-blue-700"
            : "font-medium text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
