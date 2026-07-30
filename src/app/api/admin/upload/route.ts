import { NextResponse } from "next/server";
import { getSessionUser, canWrite } from "@/lib/auth";
import { processAndStore } from "@/lib/uploads";

const FOLDERS = ["products", "gallery", "hero", "brand", "sections"] as const;
type Folder = (typeof FOLDERS)[number];

/** Authenticated image upload. Returns the stored URL. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!canWrite(user.role)) {
    return NextResponse.json({ error: "Read-only access." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  const folderInput = String(form.get("folder") ?? "products");
  const folder = (FOLDERS as readonly string[]).includes(folderInput)
    ? (folderInput as Folder)
    : "products";

  /*
    Anything thrown in here must still come back as JSON. The client reads the
    response with res.json(), so an unhandled throw returns Next's HTML error
    page, res.json() throws in turn, and the shop is shown the generic
    "check your connection" instead of the actual reason.
  */
  let result;
  try {
    result = await processAndStore(file, folder);
  } catch (e) {
    console.error("upload failed", e);
    return NextResponse.json(
      { error: "The server could not process that file. Try a smaller one." },
      { status: 500 },
    );
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    url: result.url,
    kind: result.kind,
    posterUrl: result.posterUrl ?? null,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  });
}
