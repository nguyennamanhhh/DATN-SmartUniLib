import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DocumentComplaintForm } from "@/components/document-complaint-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DocumentDetailPage({ params }: Props) {
  await requireUser();

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: {
      id,
    },
    include: {
      uploader: true,
    },
  });

  if (!document || document.status !== "APPROVED") {
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{document.title}</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {document.subjectCode} - {document.subjectName}
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Người tải</p>
              <p>
                {document.uploader.fullName || document.uploader.email}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Mô tả</p>
              <p>{document.description || "Không có mô tả"}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Loại quyền sử dụng
              </p>
              <p>{document.copyrightType}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Nguồn tài liệu</p>
              <p>{document.sourceUrl || "Không có"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Tài liệu PDF</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {document.fileName || "Tài liệu PDF"}
          </p>

          <a
            href={`/api/documents/${document.id}/download`}
            className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-white"
          >
            Tải tài liệu
          </a>
        </div>
        <DocumentComplaintForm documentId={document.id} />
      </div>
    </main>
  );
}