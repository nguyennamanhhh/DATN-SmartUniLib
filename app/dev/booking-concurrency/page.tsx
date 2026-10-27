"use client";

import { useState } from "react";

type RequestResult = {
  request: number;
  status: number;
  message: string;
};

type RoundResult = {
  round: number;

  successCount: number;
  conflictCount: number;
  otherCount: number;

  passed: boolean;

  requests: RequestResult[];
};

type MultiUserSummary = {
  userCount: number;
  successCount: number;
  conflictCount: number;
  otherCount: number;
};

type MultiUserResult = {
  passed: boolean;
  message: string;
  summary: MultiUserSummary;
};

export default function BookingConcurrencyTestPage() {
  const [roomId, setRoomId] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [
    requestCount,
    setRequestCount,
  ] = useState(10);

  const [
    roundCount,
    setRoundCount,
  ] = useState(10);

  /*
   * Same-user test
   */
  const [results, setResults] =
    useState<RoundResult[]>([]);

  const [testing, setTesting] =
    useState(false);

  const [
    currentRound,
    setCurrentRound,
  ] = useState(0);

  /*
   * Multi-user test
   */
  const [
    multiUserTesting,
    setMultiUserTesting,
  ] = useState(false);

  const [
    multiUserResult,
    setMultiUserResult,
  ] =
    useState<MultiUserResult | null>(
      null,
    );

  /*
   * Validate dữ liệu chung cho cả hai test.
   */
  function validateInput() {
    if (!roomId.trim()) {
      alert("Hãy nhập Room ID");
      return false;
    }

    if (!startTime || !endTime) {
      alert(
        "Hãy nhập thời gian bắt đầu và kết thúc",
      );

      return false;
    }

    const parsedStart =
      new Date(startTime);

    const parsedEnd =
      new Date(endTime);

    if (
      Number.isNaN(
        parsedStart.getTime(),
      ) ||
      Number.isNaN(
        parsedEnd.getTime(),
      )
    ) {
      alert(
        "Thời gian không hợp lệ",
      );

      return false;
    }

    if (
      parsedEnd <= parsedStart
    ) {
      alert(
        "Giờ kết thúc phải sau giờ bắt đầu",
      );

      return false;
    }

    return true;
  }

  /*
   * Cleanup booking test của chính user.
   */
  async function cleanupTestBooking(
    startISO: string,
    endISO: string,
  ) {
    const response = await fetch(
      "/api/dev/booking-concurrency/reset",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          roomId,
          startTime: startISO,
          endTime: endISO,
        }),
      },
    );

    if (!response.ok) {
      let message =
        "Không thể cleanup dữ liệu test";

      try {
        const data =
          await response.json();

        if (data.message) {
          message = data.message;
        }
      } catch {
        // Ignore JSON parse error.
      }

      throw new Error(message);
    }
  }

  /*
   * Chạy một round cùng một user.
   */
  async function runSingleRound(
    round: number,
    startISO: string,
    endISO: string,
  ): Promise<RoundResult> {
    /*
     * Cleanup dữ liệu từ round trước.
     */
    await cleanupTestBooking(
      startISO,
      endISO,
    );

    /*
     * Gửi N request gần như đồng thời.
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
        ).then(
          async (
            response,
          ): Promise<RequestResult> => {
            let data: {
              message?: string;
            } = {};

            try {
              data =
                await response.json();
            } catch {
              // Response không phải JSON.
            }

            return {
              request: index + 1,

              status:
                response.status,

              message:
                data.message ??
                "Không có message",
            };
          },
        ),
    );

    const requestResults =
      await Promise.all(requests);

    const successCount =
      requestResults.filter(
        (result) =>
          result.status === 201,
      ).length;

    const conflictCount =
      requestResults.filter(
        (result) =>
          result.status === 409,
      ).length;

    const otherCount =
      requestResults.length -
      successCount -
      conflictCount;

    /*
     * PASS:
     *
     * 1 request tạo được booking
     * N - 1 request bị conflict.
     */
    const passed =
      successCount === 1 &&
      conflictCount ===
        requestCount - 1 &&
      otherCount === 0;

    /*
     * Cleanup booking thắng cuộc.
     */
    await cleanupTestBooking(
      startISO,
      endISO,
    );

    return {
      round,
      successCount,
      conflictCount,
      otherCount,
      passed,
      requests:
        requestResults,
    };
  }

  /*
   * SAME-USER TEST
   *
   * N request của cùng một Student.
   */
  async function runTest() {
    if (!validateInput()) {
      return;
    }

    if (
      requestCount < 2 ||
      requestCount > 50
    ) {
      alert(
        "Số request phải nằm trong khoảng 2-50",
      );

      return;
    }

    if (
      roundCount < 1 ||
      roundCount > 20
    ) {
      alert(
        "Số vòng test phải nằm trong khoảng 1-20",
      );

      return;
    }

    const parsedStart =
      new Date(startTime);

    const parsedEnd =
      new Date(endTime);

    const startISO =
      parsedStart.toISOString();

    const endISO =
      parsedEnd.toISOString();

    setTesting(true);
    setResults([]);
    setCurrentRound(0);

    try {
      const allResults:
        RoundResult[] = [];

      /*
       * Các round chạy tuần tự.
       *
       * Nhưng các request bên trong
       * một round chạy đồng thời.
       */
      for (
        let round = 1;
        round <= roundCount;
        round++
      ) {
        setCurrentRound(round);

        const result =
          await runSingleRound(
            round,
            startISO,
            endISO,
          );

        allResults.push(result);

        setResults([
          ...allResults,
        ]);
      }
    } catch (error) {
      console.error(
        "Concurrency test error:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Không thể chạy concurrency test",
      );
    } finally {
      /*
       * Cleanup lần cuối.
       */
      try {
        await cleanupTestBooking(
          startISO,
          endISO,
        );
      } catch (error) {
        console.error(
          "Final cleanup error:",
          error,
        );
      }

      setTesting(false);
      setCurrentRound(0);
    }
  }

  /*
   * MULTI-USER TEST
   *
   * N user khác nhau cùng tranh một Room.
   */
  async function runMultiUserTest() {
    if (!validateInput()) {
      return;
    }

    /*
     * API multi-user hiện hỗ trợ 2-20 user.
     */
    if (
      requestCount < 2 ||
      requestCount > 20
    ) {
      alert(
        "Multi-user test chỉ hỗ trợ từ 2 đến 20 user",
      );

      return;
    }

    const parsedStart =
      new Date(startTime);

    const parsedEnd =
      new Date(endTime);

    const startISO =
      parsedStart.toISOString();

    const endISO =
      parsedEnd.toISOString();

    setMultiUserTesting(true);
    setMultiUserResult(null);

    try {
      const response = await fetch(
        "/api/dev/booking-concurrency/multi-user",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            roomId,
            startTime: startISO,
            endTime: endISO,
            userCount:
              requestCount,
          }),
        },
      );

      let data:
        | MultiUserResult
        | {
            message?: string;
          };

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "Response multi-user không hợp lệ",
        );
      }

      if (!response.ok) {
        throw new Error(
          "message" in data &&
          data.message
            ? data.message
            : "Không thể chạy multi-user test",
        );
      }

      setMultiUserResult(
        data as MultiUserResult,
      );
    } catch (error) {
      console.error(
        "Multi-user test error:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Không thể chạy multi-user test",
      );
    } finally {
      setMultiUserTesting(false);
    }
  }

  /*
   * Tổng hợp SAME-USER results.
   */
  const passedRounds =
    results.filter(
      (result) =>
        result.passed,
    ).length;

  const failedRounds =
    results.length -
    passedRounds;

  const totalRequests =
    results.reduce(
      (total, result) =>
        total +
        result.requests.length,
      0,
    );

  const totalSuccess =
    results.reduce(
      (total, result) =>
        total +
        result.successCount,
      0,
    );

  const totalConflicts =
    results.reduce(
      (total, result) =>
        total +
        result.conflictCount,
      0,
    );

  const totalOther =
    results.reduce(
      (total, result) =>
        total +
        result.otherCount,
      0,
    );

  const isBusy =
    testing ||
    multiUserTesting;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Booking Concurrency Test
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Kiểm tra khả năng chống
            double-booking khi nhiều request
            cùng truy cập hệ thống gần như
            đồng thời.
          </p>
        </div>

        {/* Config */}
        <div className="space-y-5 rounded-xl border p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">
              Test configuration
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Sử dụng cùng cấu hình phòng và
              thời gian cho cả same-user và
              multi-user test.
            </p>
          </div>

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
              disabled={isBusy}
              className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 sm:text-sm"
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
                disabled={isBusy}
                className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 sm:text-sm"
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
                disabled={isBusy}
                className="w-full rounded-md border px-3 py-2 text-base disabled:opacity-50 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Request / User count
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
                disabled={isBusy}
                className="w-full rounded-md border px-3 py-2 disabled:opacity-50"
              />

              <p className="text-xs text-muted-foreground">
                Same-user: tối đa 50 request.
                Multi-user: tối đa 20 user.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Số vòng same-user test
              </label>

              <input
                type="number"
                min={1}
                max={20}
                value={roundCount}
                onChange={(event) =>
                  setRoundCount(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                disabled={isBusy}
                className="w-full rounded-md border px-3 py-2 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={runTest}
              disabled={isBusy}
              className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50 sm:w-auto"
            >
              {testing
                ? `Đang chạy vòng ${currentRound}/${roundCount}...`
                : `Run ${roundCount} same-user rounds`}
            </button>

            <button
              type="button"
              onClick={runMultiUserTest}
              disabled={isBusy}
              className="w-full rounded-md border px-4 py-2 font-medium disabled:opacity-50 sm:w-auto"
            >
              {multiUserTesting
                ? "Đang chạy multi-user test..."
                : `Run ${requestCount} users`}
            </button>
          </div>
        </div>

        {/* Multi-user result */}
        {multiUserResult && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">
                Multi-user Room Lock Test
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                N user khác nhau cùng tranh một
                phòng và một khoảng thời gian.
              </p>
            </div>

            <div className="rounded-xl border p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">
                Kết quả
              </p>

              <p className="mt-2 text-3xl font-bold">
                {multiUserResult.passed
                  ? "PASS"
                  : "FAIL"}
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {
                  multiUserResult.message
                }
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Users
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    multiUserResult
                      .summary
                      .userCount
                  }
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  201 Created
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    multiUserResult
                      .summary
                      .successCount
                  }
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  409 Conflict
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    multiUserResult
                      .summary
                      .conflictCount
                  }
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Other
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    multiUserResult
                      .summary
                      .otherCount
                  }
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Same-user results */}
        {results.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">
                Same-user Concurrency Test
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                N request của cùng một Student
                được gửi gần như đồng thời.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Tổng request
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalRequests}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  201 Created
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalSuccess}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  409 Conflict
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalConflicts}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Other
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {totalOther}
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">
                Kết quả tổng thể
              </p>

              <p className="mt-2 text-2xl font-bold">
                {passedRounds} /{" "}
                {results.length} PASS
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Failed:{" "}
                {failedRounds}
              </p>
            </div>

            {/* Round table */}
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left">
                      Round
                    </th>

                    <th className="p-3 text-left">
                      Requests
                    </th>

                    <th className="p-3 text-left">
                      201
                    </th>

                    <th className="p-3 text-left">
                      409
                    </th>

                    <th className="p-3 text-left">
                      Other
                    </th>

                    <th className="p-3 text-left">
                      Result
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {results.map(
                    (result) => (
                      <tr
                        key={
                          result.round
                        }
                        className="border-b last:border-0"
                      >
                        <td className="p-3">
                          #
                          {
                            result.round
                          }
                        </td>

                        <td className="p-3">
                          {
                            result
                              .requests
                              .length
                          }
                        </td>

                        <td className="p-3">
                          {
                            result
                              .successCount
                          }
                        </td>

                        <td className="p-3">
                          {
                            result
                              .conflictCount
                          }
                        </td>

                        <td className="p-3">
                          {
                            result
                              .otherCount
                          }
                        </td>

                        <td className="p-3 font-medium">
                          {result.passed
                            ? "PASS"
                            : "FAIL"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}