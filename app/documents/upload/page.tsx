import { requireUser } from "@/lib/auth";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default async function UploadDocumentPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Tải tài liệu lên</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Người tải: {user.fullName || user.email}
        </p>

        <div className="mt-8 rounded-lg border p-6">
          <DocumentUploadForm />
        </div>
      </div>
    </main>
  );
}