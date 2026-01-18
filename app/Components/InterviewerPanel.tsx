"use client";

import React, { useRef, useEffect, useState } from "react";

interface InterviewerPanelProps {
    isActive?: boolean;
}

/**
 * InterviewerPanel - Displays AI voice visualizer
 * Shows animated waveform that reacts to AI speaking
 */
export default function InterviewerPanel({ isActive = true }: InterviewerPanelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const [bars] = useState(() =>
        Array.from({ length: 32 }, () => ({
            height: Math.random() * 0.3 + 0.1,
            velocity: Math.random() * 0.02 + 0.01,
            target: Math.random() * 0.5 + 0.1
        }))
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const animate = () => {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            const centerY = rect.height / 2;
            const barWidth = 4;
            const gap = 3;
            const totalWidth = bars.length * (barWidth + gap) - gap;
            const startX = (rect.width - totalWidth) / 2;

            // Create gradient for bars
            const gradient = ctx.createLinearGradient(0, centerY - 50, 0, centerY + 50);
            gradient.addColorStop(0, "#818cf8"); // indigo-400
            gradient.addColorStop(0.5, "#6366f1"); // indigo-500
            gradient.addColorStop(1, "#4f46e5"); // indigo-600

            bars.forEach((bar, i) => {
                // Smooth animation toward target
                bar.height += (bar.target - bar.height) * 0.1;

                // Randomly change target for organic movement
                if (Math.random() < 0.05) {
                    bar.target = isActive
                        ? Math.random() * 0.7 + 0.2
                        : Math.random() * 0.2 + 0.05;
                }

                const maxHeight = 80;
                const height = bar.height * maxHeight;
                const x = startX + i * (barWidth + gap);

                // Draw bar with rounded caps
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x, centerY - height / 2, barWidth, height, 2);
                ctx.fill();
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [bars, isActive]);

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 shadow-2xl">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 via-transparent to-violet-500/5 pointer-events-none" />

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* AI Avatar placeholder */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>

                {/* Waveform visualizer */}
                <canvas
                    ref={canvasRef}
                    className="w-full h-24 max-w-xs"
                />
            </div>

            {/* Label */}
            <div className="absolute bottom-4 left-4 z-10">
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">AI Interviewer</span>
                </div>
            </div>
        </div>
    );
}
