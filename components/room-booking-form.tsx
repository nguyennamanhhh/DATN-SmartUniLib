"use client";

import { useState } from "react";

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

  async function handleSubmit(e: React.FormEvent) {
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
      `${date}T${startTime}:00`
    );

    const end = new Date(
      `${date}T${endTime}:00`
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể đặt phòng"
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
      className="space-y-5 rounded-lg border p-6"
    >
      <div>
        <h2 className="text-lg font-semibold">
          Đặt phòng {roomName}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Mỗi lượt đặt tối đa 2 giờ. Thời gian theo bước
          15 phút.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Ngày sử dụng
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Giờ bắt đầu
        </label>

        <input
          type="time"
          step="900"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Giờ kết thúc
        </label>

        <input
          type="time"
          step="900"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Đang đặt..." : "Đặt phòng"}
      </button>
    </form>
  );
}