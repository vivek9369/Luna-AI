"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { geminiModel } from "@/lib/gemini";

export async function generateQuiz(topic) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true, skills: true },
  });

  if (!user) throw new Error("User not found");
  if (!topic) throw new Error("A quiz topic is required.");

  const prompt = `
Generate 10 technical interview questions for a ${user.industry} professional about "${topic}".
Each question should be multiple choice with 4 options.
Return ONLY this JSON format, no extra text:
{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, i) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[i],
    isCorrect: q.correctAnswer === answers[i],
    explanation: q.explanation,
  }));

  // Generate improvement tip only if there are wrong answers
  let improvementTip = null;
  const wrongAnswers = questionResults.filter(q => !q.isCorrect);

  if (wrongAnswers.length > 0) {
    const wrongText = wrongAnswers
      .map(q => `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`)
      .join("\n\n");

    const improvementPrompt = `
The user got the following ${user.industry} technical interview questions wrong:
${wrongText}
Provide a concise, specific improvement tip (under 2 sentences) focusing on knowledge gaps. Do not mention mistakes directly.
`;

    try {
      const tipResult = await geminiModel.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
    } catch (err) {
      console.error("Error generating improvement tip:", err);
    }
  }

  try {
    return await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });
  } catch (err) {
    console.error("Error saving quiz result:", err);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  try {
    return await db.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.error("Error fetching assessments:", err);
    throw new Error("Failed to fetch assessments");
  }
}
