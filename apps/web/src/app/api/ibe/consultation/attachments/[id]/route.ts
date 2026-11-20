import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
} from "@/lib/ibe-consultation/access";
import { readAuthorizedAppointmentAttachment } from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireIbeConsultationActor(request, [
    "STUDENT",
    "INSTRUCTOR",
  ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "1";

    const file = await readAuthorizedAppointmentAttachment(auth.actor, id);
    const safeName = file.originalFileName.replace(/["\\\r\n]/g, "_");
    const disposition = `${
      download ? "attachment" : "inline"
    }; filename="${safeName}"`;

    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.bytes.byteLength),
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

