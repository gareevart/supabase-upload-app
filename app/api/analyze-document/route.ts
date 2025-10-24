import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadMammoth } from '@/lib/mammoth-loader';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get auth header from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { documentUrl, fileName, fileType } = await request.json();

    if (!documentUrl) {
      return NextResponse.json(
        { error: 'Document URL is required' },
        { status: 400 }
      );
    }

    console.log('Analyzing document:', { documentUrl, fileName, fileType });

    // Download document from URL
    const docResponse = await fetch(documentUrl);
    if (!docResponse.ok) {
      throw new Error(`Failed to download document: ${docResponse.status}`);
    }

    const docBuffer = await docResponse.arrayBuffer();
    console.log('Document downloaded, size:', docBuffer.byteLength, 'bytes');

    let extractedText = '';

    // Handle .docx files (Office Open XML)
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')) {
      // Load mammoth dynamically
      const mammoth = await loadMammoth();
      const result = await mammoth.extractRawText({ buffer: Buffer.from(docBuffer) });
      extractedText = result.value;
      console.log('DOCX parsed, text length:', extractedText.length);
    }
    // Handle .doc files (older Word format) - mammoth doesn't support this well
    else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      return NextResponse.json(
        {
          error: 'Старый формат .doc не поддерживается. Пожалуйста, конвертируйте файл в .docx',
          text: '',
          description: '',
          success: false
        },
        { status: 400 }
      );
    }
    else {
      return NextResponse.json(
        {
          error: 'Unsupported document format',
          text: '',
          description: '',
          success: false
        },
        { status: 400 }
      );
    }

    // Create a comprehensive description
    let fullDescription = '';

    if (extractedText && extractedText.trim()) {
      // Limit text to first 3000 characters to avoid token overflow
      const truncatedText = extractedText.length > 3000
        ? extractedText.substring(0, 3000) + '...'
        : extractedText;

      fullDescription = `Word документ "${fileName || 'документ'}":\n\n${truncatedText}`;
    } else {
      fullDescription = `Word документ "${fileName || 'документ'}" - текст не обнаружен или документ пустой`;
    }

    console.log('Final document analysis result:', {
      extractedTextLength: extractedText.length,
      descriptionLength: fullDescription.length,
      success: !!fullDescription
    });

    return NextResponse.json({
      text: extractedText,
      description: fullDescription,
      success: true,
    });

  } catch (error) {
    console.error('Error in analyze-document API:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        text: '',
        description: '',
        success: false
      },
      { status: 500 }
    );
  }
}

