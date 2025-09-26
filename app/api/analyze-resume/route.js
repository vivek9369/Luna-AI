import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import mammoth from "mammoth";
import { geminiModel } from "@/lib/gemini"; // <- import from your helper

// Enhanced PDF text extraction using multiple methods
async function extractPDFText(buffer) {
  try {
    const pdfString = buffer.toString('binary');

    const textRegex = /BT\s*.*?ET/gs;
    const textMatches = pdfString.match(textRegex);

    if (textMatches) {
      let extractedText = '';
      textMatches.forEach(match => {
        const textContentRegex = /\((.*?)\)\s*Tj/g;
        const arrayTextRegex = /\[(.*?)\]\s*TJ/g;

        let textMatch;
        while ((textMatch = textContentRegex.exec(match)) !== null) {
          extractedText += textMatch[1] + ' ';
        }
        while ((textMatch = arrayTextRegex.exec(match)) !== null) {
          const textArray = textMatch[1];
          const cleanText = textArray.replace(/[()]/g, '').replace(/\d+/g, '');
          extractedText += cleanText + ' ';
        }
      });

      if (extractedText.trim().length > 100) return extractedText.replace(/\s+/g, ' ').trim();
    }

    const readableTextRegex = /[A-Za-z0-9\s\.\,\@\-\(\)]+/g;
    const readableMatches = pdfString.match(readableTextRegex);

    if (readableMatches) {
      let combinedText = readableMatches
        .filter(match => match.length > 3)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      combinedText = combinedText
        .replace(/obj\s+\d+/g, '')
        .replace(/endobj/g, '')
        .replace(/stream|endstream/g, '')
        .replace(/xref/g, '')
        .replace(/trailer/g, '')
        .replace(/startxref/g, '')
        .replace(/%%EOF/g, '')
        .replace(/\d+\s+\d+\s+R/g, '')
        .replace(/[^\w\s\.\,\@\-\(\)\+\#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (combinedText.length > 100) return combinedText;
    }

    throw new Error("Could not extract readable text from PDF using standard methods");

  } catch (error) {
    console.error("[PDF_EXTRACTION] Error:", error.message);
    throw new Error("PDF text extraction failed. The PDF might be image-based or corrupted.");
  }
}

async function extractTextWithVision(buffer) {
  try {
    if (!geminiModel) throw new Error("Gemini model not configured");

    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: "application/pdf"
      }
    };

    const prompt = "Extract all text from this PDF document. Return only the extracted text content, formatted as plain text suitable for resume analysis.";

    const result = await geminiModel.generateContent([prompt, imagePart]);
    const extractedText = result.response.text();

    if (extractedText && extractedText.length > 50) return extractedText.trim();
    throw new Error("Could not extract sufficient text using vision model");

  } catch (error) {
    console.error("[VISION_EXTRACTION] Error:", error.message);
    throw new Error("Vision-based text extraction failed");
  }
}

export async function POST(request) {
  console.log("[API] Resume analysis request received");

  if (!geminiModel) {
    console.error("[API] Gemini API not configured");
    return NextResponse.json(
      { error: "Server is not configured correctly. Missing Gemini API Key." },
      { status: 500 }
    );
  }

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Please sign in to analyze your resume." }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) return NextResponse.json({ error: "No resume file uploaded." }, { status: 400 });

    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!supportedTypes.includes(file.type))
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or DOCX file." }, { status: 400 });

    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = "";
    let extractionMethod = "";

    try {
      if (file.type === "application/pdf") {
        try {
          resumeText = await extractPDFText(buffer);
          extractionMethod = "Standard PDF parsing";
        } catch {
          resumeText = await extractTextWithVision(buffer);
          extractionMethod = "Vision-based extraction";
        }
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const { value } = await mammoth.extractRawText({ buffer });
        resumeText = value;
        extractionMethod = "DOCX extraction";
      }
    } catch (extractError) {
      console.error("[API] Text extraction failed:", extractError);
      return NextResponse.json(
        { error: "Failed to extract text from the file. Please ensure it's a valid resume file with readable text." },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50)
      return NextResponse.json(
        { error: "Could not extract sufficient readable text from the resume." },
        { status: 400 }
      );

    const cleanedText = resumeText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\@\-\(\)\+\#\&\%\$]/g, ' ')
      .trim();

    const textToAnalyze = cleanedText.substring(0, 12000);

    const prompt = `You are an expert ATS specialist. Analyze this resume text:

"${textToAnalyze}"

Return JSON with: atsScore, summary, strengths[], weaknesses[], suggestions[].`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const responseText = result.response.text().trim();

      let cleanedResponse = responseText.replace(/^.*?```json\s*/s, '').replace(/\s*```.*$/s, '');
      const analysis = JSON.parse(cleanedResponse);

      const cleanAnalysis = {
        atsScore: Math.max(0, Math.min(100, parseInt(analysis.atsScore) || 0)),
        summary: String(analysis.summary || "Professional resume analysis completed successfully").substring(0, 1000),
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 6) : ["Professional experience identified"],
        weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses.slice(0, 6) : ["Consider optimizing for ATS compatibility"],
        suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions.slice(0, 6) : ["Add more industry-specific keywords"]
      };

      return NextResponse.json(cleanAnalysis);

    } catch (geminiError) {
      console.error("[API] Gemini API error:", geminiError);
      return NextResponse.json(
        { error: "AI analysis failed. Please try again or contact support if the problem persists." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("[API] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
