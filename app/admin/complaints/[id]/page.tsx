import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ComplaintReviewActions } from "@/components/complaint-review-actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ComplaintDetailPage({ params }: Props) {
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const { id } = await params;

  const complaint = await prisma.documentComplaint.findUnique({
    where: {
      id,
    },
    include: {
      document: {
        include: {
          uploader: true,
        },
      },
      complainant: true,
      resolvedBy: true,
    },
  });

  if (!complaint) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Chi tiết khiếu nại
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Trạng thái: {complaint.status}
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">
            Thông tin tài liệu
          </h2>

          <div className="mt-4 space-y-3">
            <p>
              <strong>Tiêu đề:</strong>{" "}
              {complaint.document.title}
            </p>

            <p>
              <strong>Môn học:</strong>{" "}
              {complaint.document.subjectCode} -{" "}
              {complaint.document.subjectName}
            </p>

            <p>
              <strong>Người tải:</strong>{" "}
              {complaint.document.uploader.fullName ||
                complaint.document.uploader.email}
            </p>

            <p>
              <strong>Trạng thái:</strong>{" "}
              {complaint.document.status}
            </p>

            <a
              href={complaint.document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block underline"
            >
              Mở PDF
            </a>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">
            Nội dung khiếu nại
          </h2>

          <div className="mt-4 space-y-3">
            <p>
              <strong>Người gửi:</strong>{" "}
              {complaint.complainant?.fullName ||
                complaint.complainantName ||
                complaint.complainantEmail ||
                "Không xác định"}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {complaint.complainantEmail || "Không có"}
            </p>

            <p>
              <strong>Lý do:</strong> {complaint.reason}
            </p>
          </div>
        </div>

        {complaint.status === "PENDING" && (
          <ComplaintReviewActions complaintId={complaint.id} />
        )}
      </div>
    </main>
  );
}