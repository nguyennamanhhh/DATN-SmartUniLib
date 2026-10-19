import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, { params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: {
      id,
    },
  });

  if (!document) {
    return NextResponse.json(
      { message: "Không tìm thấy tài liệu" },
      { status: 404 }
    );
  }

  if (document.status !== "APPROVED") {
    return NextResponse.json(
      { message: "Bạn không có quyền tải tài liệu này" },
      { status: 403 }
    );
  }

  return NextResponse.redirect(document.fileUrl);
}