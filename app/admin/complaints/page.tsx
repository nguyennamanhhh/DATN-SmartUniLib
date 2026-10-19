import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminComplaintsPage() {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const complaints = await prisma.documentComplaint.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      document: true,
      complainant: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">Khiếu nại bản quyền</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Danh sách khiếu nại đang chờ xử lý
        </p>

        <div className="mt-8 overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted">
              <tr>
                <th className="p-4">Tài liệu</th>
                <th className="p-4">Người khiếu nại</th>
                <th className="p-4">Lý do</th>
                <th className="p-4">Ngày gửi</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {complaints.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Không có khiếu nại nào đang chờ xử lý.
                  </td>
                </tr>
              ) : (
                complaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="p-4 font-medium">
                      {complaint.document.title}
                    </td>

                    <td className="p-4">
                      {complaint.complainant?.fullName ||
                        complaint.complainantName ||
                        complaint.complainantEmail ||
                        "Không xác định"}
                    </td>

                    <td className="max-w-xs p-4">
                      {complaint.reason}
                    </td>

                    <td className="p-4">
                      {complaint.createdAt.toLocaleString("vi-VN")}
                    </td>

                    <td className="p-4">
                      <a
                        href={`/admin/complaints/${complaint.id}`}
                        className="underline"
                      >
                        Xem chi tiết
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}