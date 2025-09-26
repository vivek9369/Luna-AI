"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { geminiModel } from "@/lib/gemini";

// Generate insights for an industry
export const generateAIInsights = async (industry) => {
  const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format:

{
  "salaryRanges": [
    { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
  ],
  "growthRate": number,
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["skill1", "skill2"],
  "marketOutlook": "Positive" | "Neutral" | "Negative",
  "keyTrends": ["trend1", "trend2"],
  "recommendedSkills": ["skill1", "skill2"]
}

Include at least 5 common roles for salary ranges.
Growth rate should be a percentage.
Include at least 5 skills and trends.
Return ONLY the JSON.
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "");

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating industry insights:", error);
    throw new Error("Failed to generate industry insights");
  }
};

// Get insights for logged-in user's industry
export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  // If insights already exist, return them
  if (user.industryInsight) return user.industryInsight;

  // Otherwise, generate and save them
  const insights = await generateAIInsights(user.industry);

  const industryInsight = await db.industryInsight.create({
    data: {
      industry: user.industry,
      ...insights,
      nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // next week
    },
  });

  return industryInsight;
}
