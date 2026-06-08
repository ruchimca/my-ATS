import { handleUpload } from "@vercel/blob/client";

// Issues short-lived tokens so the browser can upload resume files directly to
// Vercel Blob storage (keeps large files off the serverless function).
export async function POST(request) {
  const body = await request.json();
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB per resume
      }),
      onUploadCompleted: async () => {
        // No-op: the candidate row is created by the processResume server action.
      },
    });
    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: error?.message || "Upload failed" },
      { status: 400 },
    );
  }
}
