
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DoorOpen,
  Info,
  Users,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roomColors = [
  "from-blue-800 via-blue-600 to-cyan-500",
  "from-teal-800 via-teal-600 to-emerald-400",
  "from-indigo-900 via-indigo-600 to-violet-400",
  "from-sky-900 via-sky-600 to-blue-400",
  "from-emerald-900 via-emerald-600 to-teal-400",
  "from-violet-900 via-purple-600 to-pink-400",
];

export default async function RoomsPage() {
  // Giữ nguyên xác thực người dùng.
  await requireUser();

  // Giữ nguyên điều kiện lọc phòng của dự án.
  const rooms = await prisma.room.findMany({
    where: {
      isAvailable: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Đường dẫn trang"
          className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
        >
          <Link
            href="/dashboard"
            className="transition hover:text-blue-700"
          >
            Trang chủ
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="font-medium text-slate-700">
            Đặt phòng học
          </span>
        </nav>

        {/* Tiêu đề */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <BookOpen className="h-4 w-4" />
            KHÔNG GIAN HỌC TẬP
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Đặt phòng học trực tuyến
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Lựa chọn không gian học tập phù hợp,
            xem lịch sử dụng và đặt phòng theo khung giờ.
          </p>
        </section>

        {/* Thống kê nhanh */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            icon={DoorOpen}
            title="Phòng mở đặt lịch"
            value={String(rooms.length)}
            description="Số phòng hiện được phép đặt"
          />

          <SummaryCard
            icon={Clock3}
            title="Thời lượng mỗi lượt"
            value="Tối đa 2 giờ"
            description="Theo chính sách đặt phòng"
          />

          <SummaryCard
            icon={CalendarClock}
            title="Bước khung giờ"
            value="15 phút"
            description="Chọn thời gian theo khung giờ"
          />
        </section>

        {/* Hướng dẫn */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-blue-900">
                Hướng dẫn đặt phòng
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Chọn một phòng bên dưới để xem lịch
                và chọn khung giờ. Hệ thống sẽ kiểm tra
                trùng lịch khi bạn gửi yêu cầu đặt phòng.
                Mỗi lượt đặt tối đa 2 giờ.
              </p>
            </div>
          </div>
        </section>

        {/* Danh sách phòng */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Danh sách phòng học
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Có {rooms.length} phòng đang mở đặt lịch
              </p>
            </div>

            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <CalendarDays className="h-4 w-4" />
              Lịch đặt của tôi
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {rooms.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <DoorOpen className="h-8 w-8 text-slate-400" />
              </div>

              <h3 className="text-lg font-bold text-slate-800">
                Chưa có phòng mở đặt lịch
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Hiện tại chưa có phòng nào được mở
                cho sinh viên đặt lịch. Vui lòng kiểm
                tra lại sau.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {rooms.map((room, index) => {
                const cover =
                  roomColors[index % roomColors.length];

                return (
                  <article
                    key={room.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                  >
                    {/* Ảnh minh họa phòng bằng CSS */}
                    <div
                      className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${cover}`}
                    >
                      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border-[22px] border-white/10" />

                      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full border-[26px] border-white/10" />

                      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
                        <DoorOpen className="h-10 w-10 text-white" />
                      </div>

                      <span className="absolute bottom-3 left-4 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                        Phòng học
                      </span>
                    </div>

                    {/* Nội dung phòng */}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Đang mở đặt lịch
                      </div>

                      <h3 className="break-words text-lg font-bold text-slate-900 transition group-hover:text-blue-700">
                        Phòng {room.name}
                      </h3>

                      <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />

                        <span>
                          Sức chứa:{" "}
                          <strong className="font-semibold text-slate-800">
                            {room.capacity} người
                          </strong>
                        </span>
                      </div>

                      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5">
                        <p className="text-xs leading-5 text-slate-500">
                          Chọn phòng để kiểm tra
                          lịch trống và đặt khung giờ.
                        </p>
                      </div>

                      <Link
                        href={`/rooms/${room.id}`}
                        className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1254A5] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                        style={{ marginTop: "1.5rem" }}
                      >
                        Xem và đặt phòng
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
