import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { history } = await req.json();

    // Add system instruction for structured professional replies
    const systemInstruction = {
      role: "user",
      parts: [
        {
          text: `You are a professional AI assistant.
Always answer clearly and in structured format:
1. Use numbered points for steps or explanations.
2. Keep answers concise but professional.
3. Add sub-points if needed.
4. Never answer in a single long paragraph.`,
        },
      ],
    };

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({
      contents: [systemInstruction, ...history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }))],
    });

    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch response from Gemini API" },
      { status: 500 }
    );
  }
}
