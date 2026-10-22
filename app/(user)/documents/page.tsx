import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function DocumentsPage() {
  await requireUser();

  const documents = await prisma.document.findMany({
    where: {
      status: "APPROVED",
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
        <h1 className="text-2xl font-bold">Thư viện tài liệu</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Danh sách tài liệu đã được kiểm duyệt
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.length === 0 ? (
            <p>Chưa có tài liệu nào được duyệt.</p>
          ) : (
            documents.map((document) => (
              <div
                key={document.id}
                className="rounded-lg border p-5"
              >
                <h2 className="font-semibold">
                  {document.title}
                </h2>

                <p className="mt-2 text-sm">
                  {document.subjectCode} - {document.subjectName}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Người tải:{" "}
                  {document.uploader.fullName ||
                    document.uploader.email}
                </p>

                <a
                  href={`/documents/${document.id}`}
                  className="mt-4 inline-block underline"
                >
                  Xem chi tiết
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}