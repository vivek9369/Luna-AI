import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  generationConfig: { responseMimeType: "application/json" },
}) : null;

// Enhanced PDF text extraction using multiple methods
async function extractPDFText(buffer) {
  try {
    // Method 1: Try to extract text using basic PDF structure parsing
    const pdfString = buffer.toString('binary');
    
    // Look for text objects in the PDF
    const textRegex = /BT\s*.*?ET/gs;
    const textMatches = pdfString.match(textRegex);
    
    if (textMatches) {
      let extractedText = '';
      
      textMatches.forEach(match => {
        // Extract text from PDF text objects
        const textContentRegex = /\((.*?)\)\s*Tj/g;
        const arrayTextRegex = /\[(.*?)\]\s*TJ/g;
        
        let textMatch;
        while ((textMatch = textContentRegex.exec(match)) !== null) {
          extractedText += textMatch[1] + ' ';
        }
        
        while ((textMatch = arrayTextRegex.exec(match)) !== null) {
          // Parse array-based text
          const textArray = textMatch[1];
          const cleanText = textArray.replace(/[()]/g, '').replace(/\d+/g, '');
          extractedText += cleanText + ' ';
        }
      });
      
      if (extractedText.trim().length > 100) {
        return extractedText.replace(/\s+/g, ' ').trim();
      }
    }
    
    // Method 2: Try to find readable text in the entire PDF
    const readableTextRegex = /[A-Za-z0-9\s\.\,\@\-\(\)]+/g;
    const readableMatches = pdfString.match(readableTextRegex);
    
    if (readableMatches) {
      let combinedText = readableMatches
        .filter(match => match.length > 3) // Filter out short matches
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Clean up common PDF artifacts
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
      
      if (combinedText.length > 100) {
        return combinedText;
      }
    }
    
    // Method 3: Use Gemini Vision to extract text from PDF (if it contains images)
    throw new Error("Could not extract readable text from PDF using standard methods");
    
  } catch (error) {
    console.error("[PDF_EXTRACTION] Error:", error.message);
    throw new Error("PDF text extraction failed. The PDF might be image-based or corrupted.");
  }
}

// Alternative: Use Gemini Vision API for image-based PDFs
async function extractTextWithVision(buffer) {
  try {
    if (!genAI) throw new Error("Gemini API not configured");
    
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: "application/pdf"
      }
    };
    
    const prompt = "Extract all text from this PDF document. Return only the extracted text content, formatted as plain text suitable for resume analysis.";
    
    const result = await visionModel.generateContent([prompt, imagePart]);
    const extractedText = result.response.text();
    
    if (extractedText && extractedText.length > 50) {
      return extractedText.trim();
    }
    
    throw new Error("Could not extract sufficient text using vision model");
  } catch (error) {
    console.error("[VISION_EXTRACTION] Error:", error.message);
    throw new Error("Vision-based text extraction failed");
  }
}

export async function POST(request) {
  console.log("[API] Resume analysis request received");
  
  if (!genAI || !model) {
    console.error("[API] Gemini API not configured");
    return NextResponse.json(
      { error: "Server is not configured correctly. Missing Gemini API Key." },
      { status: 500 }
    );
  }

  try {
    // Check user authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to analyze your resume." }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      return NextResponse.json({ error: "No resume file uploaded." }, { status: 400 });
    }

    console.log("[API] File received:", { name: file.name, type: file.type, size: file.size });

    // Validate file type and size
    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or DOCX file." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = "";
    let extractionMethod = "";

    console.log("[API] Starting text extraction for:", file.type);

    try {
      if (file.type === "application/pdf") {
        try {
          // First, try standard PDF text extraction
          resumeText = await extractPDFText(buffer);
          extractionMethod = "Standard PDF parsing";
        } catch (standardError) {
          console.log("[API] Standard PDF extraction failed, trying vision model...");
          try {
            // Fallback to vision-based extraction for image PDFs
            resumeText = await extractTextWithVision(buffer);
            extractionMethod = "Vision-based extraction";
          } catch (visionError) {
            console.error("[API] Both PDF extraction methods failed");
            return NextResponse.json(
              { error: "Could not extract text from PDF. Please try one of these solutions:\n1. Convert PDF to DOCX format\n2. Ensure PDF contains selectable text (not scanned images)\n3. Try saving the PDF from a different source" },
              { status: 400 }
            );
          }
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

    console.log("[API] Text extraction successful:", { 
      method: extractionMethod, 
      textLength: resumeText.length,
      preview: resumeText.substring(0, 100) + "..."
    });

    // Validate extracted text
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract sufficient readable text from the resume. The file might be:\n• An image-based/scanned PDF\n• Corrupted or password-protected\n• Empty or contain only formatting\n\nPlease try converting to DOCX format or ensure the PDF contains selectable text." },
        { status: 400 }
      );
    }

    // Clean and prepare text for analysis
    const cleanedText = resumeText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\@\-\(\)\+\#\&\%\$]/g, ' ')
      .trim();
    
    const textToAnalyze = cleanedText.substring(0, 12000);

    console.log("[API] Starting AI analysis, cleaned text length:", textToAnalyze.length);

    // Enhanced analysis prompt
    const prompt = `You are an expert ATS (Applicant Tracking System) specialist and resume reviewer. Analyze this resume text thoroughly and provide a detailed evaluation.

RESUME TEXT TO ANALYZE:
"${textToAnalyze}"

Provide a comprehensive analysis in the following JSON format:

{
  "atsScore": [number between 0-100 based on ATS compatibility],
  "summary": "[2-3 sentence professional summary of the candidate's background and key qualifications]",
  "strengths": [
    "[Specific strength related to skills/experience]",
    "[Specific strength related to achievements/results]", 
    "[Specific strength related to qualifications/education]"
  ],
  "weaknesses": [
    "[Specific area for improvement in content]",
    "[Specific formatting or ATS compatibility issue]",
    "[Specific missing element or gap]"
  ],
  "suggestions": [
    "[Actionable suggestion to improve ATS score]",
    "[Specific recommendation for content enhancement]",
    "[Concrete advice for better formatting/keywords]"
  ]
}

Focus your analysis on:
- ATS compatibility (keywords, formatting, structure)
- Professional experience and achievements
- Skills presentation and relevance
- Education and certifications
- Overall presentation quality
- Missing elements that could strengthen the resume

Ensure all feedback is specific, actionable, and based on the actual content provided.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Clean the JSON response
      let cleanedResponse = responseText;
      if (cleanedResponse.includes('```json')) {
        cleanedResponse = cleanedResponse.replace(/^.*?```json\s*/s, '').replace(/\s*```.*$/s, '');
      } else if (cleanedResponse.includes('```')) {
        cleanedResponse = cleanedResponse.replace(/^.*?```\s*/s, '').replace(/\s*```.*$/s, '');
      }
      
      const analysis = JSON.parse(cleanedResponse);
      
      // Validate and clean the response
      const cleanAnalysis = {
        atsScore: Math.max(0, Math.min(100, parseInt(analysis.atsScore) || 0)),
        summary: String(analysis.summary || "Professional resume analysis completed successfully").substring(0, 1000),
        strengths: Array.isArray(analysis.strengths) ? 
          analysis.strengths.slice(0, 6).map(s => String(s).substring(0, 300)).filter(s => s.length > 10) : 
          ["Professional experience identified", "Skills and qualifications present"],
        weaknesses: Array.isArray(analysis.weaknesses) ? 
          analysis.weaknesses.slice(0, 6).map(w => String(w).substring(0, 300)).filter(w => w.length > 10) : 
          ["Consider optimizing for ATS compatibility"],
        suggestions: Array.isArray(analysis.suggestions) ? 
          analysis.suggestions.slice(0, 6).map(s => String(s).substring(0, 300)).filter(s => s.length > 10) : 
          ["Add more industry-specific keywords", "Optimize formatting for ATS systems"]
      };

      // Ensure we have at least some content in each array
      if (cleanAnalysis.strengths.length === 0) {
        cleanAnalysis.strengths = ["Resume content successfully extracted and analyzed"];
      }
      if (cleanAnalysis.weaknesses.length === 0) {
        cleanAnalysis.weaknesses = ["Consider adding more specific achievements with quantifiable results"];
      }
      if (cleanAnalysis.suggestions.length === 0) {
        cleanAnalysis.suggestions = ["Consider adding more industry-relevant keywords for better ATS compatibility"];
      }

      console.log("[API] Analysis completed successfully:", {
        atsScore: cleanAnalysis.atsScore,
        extractionMethod,
        originalTextLength: resumeText.length,
        analyzedTextLength: textToAnalyze.length
      });

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