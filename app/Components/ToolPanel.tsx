"use client";

import React from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import cn from "../utils/TailwindMergeAndClsx";

interface ToolPanelProps {
    activeTool: string | null;
    code: string;
    onCodeChange: (code: string) => void;
    onShareCode: () => void;
    isSharing: boolean;
}

/**
 * ToolPanel - Container for active tool
 * Slides in from right when a tool is selected
 */
export default function ToolPanel({
    activeTool,
    code,
    onCodeChange,
    onShareCode,
    isSharing
}: ToolPanelProps) {
    if (!activeTool) return null;

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300">
            {/* Tool Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        {activeTool === "code" && (
                            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        )}
                        {activeTool === "notes" && (
                            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                    </div>
                    <span className="text-white font-medium text-sm">
                        {activeTool === "code" ? "Code Scratchpad" : "Notes"}
                    </span>
                </div>

                {activeTool === "code" && (
                    <button
                        onClick={onShareCode}
                        disabled={isSharing}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                            isSharing
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-indigo-500 hover:bg-indigo-400 text-white"
                        )}
                    >
                        {isSharing ? "✓ Shared" : "Share with AI"}
                    </button>
                )}
            </div>

            {/* Tool Content */}
            <div className="flex-1 overflow-hidden">
                {activeTool === "code" && (
                    <div className="h-full overflow-auto">
                        <Editor
                            value={code}
                            onValueChange={onCodeChange}
                            highlight={code => highlight(code, languages.js, "javascript")}
                            padding={20}
                            className="min-h-full font-mono"
                            textareaClassName="focus:outline-none"
                            style={{
                                fontFamily: '"Fira Code", "Fira Mono", Consolas, monospace',
                                fontSize: 14,
                                backgroundColor: "transparent",
                                color: "#f8f8f2",
                                minHeight: "100%"
                            }}
                        />
                    </div>
                )}

                {activeTool === "notes" && (
                    <div className="h-full p-4">
                        <textarea
                            placeholder="Take notes during your interview..."
                            className="w-full h-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm leading-relaxed"
                        />
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="px-4 py-2 bg-gray-900/50 border-t border-white/5 flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                    {activeTool === "code" ? "JavaScript" : "Markdown"}
                </span>
                <span className="text-gray-500 text-xs">
                    Press ESC to close
                </span>
            </div>
        </div>
    );
}
