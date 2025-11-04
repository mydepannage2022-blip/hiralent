"use client";
import { useState } from "react";
import LabeledInput from "./LabeledInput";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
}

const JobDescriptionSection = ({ isEditing }: Props) => {
    const [days, setDays] = useState<string[]>(["Saturday to Wednesday 12 AM to 18 PM"]);
    const [businessTrips, setBusinessTrips] = useState<string[]>(["One day a Month"]);
    const [desc, setDesc] = useState(
        "we are dedicated to innovation and excellence. Our mission is to provide high-quality products and services that enhance everyday life. With a team of passionate experts, we continuously push the boundaries of creativity and technology. Customer satisfaction is at the heart of everything we do. We believe in sustainability, efficiency, and delivering outstanding value. Join us as we shape the future together."
    );

    const maxChars = 512;

    return (
        <div className="space-y-5">
            {isEditing ? (
                <>
                    <div className="flex flex-wrap">
                        {days.map((d) => (
                            <Tag
                                key={d}
                                label={d}
                                onRemove={() => setDays((prev) => prev.filter((x) => x !== d))}
                            />
                        ))}
                    </div>

                    <div className="space-y-8">
                        {/* Days */}
                        <LabeledInput label="Working Hours & Days" value={days[0]} required />
                        {/* Business Trips */}
                        <LabeledInput label="Required Business Trips" value={businessTrips[0]} required />
                    </div>

                    <div className="flex flex-wrap mb-6">
                        {businessTrips.map((b) => (
                            <Tag
                                key={b}
                                label={b}
                                onRemove={() => setBusinessTrips((prev) => prev.filter((x) => x !== b))}
                            />
                        ))}
                    </div>

                    {/* Description */}
                    <div>
                        <LabeledInput
                            label="Job Description & Required Skills"
                            value={desc}
                            textarea
                            required
                            onChange={(e) => setDesc(e.target.value)}
                        />
                        <p className="mt-1 pr-4 text-sm text-[#757575] text-right">
                            <span className="font-medium">{desc.length}</span>/{maxChars}
                        </p>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-start gap-6">
                    <div className="flex flex-col items-start gap-6">
                        {[...days, ...businessTrips].map((val) => (
                            <span
                                key={val}
                                className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                            >
                                {val}
                            </span>
                        ))}
                    </div>
                    <p className="text-[#282828] text-sm leading-relaxed whitespace-pre-line border border-[#F4F4F4] rounded-md py-2 px-3">
                        {desc}
                    </p>
                </div>
            )}
        </div>
    );
};

export default JobDescriptionSection;