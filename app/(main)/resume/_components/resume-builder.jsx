"use client";

// For user to build resume
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume, improveWithAI } from "@/actions/resume";
import { EntryForm } from "./entry-form";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";

// We will dynamically import html2pdf inside the generatePDF function

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent || "");
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {},
      summary: "",
      skills: Array(5).fill({ heading: "", skills: "" }),
      experience: [],
      education: [],
      projects: [],
    },
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  const {
    loading: isImprovingSummary,
    fn: improveSummaryFn,
    data: improvedSummary,
  } = useFetch(improveWithAI);

  const formValues = watch();
  const summaryValue = watch("summary");

  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  // When form values change, update the markdown preview content
  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      setPreviewContent(newContent);
    }
  }, [formValues, activeTab]);

  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  useEffect(() => {
    if (improvedSummary) {
      setValue("summary", improvedSummary);
      toast.success("Summary improved successfully!");
    }
  }, [improvedSummary, setValue]);

  const handleImprovement = async (fieldName, improvementFn) => {
    const currentValue = getValues(fieldName);
    if (!currentValue) {
      toast.error(`Please enter a ${fieldName} first.`);
      return;
    }
    await improvementFn({ current: currentValue, type: fieldName });
  };

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];
    if (contactInfo.email) parts.push(`Email: ${contactInfo.email}`);
    if (contactInfo.mobile) parts.push(`Mobile: ${contactInfo.mobile}`);
    if (contactInfo.linkedin)
      parts.push(`LinkedIn: [${contactInfo.linkedin}](${contactInfo.linkedin})`);
    if (contactInfo.github)
      parts.push(`GitHub: [${contactInfo.github}](${contactInfo.github})`);

    return parts.length > 0 && user
      ? `## <div align="center">**${user.fullName}**</div>\n\n<div align="center">\n\n${parts.join(
          " | "
        )}\n\n</div>`
      : "";
  };

  const getSkillsMarkdown = () => {
    const { skills } = formValues;
    let markdown = "";
    skills.forEach((skill) => {
      if (skill.heading && skill.skills) {
        if (!markdown) markdown = "## Skills\n\n";
        markdown += `**${skill.heading}:** ${skill.skills}\n\n`;
      }
    });
    return markdown;
  };

  const getCombinedContent = () => {
    const { summary, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      getSkillsMarkdown(),
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    toast.info("Generating PDF, please wait...");
    try {
      const html2pdf = (await import("html2pdf.js/dist/html2pdf.min.js"))
        .default;
      const element = document.getElementById("resume-pdf");
      const opt = {
        margin: [15, 15],
        filename: "resume.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  // This function is triggered by the save button
  const onSubmit = async () => {
    try {
      // The previewContent state already holds the latest markdown string
      await saveResumeFn(previewContent);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div
      data-color-mode="light"
      className="space-y-4 w-full max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="font-bold gradient-title text-5xl md:text-6xl">
          Resume Builder
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            aria-label="Save resume"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            aria-label="Download resume as PDF"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Form Editor</TabsTrigger>
          <TabsTrigger value="preview">Markdown Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          {/* Using a div instead of form tag to prevent nested forms, letting react-hook-form handle submission */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="contact-email">
                    Email
                  </label>
                  <Input
                    id="contact-email"
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="your@email.com"
                  />
                  {errors.contactInfo?.email && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="contact-mobile"
                  >
                    Mobile Number
                  </label>
                  <Input
                    id="contact-mobile"
                    {...register("contactInfo.mobile")}
                    type="tel"
                    placeholder="+91 1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="contact-linkedin"
                  >
                    LinkedIn URL
                  </label>
                  <Input
                    id="contact-linkedin"
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="contact-github"
                  >
                    GitHub URL
                  </label>
                  <Input
                    id="contact-github"
                    {...register("contactInfo.github")}
                    type="url"
                    placeholder="https://github.com/your-username"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Summary</h3>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="Write a compelling professional summary..."
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleImprovement("summary", improveSummaryFn)
                }
                disabled={isImprovingSummary || !summaryValue}
              >
                {isImprovingSummary ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Improving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Improve with AI
                  </>
                )}
              </Button>
              {errors.summary && (
                <p className="text-sm text-red-500">
                  {errors.summary.message}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Skills</h3>
              <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-4 items-center"
                  >
                    <div className="space-y-2 col-span-1">
                      <Input
                        {...register(`skills.${index}.heading`)}
                        placeholder="e.g., Languages"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Input
                        {...register(`skills.${index}.skills`)}
                        placeholder="e.g., JavaScript, Python, SQL"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <Controller
                name="experience"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Experience"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Education</h3>
              <Controller
                name="education"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Education"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Projects</h3>
              <Controller
                name="projects"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Project"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          {activeTab === "preview" && (
            <div className="flex justify-between items-center mb-2">
              <Button
                variant="link"
                type="button"
                onClick={() =>
                  setResumeMode(resumeMode === "preview" ? "edit" : "preview")
                }
              >
                {resumeMode === "preview" ? (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Markdown
                  </>
                ) : (
                  <>
                    <Monitor className="mr-2 h-4 w-4" />
                    Show Preview
                  </>
                )}
              </Button>
              {resumeMode !== "preview" && (
                <div className="flex p-2 gap-2 items-center border border-yellow-600 text-yellow-600 rounded">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-xs">
                    You will lose markdown edits if you switch back to the form.
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="border rounded-lg">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
            />
          </div>
          {/* This hidden div is used as the source for PDF generation */}
          <div className="hidden">
            <div id="resume-pdf" className="prose">
              <MDEditor.Markdown
                source={previewContent}
                style={{
                  background: "white",
                  color: "black",
                  padding: "20px",
                }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}