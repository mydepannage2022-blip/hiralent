"use client";
import React, { useEffect, useRef } from "react";
import { X, Camera } from "lucide-react";

interface CameraCaptureProps {
    onClose: () => void;
    onCapture: (dataUrl: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // ✅ Start the camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user" },
                });
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch (err) {
                console.error("Camera access failed:", err);
                onClose();
            }
        };

        startCamera();

        // ✅ Clean up camera on unmount
        return () => stopCamera();
    }, [onClose]);

    // ✅ Stops and releases the camera completely
    const stopCamera = () => {
        const stream = streamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.pause();
            // Clearing srcObject ensures camera is released
            videoRef.current.srcObject = null;
            // This extra step ensures full release in Chrome
            videoRef.current.removeAttribute("srcObject");
            videoRef.current.load();
        }
    };

    // ✅ Capture photo
    const handleCapture = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/png");

        // Stop camera right away before sending
        stopCamera();

        // Delay slightly to ensure browser fully releases camera
        setTimeout(() => {
            onCapture(dataUrl);
        }, 150);
    };

    // ✅ Close modal and stop camera
    const handleClose = () => {
        stopCamera();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-4 w-[500px] max-w-full flex flex-col items-center gap-3">
                {/* Header */}
                <div className="w-full flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800 text-lg">Camera</h2>
                    <button onClick={handleClose}>
                        <X size={22} className="text-gray-600" />
                    </button>
                </div>

                {/* Video feed */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="rounded-xl w-full max-h-[400px] object-cover bg-black"
                />

                {/* Capture button */}
                <button
                    onClick={handleCapture}
                    className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2"
                >
                    <Camera size={20} />
                    Capture
                </button>
            </div>
        </div>
    );
};

export default CameraCapture;