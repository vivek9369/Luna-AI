import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // update this once to fix all AI modules
  systemInstruction: `You are a professional AI assistant.
Always respond clearly, concisely, and professionally.
Return only the output requested, no extra explanations or notes.`,
});
