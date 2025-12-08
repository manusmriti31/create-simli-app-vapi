"use client";

import React, { useState, useRef, useCallback } from "react";
import pdfToText from "react-pdftotext";
import Vapi from "@vapi-ai/web";
import { SimliClient } from "simli-client";
import VideoBox from "./Components/VideoBox";
import cn from "./utils/TailwindMergeAndClsx";
import SimliHeaderLogo from "./Components/Logo";

/**
 * AI Mock Interviewer
 * 
 * IMPORTANT: This follows the exact same initialization pattern as SimliVapi.tsx:
 * 1. User clicks Start -> Initialize Simli -> Start Simli
 * 2. On Simli "connected" event -> Send initial audio -> Start Vapi
 * 3. On Vapi "call-start" -> Pipe audio to Simli
 * 
 * Using module-level singletons (same as original) to avoid re-instantiation issues.
 */

// Types
type InterviewStatus = "lobby" | "connecting" | "active";

// Environment variables
const VAPI_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY || "";
const SIMLI_KEY = process.env.NEXT_PUBLIC_SIMLI_API_KEY || "";
const SIMLI_FACE_ID = "5514e24d-6086-46a3-ace4-6a7264e5cb7c";
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_AGENT_ID || "";

// Module-level singletons (same pattern as original SimliVapi.tsx)
const vapi = new Vapi(VAPI_KEY);
const simliClient = new SimliClient();

export default function Page() {
  // State
  const [status, setStatus] = useState<InterviewStatus>("lobby");
  const [name, setName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const vapiStartedRef = useRef(false);

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

  // --- Initialize Simli (same as original initializeSimliClient) ---
  const initializeSimliClient = useCallback(() => {
    if (videoRef.current && audioRef.current) {
      const SimliConfig = {
        apiKey: SIMLI_KEY,
        faceID: SIMLI_FACE_ID,
        handleSilence: false,
        videoRef: videoRef.current,
        audioRef: audioRef.current,
      };
      simliClient.Initialize(SimliConfig as any);
      console.log("Simli Client initialized");
    }
  }, []);

  // --- Start Vapi (same as original startVapiInteraction) ---
  const startVapiInteraction = useCallback(async () => {
    if (vapiStartedRef.current) {
      console.log("Vapi already started, skipping...");
      return;
    }

    try {
      vapiStartedRef.current = true;

      // Pass variable values as required
      const variableValues = {
        candidate_name: name,
        resume_text: resumeText,
      };

      await vapi.start(VAPI_ASSISTANT_ID, { variableValues });
      console.log("Vapi interaction started");

      // Attach Vapi event listeners AFTER starting
      eventListenerVapi();
    } catch (error: any) {
      vapiStartedRef.current = false;
      console.error("Error starting Vapi interaction:", error);
      setError(`Error starting Vapi: ${error.message}`);
    }
  }, [name, resumeText]);

  // --- Mute Vapi internal audio (same as original) ---
  const muteVapiInternalAudio = () => {
    const audioElements = document.getElementsByTagName("audio");
    for (let i = 0; i < audioElements.length; i++) {
      if (audioElements[i].id !== "simli_audio") {
        audioElements[i].muted = true;
        audioElements[i].volume = 0;
        audioElements[i].pause();
      }
    }

    // MutationObserver to catch dynamically added audio elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLAudioElement && node.id !== "simli_audio") {
            node.muted = true;
            node.volume = 0;
            node.pause();
          }
          if (node instanceof Element) {
            const audioChildren = node.getElementsByTagName("audio");
            for (let i = 0; i < audioChildren.length; i++) {
              if (audioChildren[i].id !== "simli_audio") {
                audioChildren[i].muted = true;
                audioChildren[i].volume = 0;
                audioChildren[i].pause();
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  // --- Pipe Vapi audio to Simli (same as original getAudioElementAndSendToSimli) ---
  const getAudioElementAndSendToSimli = () => {
    if (simliClient) {
      muteVapiInternalAudio();
      try {
        const dailyCall = vapi.getDailyCallObject();
        const participants = dailyCall?.participants();
        if (!participants) {
          console.log("No participants found, retrying...");
          setTimeout(getAudioElementAndSendToSimli, 100);
          return;
        }
        Object.values(participants).forEach((participant: any) => {
          const audioTrack = participant.tracks?.audio?.track;
          if (audioTrack) {
            console.log(`Audio track for ${participant.user_name}:`, audioTrack);
          }
          if (participant.user_name === "Vapi Speaker") {
            console.log("Vapi Speaker detected");
            simliClient.listenToMediastreamTrack(audioTrack as MediaStreamTrack);
          }
        });
      } catch (error: any) {
        console.error("Error getting audio track:", error);
      }
    } else {
      setTimeout(getAudioElementAndSendToSimli, 10);
    }
  };

  // --- Vapi Event Listeners (same as original eventListenerVapi) ---
  const eventListenerVapi = useCallback(() => {
    vapi.on("message", (message: any) => {
      if (
        message.type === "speech-update" &&
        message.status === "started" &&
        message.role === "user"
      ) {
        console.log("User started speaking");
        simliClient.ClearBuffer();
      }
    });

    vapi.on("call-start", () => {
      console.log("Vapi call started");
      setStatus("active");
      setIsLoading(false);
      getAudioElementAndSendToSimli();
    });

    vapi.on("call-end", () => {
      console.log("Vapi call ended");
      handleStop();
    });
  }, []);

  // --- Simli Event Listeners (same as original eventListenerSimli) ---
  // CRITICAL: Vapi is started INSIDE the Simli "connected" callback
  const eventListenerSimli = useCallback(() => {
    if (simliClient) {
      simliClient.on("connected", () => {
        console.log("SimliClient connected");
        const audioData = new Uint8Array(6000).fill(0);
        simliClient.sendAudioData(audioData);
        console.log("Sent initial audio data");

        // START VAPI ONLY AFTER SIMLI IS CONNECTED
        startVapiInteraction();
      });

      simliClient.on("disconnected", () => {
        console.log("SimliClient disconnected");
        vapi.stop();
      });
    }
  }, [startVapiInteraction]);

  // --- Start Interview (same flow as original handleStart) ---
  const handleStart = useCallback(async () => {
    if (!name || !resumeText) {
      setError("Please provide both name and resume.");
      return;
    }

    setIsLoading(true);
    setStatus("connecting");
    setError(null);

    try {
      // 1. Initialize Simli client
      initializeSimliClient();

      // 2. Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Attach Simli event listeners FIRST (so we don't miss "connected" event)
      eventListenerSimli();

      // 4. Start Simli client (will trigger "connected" event)
      await simliClient.start();

    } catch (error: any) {
      console.error("Error starting interaction:", error);
      setError(`Error starting interaction: ${error.message}`);
      setIsLoading(false);
      setStatus("lobby");
    }
  }, [name, resumeText, initializeSimliClient, eventListenerSimli]);

  // --- Stop Interview (same as original handleStop) ---
  const handleStop = useCallback(() => {
    console.log("Stopping interaction...");
    setIsLoading(false);
    setStatus("lobby");

    // Reset Vapi started flag
    vapiStartedRef.current = false;

    // Clean up Vapi
    vapi.stop();

    // Clean up Simli client
    simliClient.close();

    console.log("Interaction stopped");
  }, []);


  // --- UI ---
  // Single render structure with persistent VideoBox
  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* =============================================== */}
      {/* PERSISTENT VIDEO/AUDIO LAYER - ALWAYS MOUNTED */}
      {/* =============================================== */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-all duration-500",
          status === "active"
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        {/* Glow Effect behind Avatar */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Avatar Container - VideoBox is ALWAYS mounted here */}
        <div className="relative z-10 scale-125 transform transition-all duration-700 ease-in-out">
          <VideoBox video={videoRef} audio={audioRef} />
        </div>

        {/* Controls - Only shown when active */}
        <div className="absolute bottom-12 z-20 flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/5 px-6 py-3 rounded-full flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-white/80 text-sm font-medium">Live Interview</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <button
              onClick={handleStop}
              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
            >
              End Call
            </button>
          </div>
        </div>

        <SimliHeaderLogo className="fixed top-8 left-8 opacity-50 hover:opacity-100 transition-opacity" />
      </div>

      {/* =============================================== */}
      {/* LOBBY UI - Shown when not in active interview  */}
      {/* =============================================== */}
      {(status === "lobby" || status === "connecting") && (
        <div className="min-h-screen text-white font-sans selection:bg-indigo-500/30 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[100px]" />
          </div>

          <SimliHeaderLogo className="z-50" />

          <div className="z-10 w-full max-w-md p-8 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight mb-2 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                AI Interviewer
              </h1>
              <p className="text-gray-400 text-sm">
                Enter your details to begin the session.
              </p>
            </div>

            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-widest pl-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Sarah Connor"
                  className="w-full bg-gray-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-widest pl-1">
                  Resume (PDF)
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    disabled={isLoading}
                  />
                  <div className={cn(
                    "w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all duration-200",
                    resumeName
                      ? "border-emerald-500/50 bg-emerald-950/10"
                      : "border-white/10 bg-gray-950/30 group-hover:border-white/20 group-hover:bg-gray-950/50"
                  )}>
                    {resumeName ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium truncate max-w-[200px]">{resumeName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium group-hover:text-gray-300">
                        {isLoading ? "Parsing PDF..." : "Drop PDF or Click to Upload"}
                      </span>
                    )}
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs pl-1">{error}</p>}
              </div>

              {/* Start Button */}
              <button
                onClick={handleStart}
                disabled={!name || !resumeText || isLoading}
                className={cn(
                  "w-full py-4 rounded-lg font-medium text-white transition-all duration-300 transform",
                  (!name || !resumeText)
                    ? "bg-gray-800 cursor-not-allowed text-gray-500"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </span>
                ) : "Start Interview"}
              </button>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 text-center">
              <p className="text-[10px] text-gray-600">
                Powered by Vapi.ai & Simli. Ensure microphone access is enabled.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
