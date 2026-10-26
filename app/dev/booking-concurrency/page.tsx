"use client";

import { useState } from "react";

type TestResult = {
  request: number;
  status: number;
  message: string;
};

export default function BookingConcurrencyTestPage() {
  const [roomId, setRoomId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [requestCount, setRequestCount] =
    useState(10);

  const [results, setResults] = useState<
    TestResult[]
  >([]);

  const [testing, setTesting] =
    useState(false);

  async function runTest() {
    if (!roomId.trim()) {
      alert("Hãy nhập Room ID");
      return;
    }

    if (!startTime || !endTime) {
      alert(
        "Hãy nhập thời gian bắt đầu và kết thúc",
      );
      return;
    }

    if (
      requestCount < 2 ||
      requestCount > 50
    ) {
      alert(
        "Số request nên nằm trong khoảng 2-50",
      );
      return;
    }

    setTesting(true);
    setResults([]);

    try {
      /*
       * datetime-local của browser là giờ địa phương.
       * Chuyển sang ISO UTC trước khi gửi API.
       */
      const startISO =
        new Date(startTime).toISOString();

      const endISO =
        new Date(endTime).toISOString();

      /*
       * Tạo N request nhưng chưa await từng request.
       *
       * Promise.all() khiến chúng được gửi gần như
       * đồng thời.
       */
      const requests = Array.from(
        {
          length: requestCount,
        },
        (_, index) =>
          fetch(
            `/api/rooms/${roomId}/book`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                startTime: startISO,
                endTime: endISO,
              }),
            },
          ).then(async (response) => {
            let data: {
              message?: string;
            } = {};

            try {
              data = await response.json();
            } catch {
              // Nếu response không phải JSON.
            }

            return {
              request: index + 1,
              status: response.status,
              message:
                data.message ??
                "Không có message",
            };
          }),
      );

      const testResults =
        await Promise.all(requests);

      setResults(testResults);
    } catch (error) {
      console.error(
        "Concurrency test error:",
        error,
      );

      alert(
        "Không thể chạy concurrency test",
      );
    } finally {
      setTesting(false);
    }
  }

  const successCount =
    results.filter(
      (result) =>
        result.status === 201,
    ).length;

  const conflictCount =
    results.filter(
      (result) =>
        result.status === 409,
    ).length;

  const otherCount =
    results.length -
    successCount -
    conflictCount;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Booking Concurrency Test
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Gửi nhiều request đặt cùng
            phòng/cùng thời gian gần như đồng
            thời.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Room ID
            </label>

            <input
              value={roomId}
              onChange={(event) =>
                setRoomId(
                  event.target.value,
                )
              }
              placeholder="Nhập Room ID"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Start time
              </label>

              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) =>
                  setStartTime(
                    event.target.value,
                  )
                }
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                End time
              </label>

              <input
                type="datetime-local"
                value={endTime}
                onChange={(event) =>
                  setEndTime(
                    event.target.value,
                  )
                }
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Số request đồng thời
            </label>

            <input
              type="number"
              min={2}
              max={50}
              value={requestCount}
              onChange={(event) =>
                setRequestCount(
                  Number(
                    event.target.value,
                  ),
                )
              }
              className="w-full rounded-md border px-3 py-2 sm:w-40"
            />
          </div>

          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {testing
              ? "Đang test..."
              : "Run concurrency test"}
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  201 Created
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {successCount}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  409 Conflict
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {conflictCount}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Khác
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {otherCount}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left">
                      Request
                    </th>

                    <th className="p-3 text-left">
                      Status
                    </th>

                    <th className="p-3 text-left">
                      Message
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {results.map(
                    (result) => (
                      <tr
                        key={
                          result.request
                        }
                        className="border-b last:border-0"
                      >
                        <td className="p-3">
                          #
                          {
                            result.request
                          }
                        </td>

                        <td className="p-3">
                          {
                            result.status
                          }
                        </td>

                        <td className="p-3">
                          {
                            result.message
                          }
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}