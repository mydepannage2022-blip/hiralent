"use client";

import { useState } from "react";
import { MapPin, Phone } from "lucide-react";

// --- Input with fixed label on border ---
interface InputProps {
    label: string;
    placeholder: string;
    type?: string;
    textarea?: boolean;
}
const LabeledInput = ({
    label,
    placeholder,
    type = "text",
    textarea = false,
}: InputProps) => (
    <div className="relative">
        <label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-black">
            {label}
        </label>
        {textarea ? (
            <textarea
                placeholder={placeholder}
                className="w-full rounded-md border border-[#A5A5A5] px-4 py-4 text-sm focus:ring-2 focus:ring-black focus:outline-none h-28 resize-none"
            />
        ) : (
            <input
                type={type}
                placeholder={placeholder}
                className="w-full rounded-md border border-[#A5A5A5] px-4 py-4 text-sm focus:ring-2 focus:ring-black focus:outline-none"
            />
        )}
    </div>
);

const ContactPage = () => {
    const [message, setMessage] = useState("");

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 mt-30 md:mt-35 mb-20">
            {/* HEADER */}
            <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-6xl font-bold mb-4">Contact Hiralent</h1>
                <p className="text-gray-600 text-xl max-w-xl mx-auto font-medium">
                    We’d love to hear from you! Whether you have a question, feedback, or
                    just want to say hello, feel free to reach out. Our team is here to
                    assist you.
                </p>
            </div>

            {/* MAIN FLEX */}
            <div className="flex flex-col lg:flex-row gap-12">
                {/* LEFT SIDE with BACKGROUND IMAGE */}
                <div
                    className="w-full lg:w-1/3 relative rounded-lg min-h-[768px] flex-shrink-0"
                    style={{
                        backgroundImage: "url('/images/contact-left.png')", // 🔹 replace with your image path
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    {/* Overlay text */}
                    <div className="absolute bottom-6 left-0 right-0 space-y-4 px-4">
                        <p className="flex items-center justify-center lg:justify-start gap-2 text-black font-medium">
                            <MapPin className="w-5 h-5" /> 1500 Marilla St, Dallas, TX 75201
                        </p>
                        <p className="flex items-center justify-center lg:justify-start gap-2 text-black font-medium">
                            <Phone className="w-5 h-5" /> 1(647)558-5560
                        </p>
                    </div>
                </div>

                {/* RIGHT SIDE (FORM) - VERTICALLY CENTERED */}
                <div className="flex-1 flex items-center justify-center">
                    <form className="space-y-6 w-full max-w-lg">
                        <LabeledInput
                            label="First name"
                            placeholder="Type your first name here"
                        />
                        <LabeledInput
                            label="Last name"
                            placeholder="Type your last name here"
                        />
                        <LabeledInput
                            label="Email"
                            placeholder="Type your email address here"
                            type="email"
                        />
                        <LabeledInput
                            label="Location"
                            placeholder="Type your address here"
                        />

                        <div>
                            <LabeledInput
                                label="Message"
                                placeholder="Type your issue here"
                                textarea
                            />
                            {/* ✅ Live counter */}
                            <div className="flex justify-end text-gray-500 text-sm mt-1">
                                {message.length}/512
                            </div>
                        </div>

                        {/* Button */}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md text-lg font-medium transition"
                        >
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;