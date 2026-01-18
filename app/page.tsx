"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import pdfToText from "react-pdftotext";
import Vapi from "@vapi-ai/web";
import cn from "./utils/TailwindMergeAndClsx";
import SimliHeaderLogo from "./Components/Logo";
import CameraPanel from "./Components/CameraPanel";
import InterviewerPanel from "./Components/InterviewerPanel";
import Toolbar, { Tool } from "./Components/Toolbar";
import ToolPanel from "./Components/ToolPanel";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";

/**
 * AI Mock Interviewer
 */

// Types
type InterviewStatus = "lobby" | "connecting" | "active";

// Environment variables
const VAPI_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY || "";
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_AGENT_ID || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hvmgmvsmyejlzjdtoomd.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TAVILY_API_KEY = process.env.NEXT_PUBLIC_TAVILY_API_KEY || "";

// Module-level singleton for Vapi
const vapi = new Vapi(VAPI_KEY);

// Define available tools
const TOOLS: Tool[] = [
  {
    id: "code",
    name: "Code Editor",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: "notes",
    name: "Notes",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function Page() {
  // State
  const [status, setStatus] = useState<InterviewStatus>("lobby");
  const [name, setName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("// Write your code here...\n\nfunction solution() {\n  // Your implementation\n}");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Company research state
  const [companyName, setCompanyName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [isResearching, setIsResearching] = useState(false);

  // Refs
  const vapiStartedRef = useRef(false);
  const researchContextRef = useRef<string>("");
  const listenersAttachedRef = useRef(false);
  const nameRef = useRef(name);
  const resumeRef = useRef(resumeText);
  const companyRef = useRef(companyName);
  const roleRef = useRef(roleName);

  // Keep refs in sync
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { resumeRef.current = resumeText; }, [resumeText]);
  useEffect(() => { companyRef.current = companyName; }, [companyName]);
  useEffect(() => { roleRef.current = roleName; }, [roleName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeTool) {
        setActiveTool(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool]);

  // --- PDF Handler ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const text = await pdfToText(file);
      setResumeText(text);
      setResumeName(file.name);
    } catch (err) {
      console.error("PDF Parsing Failed:", err);
      setError("Failed to parse PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch Company Research ---
  const fetchCompanyResearch = useCallback(async (): Promise<string> => {
    if (!companyName || !roleName || !TAVILY_API_KEY) return "";

    setIsResearching(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/company-research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ company: companyName, role: roleName, tavilyApiKey: TAVILY_API_KEY }),
      });

      if (!response.ok) throw new Error("Failed to fetch company research");
      const research = await response.json();
      return `## Company: ${research.company}\n## Role: ${research.role}\n\n${research.summary}`;
    } catch (err: any) {
      console.error("Company research error:", err);
      return "";
    } finally {
      setIsResearching(false);
    }
  }, [companyName, roleName]);

  // --- Share Code ---
  const shareCodeWithAgent = async () => {
    if (!code || isSharing) return;
    setIsSharing(true);
    try {
      vapi.send({
        type: "add-message",
        message: { role: "system", content: `The candidate has written the following code:\n\n${code}\n\nPlease review it.` }
      });
      setTimeout(() => setIsSharing(false), 2000);
    } catch (err) {
      console.error("Failed to share code:", err);
      setIsSharing(false);
    }
  };

  // --- Setup Event Listeners ---
  useEffect(() => {
    if (listenersAttachedRef.current) return;
    listenersAttachedRef.current = true;

    vapi.on("call-start", () => {
      console.log("Vapi call started");
      setStatus("active");
      setIsLoading(false);
    });

    vapi.on("call-end", () => {
      console.log("Vapi call ended");
      setStatus("lobby");
      vapiStartedRef.current = false;
    });

    vapi.on("error", (error: any) => {
      console.error("Vapi error:", error);
      setError(`Voice AI error: ${error.message || "Unknown error"}`);
      setIsLoading(false);
    });
  }, []);

  // --- Start Interview ---
  const handleStart = useCallback(async () => {
    if (!name || !resumeText || vapiStartedRef.current) return;

    setIsLoading(true);
    setStatus("connecting");
    setError(null);

    try {
      if (companyName && roleName && TAVILY_API_KEY) {
        researchContextRef.current = await fetchCompanyResearch();
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });

      vapiStartedRef.current = true;
      await vapi.start(VAPI_ASSISTANT_ID, {
        variableValues: {
          candidate_name: name,
          resume_text: resumeText,
          company_name: companyName || "Not specified",
          role_name: roleName || "Not specified",
          company_research: researchContextRef.current || "No research available.",
        }
      });
    } catch (error: any) {
      console.error("Error starting:", error);
      setError(`Error: ${error.message}`);
      setIsLoading(false);
      setStatus("lobby");
      vapiStartedRef.current = false;
    }
  }, [name, resumeText, companyName, roleName, fetchCompanyResearch]);

  // --- Stop Interview ---
  const handleStop = useCallback(() => {
    setStatus("lobby");
    vapiStartedRef.current = false;
    vapi.stop();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      {/* ═══════════════════════════════════════════════ */}
      {/* ACTIVE INTERVIEW VIEW */}
      {/* ═══════════════════════════════════════════════ */}
      {status === "active" && (
        <div className="fixed inset-0 z-50">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-[#0a0a0a] to-violet-950/20" />

          {/* Main Layout */}
          <div className="relative h-full flex items-center justify-center p-6">
            <div className="flex items-stretch gap-4 h-[70vh] max-h-[600px]">

              {/* 1. User Camera Panel */}
              <div className="w-[400px] aspect-[4/3]">
                <CameraPanel />
              </div>

              {/* 2. AI Interviewer Panel */}
              <div className="w-[400px] aspect-[4/3]">
                <InterviewerPanel isActive={true} />
              </div>

              {/* 3. Tool Panel (conditional) */}
              {activeTool && (
                <div className="w-[400px] aspect-[4/3]">
                  <ToolPanel
                    activeTool={activeTool}
                    code={code}
                    onCodeChange={setCode}
                    onShareCode={shareCodeWithAgent}
                    isSharing={isSharing}
                  />
                </div>
              )}

              {/* 4. Vertical Toolbar */}
              <div className="flex items-center ml-2">
                <Toolbar
                  tools={TOOLS}
                  activeTool={activeTool}
                  onToolSelect={setActiveTool}
                />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-white/80 text-sm font-medium">Interview in Progress</span>
                </div>
                <div className="h-5 w-[1px] bg-white/10" />
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <span className="text-sm font-medium">End Interview</span>
                </button>
              </div>
            </div>

            {/* Logo */}
            <SimliHeaderLogo className="fixed top-6 left-6 opacity-40 hover:opacity-100 transition-opacity w-20" />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* LOBBY UI */}
      {/* ═══════════════════════════════════════════════ */}
      {(status === "lobby" || status === "connecting") && (
        <div className="min-h-screen text-white flex flex-col items-center justify-center relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[100px]" />
          </div>

          <SimliHeaderLogo className="z-50 mb-8" />

          <div className="z-10 w-full max-w-md p-8 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight mb-2 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                AI Interviewer
              </h1>
              <p className="text-gray-400 text-sm">Enter your details to begin.</p>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-widest pl-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Sarah Connor"
                  className="w-full bg-gray-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* Resume */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-widest pl-1">Resume (PDF)</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    disabled={isLoading}
                  />
                  <div className={cn(
                    "w-full h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-all",
                    resumeName ? "border-emerald-500/50 bg-emerald-950/10" : "border-white/10 bg-gray-950/30 group-hover:border-white/20"
                  )}>
                    {resumeName ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium truncate max-w-[200px]">{resumeName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">{isLoading ? "Parsing..." : "Drop PDF or Click"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Company & Role */}
              <div className="pt-2">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-gray-900/50 text-gray-500">Optional</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company"
                    className="w-full bg-gray-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Role"
                    className="w-full bg-gray-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              {/* Start Button */}
              <button
                onClick={handleStart}
                disabled={!name || !resumeText || isLoading || isResearching}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold text-white transition-all duration-300",
                  (!name || !resumeText)
                    ? "bg-gray-800 cursor-not-allowed text-gray-500"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isLoading || isResearching ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {isResearching ? "Researching..." : "Connecting..."}
                  </span>
                ) : "Start Interview"}
              </button>
            </div>

            <p className="mt-6 text-center text-[10px] text-gray-600">
              Powered by Vapi.ai • Camera + mic required
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
