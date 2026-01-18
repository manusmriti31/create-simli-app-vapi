"use client";

import React, { useRef, useEffect, useState } from "react";

interface CameraPanelProps {
    onCameraReady?: (stream: MediaStream) => void;
}

/**
 * CameraPanel - Displays user's webcam feed
 */
export default function CameraPanel({ onCameraReady }: CameraPanelProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                console.log("Requesting camera access...");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user"
                    },
                    audio: false
                });

                console.log("Camera stream obtained:", stream);
                streamRef.current = stream;

                // Assign stream to video element
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    console.log("Stream assigned to video element");
                }

                onCameraReady?.(stream);
                setCameraError(null);
                setIsLoading(false);
            } catch (err: any) {
                console.error("Camera access error:", err);
                setCameraError(err.message || "Failed to access camera");
                setIsLoading(false);
            }
        };

        startCamera();

        return () => {
            console.log("Cleaning up camera stream");
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    track.stop();
                    console.log("Stopped track:", track.kind);
                });
            }
        };
    }, []); // Remove onCameraReady from deps to avoid re-running

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 shadow-2xl">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none z-10" />

            {/* Video element - always in DOM */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] ${isLoading || cameraError ? 'invisible' : 'visible'}`}
            />

            {/* Loading state */}
            {isLoading && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            )}

            {/* Error state */}
            {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6">
                    <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-sm text-center">{cameraError}</p>
                    <p className="text-xs mt-2 opacity-60">Please enable camera access</p>
                </div>
            )}

            {/* Label */}
            <div className="absolute bottom-4 left-4 z-20">
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                    <span className="text-white text-sm font-medium">You</span>
                </div>
            </div>

            {/* Live indicator - only show when camera is working */}
            {!cameraError && !isLoading && (
                <div className="absolute top-4 right-4 z-20">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-white/70 text-xs">Live</span>
                    </div>
                </div>
            )}
        </div>
    );
}
