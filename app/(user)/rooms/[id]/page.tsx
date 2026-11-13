
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DoorOpen,
  Info,
  ShieldCheck,
  Users,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoomBookingForm } from "@/components/room-booking-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RoomDetailPage({
  params,
}: Props) {
  // Giữ nguyên xác thực người dùng.
  await requireUser();

  const { id } = await params;

  // Chỉ truy vấn phòng theo ID.
  const room = await prisma.room.findUnique({
    where: {
      id,
    },
  });

  // Phòng không tồn tại hoặc không mở đặt lịch.
  if (!room || !room.isAvailable) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

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

          <Link
            href="/rooms"
            className="transition hover:text-blue-700"
          >
            Đặt phòng học
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="font-medium text-slate-700">
            Chi tiết phòng
          </span>
        </nav>

        {/* Quay lại */}
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách phòng
        </Link>

        {/* Tiêu đề trang */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <BookOpen className="h-4 w-4" />
            KHÔNG GIAN HỌC TẬP
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Chi tiết và đặt phòng học
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Xem thông tin phòng, lựa chọn ngày và
            khung giờ phù hợp để đặt lịch học tập.
          </p>
        </section>

        {/* Thông tin phòng */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Banner phòng */}
          <div className="relative flex min-h-44 items-center justify-center overflow-hidden bg-gradient-to-r from-[#17468D] via-[#1768C4] to-[#03A7CE] p-6 sm:min-h-52">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[32px] border-white/10" />

            <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full border-[40px] border-white/10" />

            <div className="relative flex flex-col items-center gap-3 text-center text-white">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/15 shadow-lg">
                <DoorOpen className="h-10 w-10" />
              </div>

              <span className="text-xs font-bold tracking-[0.2em] text-blue-100">
                SMARTUNILIB
              </span>
            </div>
          </div>

          {/* Chi tiết */}
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
                  Phòng {room.name}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Không gian dành cho hoạt động học tập,
                  trao đổi và làm việc nhóm.
                </p>
              </div>

              <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Đang mở đặt lịch
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={Users}
                label="Sức chứa"
                value={`${room.capacity} người`}
              />

              <InfoCard
                icon={Clock3}
                label="Thời lượng mỗi lượt"
                value="Tối đa 2 giờ"
              />

              <InfoCard
                icon={CalendarClock}
                label="Bước khung giờ"
                value="15 phút"
              />

              <InfoCard
                icon={ShieldCheck}
                label="Trạng thái phòng"
                value="Đang mở đặt lịch"
              />
            </div>
          </div>
        </section>

        {/* Form đặt phòng */}
        <section
          aria-labelledby="booking-heading"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1254A5] text-white">
                <CalendarDays className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h2
                  id="booking-heading"
                  className="text-xl font-bold text-slate-900"
                >
                  Đặt lịch sử dụng phòng
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Chọn ngày, thời gian bắt đầu và kết thúc
                  theo các lựa chọn của hệ thống.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-7">
            {/* Giữ nguyên component nghiệp vụ */}
            <RoomBookingForm
              roomId={room.id}
              roomName={room.name}
            />
          </div>
        </section>

        {/* Hướng dẫn đặt phòng */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-blue-900">
                Một số lưu ý khi đặt phòng
              </h2>

              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-blue-800">
                <li>
                  Mỗi lượt đặt phòng có thời lượng tối đa
                  2 giờ.
                </li>

                <li>
                  Chọn thời gian theo các bước 15 phút.
                </li>

                <li>
                  Hệ thống kiểm tra trùng lịch trước khi
                  xác nhận đặt phòng.
                </li>

                <li>
                  Vui lòng check-in đúng giờ.
                  Nếu quá 15 phút mà chưa check-in,
                  lịch có thể bị xử lý theo chính sách
                  của thư viện.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Điều hướng */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/rooms"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Chọn phòng khác
          </Link>

          <Link
            href="/bookings"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1254A5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <CalendarDays className="h-4 w-4" />
            Xem lịch đặt của tôi
          </Link>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}
