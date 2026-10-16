import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentReviewActions } from "@/components/document-review-actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminDocumentDetailPage({ params }: Props) {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: {
      id,
    },
    include: {
      uploader: true,
    },
  });

  if (!document) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{document.title}</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Trạng thái: {document.status}
          </p>
        </div>

        <div className="grid gap-4 rounded-lg border p-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Mã môn học</p>
            <p className="font-medium">{document.subjectCode}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Tên môn học</p>
            <p className="font-medium">{document.subjectName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Người tải</p>
            <p className="font-medium">
              {document.uploader.fullName || document.uploader.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Loại quyền sử dụng</p>
            <p className="font-medium">{document.copyrightType}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Mô tả</p>
            <p>{document.description || "Không có mô tả"}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Nguồn tài liệu</p>
            <p>{document.sourceUrl || "Không có"}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">
              Minh chứng quyền chia sẻ
            </p>
            <p>{document.permissionProofUrl || "Không có"}</p>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">File PDF</h2>

          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Mở file PDF
          </a>
        </div>

        {document.status === "PENDING" && (
          <DocumentReviewActions documentId={document.id} />
        )}

        {document.status === "REJECTED" && document.rejectionReason && (
          <div className="rounded-lg border p-6">
            <p className="font-medium">Lý do từ chối</p>
            <p className="mt-2">{document.rejectionReason}</p>
          </div>
        )}
      </div>
    </main>
  );
}