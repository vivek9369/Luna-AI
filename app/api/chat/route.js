import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  console.log("--- RUNNING CHAT CODE: USING GEMINI 2.0 FLASH ---");

  try {
    const { history } = await req.json();

    if (!history || history.length === 0) {
      return NextResponse.json({ error: "History is required" }, { status: 400 });
    }

    if (history[0].role === "model") {
      history.shift(); 
    }

    const latestUserMessage = history.pop();
    if (!latestUserMessage || latestUserMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from the user" }, { status: 400 });
    }

    // ✅ Use Gemini 2.0 Flash instead of 1.5 Flash
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are a professional AI assistant. Always answer clearly and in a structured format using markdown (like numbered lists or bullet points). Keep answers professional but concise. Never answer in a single long paragraph.`,
    });

    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(latestUserMessage.content);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Gemini API Error in /api/chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch response from Gemini API" },
      { status: 500 }
    );
  }
}
