"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

// Update user profile and ensure industry insights exist
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  try {
    // Ensure industry insights exist
    let industryInsight = await db.industryInsight.findUnique({
      where: { industry: data.industry },
    });

    if (!industryInsight) {
      console.log(`No insights found for ${data.industry}. Generating new ones.`);
      const insights = await generateAIInsights(data.industry);

      industryInsight = await db.industryInsight.create({
        data: {
          industry: data.industry,
          ...insights,
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`Successfully created insights for ${data.industry}.`);
    }

    // Normalize skills to array
    const skillsArray = Array.isArray(data.skills)
      ? data.skills
      : data.skills?.split(",").map(s => s.trim()) || [];

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        industry: data.industry,
        experience: data.experience,
        bio: data.bio,
        skills: skillsArray,
      },
    });

    revalidatePath("/");

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

// Check if user has completed onboarding
export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { industry: true },
    });

    return { isOnboarded: !!user?.industry };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}

// Fetch user profile
export async function getUserProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        industry: true,
        experience: true,
        bio: true,
        skills: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      skills: user.skills ? user.skills.join(", ") : "",
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}
