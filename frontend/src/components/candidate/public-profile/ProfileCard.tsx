// components/ProfileCard.tsx
"use client";

import { ArrowDown, ExternalLink } from "lucide-react";
import Image from "next/image";

export default function ProfileCard() {
    return (
        <div className="w-[288px] sm:w-[425px] bg-white rounded-xl p-6 ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-full overflow-hidden relative flex-shrink-0">
                    <Image
                        src="/images/candidateprofile.png"
                        alt="avatar"
                        fill
                        className="object-cover"
                    />
                </div>

                <div className="text-right">
                    <h3 className="text-lg font-semibold text-[#0f172a]">huzaifa iqbal</h3>
                    <p className="text-xs text-gray-400 mt-2">huzaifaiqbal55544@gmail.com</p>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md text-sm text-gray-700 border border-gray-200">
                    <span>Eligible to work in</span>
                    <span className="font-medium">Pakistan</span>
                </div>

                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-md text-sm text-gray-700 gap-4 border border-gray-200">
                    <div className="w-3 h-3 overflow-hidden relative flex-shrink-0">
                        <Image
                            src="/images/fileicon.png"
                            alt="avatar"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span>Find huzaifa in</span>
                    <a
                        href="#"
                        className="flex gap-1 items-center text-blue-600 font-medium underline-offset-2 hover:underline"
                    >
                        Portfolio <ExternalLink className="w-4 h-4"/>
                    </a>
                </div>
            </div>

            <div className="mt-6">
                <a
                    href="#"
                    className="flex text-sm text-blue-900 font-medium hover:underline justify-center items-center gap-2"
                >
                    Learn more about hiring <ArrowDown className="w-4 h-4 text-black"/>
                </a>
            </div>
        </div>
    );
}