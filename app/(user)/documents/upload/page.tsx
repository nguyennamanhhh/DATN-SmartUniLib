import { FileUp } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default async function UploadDocumentPage() {
  await requireUser();

  return (
    <main className="p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader
          title="Tải tài liệu lên"
          description="Chia sẻ tài liệu học tập để được kiểm duyệt trước khi xuất hiện trong thư viện số."
        />

        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <FileUp className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-medium">
              Tài liệu sẽ được kiểm duyệt
            </p>

            <p className="mt-1">
              Sau khi tải lên, tài liệu sẽ ở trạng thái chờ duyệt.
              Chỉ tài liệu được Librarian/Admin chấp nhận mới xuất
              hiện trong thư viện số.
            </p>
          </div>
        </div>

        <DocumentUploadForm />
      </div>
    </main>
  );
}