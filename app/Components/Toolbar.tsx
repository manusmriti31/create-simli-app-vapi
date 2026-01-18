"use client";

import React from "react";
import cn from "../utils/TailwindMergeAndClsx";

export interface Tool {
    id: string;
    name: string;
    icon: React.ReactNode;
}

interface ToolbarProps {
    tools: Tool[];
    activeTool: string | null;
    onToolSelect: (toolId: string | null) => void;
}

/**
 * Toolbar - Vertical pill-shaped toolbar for tools
 */
export default function Toolbar({ tools, activeTool, onToolSelect }: ToolbarProps) {
    return (
        <div className="flex flex-col items-center">
            {/* Pill container */}
            <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-2xl">
                <div className="flex flex-col gap-2">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => onToolSelect(activeTool === tool.id ? null : tool.id)}
                            className={cn(
                                "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group",
                                activeTool === tool.id
                                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {tool.icon}

                            {/* Tooltip */}
                            <div className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
                                {tool.name}
                                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-t border-white/10" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Collapse button */}
            {activeTool && (
                <button
                    onClick={() => onToolSelect(null)}
                    className="mt-3 w-8 h-8 rounded-full bg-gray-800/60 backdrop-blur border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/60 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}
