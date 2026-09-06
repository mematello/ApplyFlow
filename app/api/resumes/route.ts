import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const versionLabel = formData.get('version_label') as string;
    const isCurrentStr = formData.get('is_current') as string;
    const isCurrent = isCurrentStr === 'true';

    if (!file || !versionLabel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Validate File Size (Server Side - 5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
    }

    // 2. Validate Extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      return NextResponse.json({ error: "Only PDF and DOCX files are allowed" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 3. Process File Content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = null;
    try {
      if (ext === 'pdf') {
        if (typeof (globalThis as unknown as Record<string, unknown>).DOMMatrix === 'undefined') {
          const canvas = await import('@napi-rs/canvas');
          Object.assign(globalThis, {
            DOMMatrix: canvas.DOMMatrix,
            ImageData: canvas.ImageData,
            Path2D: canvas.Path2D
          });
        }
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        await parser.destroy();
        extractedText = data.text.trim();
      } else if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      }
    } catch (err: unknown) {
      console.error("Text extraction failed:", (err as Error).message);
      // Graceful fallback: we will save it with extractedText = null
    }

    // 4. Safe Filename
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const timestamp = Date.now();
    const storagePath = `${user.id}/${timestamp}-${safeFilename}`;

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload to storage: " + uploadError.message }, { status: 500 });
    }

    // 6. DB Updates
    if (isCurrent) {
      // Unset current on existing resumes for this user
      await supabase.from('resumes').update({ is_current: false }).eq('user_id', user.id);
    }

    const { data: resumeRecord, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        version_label: versionLabel,
        storage_path: storagePath,
        extracted_text: extractedText,
        is_current: isCurrent
      })
      .select()
      .single();

    if (dbError) {
      // Attempt to rollback storage upload
      await supabase.storage.from('resumes').remove([storagePath]);
      return NextResponse.json({ error: "Database insertion failed: " + dbError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: resumeRecord,
      extractionFailed: extractedText === null
    });
  } catch (error: unknown) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal server error" }, { status: 500 });
  }
}
