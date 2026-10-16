import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDocumentsPage() {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const documents = await prisma.document.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      uploader: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">
          Tài liệu chờ duyệt
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Danh sách tài liệu đang ở trạng thái PENDING
        </p>

        <div className="mt-8 overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted">
              <tr>
                <th className="p-4">Tiêu đề</th>
                <th className="p-4">Môn học</th>
                <th className="p-4">Người tải</th>
                <th className="p-4">Ngày tải</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    Không có tài liệu nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr
                    key={document.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="p-4 font-medium">
                      {document.title}
                    </td>

                    <td className="p-4">
                      {document.subjectCode} -{" "}
                      {document.subjectName}
                    </td>

                    <td className="p-4">
                      {document.uploader.fullName ||
                        document.uploader.email}
                    </td>

                    <td className="p-4">
                      {document.createdAt.toLocaleString("vi-VN")}
                    </td>

                    <td className="p-4">
                      <a
                        href={`/admin/documents/${document.id}`}
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