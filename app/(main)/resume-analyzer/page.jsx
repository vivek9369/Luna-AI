"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  UploadCloud, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  FileText, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  Lightbulb,
  Download,
  Share2
} from "lucide-react";

const AnalysisResult = ({ result }) => {
  if (!result) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreBarColor = (score) => {
    if (score >= 80) return "bg-gradient-to-r from-green-500 to-green-600";
    if (score >= 60) return "bg-gradient-to-r from-yellow-500 to-yellow-600";
    return "bg-gradient-to-r from-red-500 to-red-600";
  };

  return (
    <div className="w-full mt-8 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Analysis Report</h2>
            <p className="text-blue-100 text-sm">Comprehensive ATS & Professional Review</p>
          </div>
          <div className="flex gap-3">
            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Download className="w-5 h-5 text-white" />
            </button>
            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* ATS Score Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Target className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-800">ATS Compatibility Score</h3>
          </div>
          
          <div className={`inline-flex items-center px-6 py-3 rounded-xl border-2 ${getScoreColor(result.atsScore)} mb-4`}>
            <span className="text-4xl font-bold mr-2">{result.atsScore}</span>
            <div className="text-sm">
              <div className="font-medium">/ 100</div>
              <div className="text-xs opacity-75">
                {result.atsScore >= 80 ? 'Excellent' : result.atsScore >= 60 ? 'Good' : 'Needs Work'}
              </div>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-1000 ease-out ${getScoreBarColor(result.atsScore)}`}
              style={{ width: `${result.atsScore}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Needs Improvement</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </div>

        {/* Summary Section */}
        {result.summary && (
          <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center mb-3">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900">Executive Summary</h3>
            </div>
            <p className="text-blue-800 leading-relaxed">{result.summary}</p>
          </div>
        )}

        {/* Analysis Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Strengths */}
          <div className="bg-green-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-green-900">Strengths</h3>
            </div>
            <div className="space-y-3">
              {result.strengths.map((item, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-green-800">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-red-900">Areas for Improvement</h3>
            </div>
            <div className="space-y-3">
              {result.weaknesses.map((item, index) => (
                <div key={index} className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-800">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100">
            <div className="flex items-center mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-900">Action Items</h3>
            </div>
            <div className="space-y-3">
              {result.suggestions.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full mr-2 mt-0.5 flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-900">{index + 1}</span>
                  </div>
                  <span className="text-sm text-yellow-800">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button variant="outline" className="border-gray-300 px-6">
            <FileText className="w-4 h-4 mr-2" />
            Analyze Another Resume
          </Button>
          <Button variant="outline" className="border-gray-300 px-6">
            <Share2 className="w-4 h-4 mr-2" />
            Share Results
          </Button>
        </div>
      </div>
    </div>
  );
};

const Alert = ({ type, children, onDismiss }) => {
  const styles = {
    error: "text-red-800 bg-red-50 border-red-200",
    success: "text-green-800 bg-green-50 border-green-200",
    info: "text-blue-800 bg-blue-50 border-blue-200"
  };

  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info
  };

  const Icon = icons[type];

  return (
    <div className={`mt-6 flex items-start p-4 rounded-xl border ${styles[type]} shadow-sm`} role="alert">
      <Icon className="flex-shrink-0 w-5 h-5 mr-3 mt-0.5" />
      <div className="flex-1 text-sm leading-relaxed">
        {children}
      </div>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="ml-3 text-sm font-medium hover:underline"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default function ResumeAnalyzerPage() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setError("");
      setSuccess("");
      setAnalysisResult(null);
      
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File is too large. Maximum size is 5MB.");
        setFile(null);
        return;
      }

      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Invalid file type. Please upload a PDF or DOCX file.");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setSuccess(`File selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a file to analyze.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });

      const responseText = await res.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        if (responseText.includes("<!DOCTYPE")) {
          throw new Error("Server returned an HTML page instead of JSON. This usually indicates a server configuration issue.");
        } else {
          throw new Error("Invalid response format from server. Please try again.");
        }
      }

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      if (!data.atsScore && data.atsScore !== 0) {
        throw new Error("Invalid analysis result: missing ATS score");
      }

      setAnalysisResult(data);
      setSuccess("Resume analyzed successfully! Scroll down to view your results.");

    } catch (err) {
      let errorMessage;
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.message.includes("HTML page")) {
        errorMessage = "Server configuration error. Please try again later or contact support.";
      } else {
        errorMessage = err.message || "An unexpected error occurred. Please try again.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setFile(null);
      const fileInput = document.getElementById('resume-upload');
      if(fileInput) fileInput.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
            <Target className="w-4 h-4 mr-2" />
            AI-Powered Resume Analysis
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
             Resume
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Analyzer</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Get instant ATS compatibility scores, professional feedback, and actionable insights to optimize your resume for today's competitive job market.
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Your Resume</h2>
              <p className="text-gray-600">Get professional analysis in seconds</p>
            </div>

            <div className="space-y-4">
              <label
                htmlFor="resume-upload"
                className={`group cursor-pointer block w-full p-8 border-2 border-dashed rounded-xl text-center transition-all duration-200 ${
                  isLoading 
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                    : file 
                    ? 'border-green-300 bg-green-50 hover:border-green-400'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="flex flex-col items-center">
                  {file ? (
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                  ) : (
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors mb-3" />
                  )}
                  <span className="block text-lg font-medium text-gray-700 mb-2">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </span>
                  <p className="text-sm text-gray-500">
                    Supports PDF and DOCX files up to 5MB
                  </p>
                </div>
              </label>
              
              <input
                id="resume-upload"
                type="file"
                className="sr-only"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full text-lg py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200" 
              disabled={isLoading || !file}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-5 w-5" />
                  Analyze My Resume
                </>
              )}
            </Button>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center p-3">
                <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">ATS Score</p>
                <p className="text-xs text-gray-500">Compatibility rating</p>
              </div>
              <div className="text-center p-3">
                <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Detailed Analysis</p>
                <p className="text-xs text-gray-500">Comprehensive review</p>
              </div>
              <div className="text-center p-3">
                <Lightbulb className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Action Items</p>
                <p className="text-xs text-gray-500">Improvement suggestions</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Alert type="error" onDismiss={() => setError("")}>
              <span className="font-semibold">Analysis Failed:</span> {error}
            </Alert>
          )}

          {success && (
            <Alert type="success" onDismiss={() => setSuccess("")}>
              <span className="font-semibold">Success!</span> {success}
            </Alert>
          )}

          {/* Results */}
          <AnalysisResult result={analysisResult} />
        </div>
      </main>
    </div>
  );
}