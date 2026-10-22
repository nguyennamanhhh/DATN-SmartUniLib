"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock3,
} from "lucide-react";

type Props = {
  roomId: string;
  roomName: string;
};

export function RoomBookingForm({
  roomId,
  roomName,
}: Props) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!date || !startTime || !endTime) {
      alert("Vui lòng nhập đầy đủ ngày và thời gian.");
      return;
    }

    /*
     * Trình duyệt hiểu đây là giờ local của người dùng,
     * sau đó chuyển thành ISO để gửi lên server.
     */
    const start = new Date(
      `${date}T${startTime}:00`,
    );

    const end = new Date(
      `${date}T${endTime}:00`,
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      alert("Thời gian không hợp lệ.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/rooms/${roomId}/book`,
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

      alert("Đặt phòng thành công!");

      setDate("");
      setStartTime("");
      setEndTime("");
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-white p-4 sm:p-6"
    >
      {/* Header */}
      <div>
        <h2 className="wrap-break-word text-lg font-semibold">
          Đặt phòng {roomName}
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Chọn ngày và khung giờ bạn muốn sử dụng phòng.
        </p>
      </div>

      {/* Quy định */}
      <div className="mt-5 rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium">
          Quy định đặt phòng
        </p>

        <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
          <li>• Mỗi lượt đặt tối đa 2 giờ.</li>
          <li>• Thời gian đặt theo bước 15 phút.</li>
          <li>• Chỉ được đặt trước tối đa 2 ngày.</li>
        </ul>
      </div>

      <div className="mt-6 space-y-5">
        {/* Ngày */}
        <Field
          icon={CalendarDays}
          label="Ngày sử dụng"
        >
          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
            required
            className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
          />
        </Field>

        {/* Giờ */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            icon={Clock3}
            label="Giờ bắt đầu"
          >
            <input
              type="time"
              step="900"
              value={startTime}
              onChange={(e) =>
                setStartTime(e.target.value)
              }
              required
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
            />
          </Field>

          <Field
            icon={Clock3}
            label="Giờ kết thúc"
          >
            <input
              type="time"
              step="900"
              value={endTime}
              onChange={(e) =>
                setEndTime(e.target.value)
              }
              required
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none transition focus:border-black sm:text-sm"
            />
          </Field>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Đang đặt..."
          : "Đặt phòng"}
      </button>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 shrink-0 text-gray-500" />

        {label}
      </label>

      {children}
    </div>
  );
}