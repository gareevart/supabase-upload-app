import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadPDFParser } from '@/lib/pdf-loader';

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

    const { pdfUrl, fileName } = await request.json();

    if (!pdfUrl) {
      return NextResponse.json(
        { error: 'PDF URL is required' },
        { status: 400 }
      );
    }

    console.log('Analyzing PDF:', { pdfUrl, fileName });

    // Download PDF from URL
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDF downloaded, size:', pdfBuffer.byteLength, 'bytes');

    // Extract text from PDF using pdf2json
    const PDFParser = await loadPDFParser();
    const extractedText = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF parsing error:', errData.parserError);
        reject(new Error(errData.parserError));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          let text = '';
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts && Array.isArray(page.Texts)) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    textItem.R.forEach((r: any) => {
                      if (r.T) {
                        // Decode URI component (pdf2json encodes text)
                        text += decodeURIComponent(r.T) + ' ';
                      }
                    });
                  }
                });
              }
              text += '\n'; // New line after each page
            });
          }
          resolve(text.trim());
        } catch (error) {
          reject(error);
        }
      });

      // Parse the buffer
      pdfParser.parseBuffer(Buffer.from(pdfBuffer));
    });

    const pageCount = extractedText.split('\n').filter(line => line.trim()).length;

    console.log('PDF parsed:', {
      pageCount,
      textLength: extractedText.length,
      textPreview: extractedText.substring(0, 200)
    });

    // Create a comprehensive description
    let fullDescription = '';
    const data = { text: extractedText, numpages: pageCount };

    if (extractedText && extractedText.trim()) {
      // Limit text to first 3000 characters to avoid token overflow
      const truncatedText = extractedText.length > 3000
        ? extractedText.substring(0, 3000) + '...'
        : extractedText;

      fullDescription = `PDF документ "${fileName || 'документ'}" (${pageCount} стр.):\n\n${truncatedText}`;
    } else {
      fullDescription = `PDF документ "${fileName || 'документ'}" - текст не обнаружен или документ содержит только изображения`;
    }

    console.log('Final PDF analysis result:', {
      extractedTextLength: extractedText.length,
      descriptionLength: fullDescription.length,
      success: !!fullDescription
    });

    return NextResponse.json({
      text: extractedText,
      pageCount: pageCount,
      description: fullDescription,
      success: true,
    });

  } catch (error) {
    console.error('Error in analyze-pdf API:', error);
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

