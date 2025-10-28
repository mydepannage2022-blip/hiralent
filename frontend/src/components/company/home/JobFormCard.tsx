import { Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";

export default function JobFormCard() {
    const [jobTitle, setJobTitle] = useState("Web Developer");
    const [jobType, setJobType] = useState("Full-Time");

    // states for toggling show/hide
    const [showJobTitle, setShowJobTitle] = useState(true);
    const [showJobType, setShowJobType] = useState(true);

    // tags state
    const [tags, setTags] = useState<string[]>(["Web Developer", "Full-Time"]);

    const removeTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    return (
        <div className="bg-white text-black rounded-lg p-6 w-full md:w-1/2">
            {/* Job Title */}
            <div className="mb-4">
                <label className="block font-medium mb-1">Job Title</label>
                <div className="flex items-center border border-[#A5A5A5] rounded-lg px-3 py-2">
                    <input
                        type={showJobTitle ? "text" : "password"}
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="flex-1 bg-transparent outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => setShowJobTitle(!showJobTitle)}
                        className="ml-2 lg:-ml-3 xl:ml-2 text-[#282828] hover:text-black cursor-pointer"
                    >
                        {showJobTitle ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>
            </div>

            {/* Job Type */}
            <div className="mb-4">
                <label className="block font-medium mb-1">Job Type</label>
                <div className="flex items-center border border-[#A5A5A5] rounded-lg px-3 py-2">
                    <input
                        type={showJobType ? "text" : "password"}
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="flex-1 bg-transparent outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => setShowJobType(!showJobType)}
                        className="ml-2 lg:-ml-3 xl:ml-2 text-[#282828] hover:text-black cursor-pointer"
                    >
                        {showJobType ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>
            </div>

            {/* Tags with removable X */}
            <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 px-3 py-1 bg-[#EDEDED] text-sm rounded-sm"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="mt-1 cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>

            {/* Experience Level */}
            <div className="mb-6">
                <label className="block font-medium my-6 text-xl">
                    Experience Level
                </label>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" /> 1 year
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" /> Less than 1 year
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" /> 2 years
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked /> More than 2 years
                    </label>
                </div>
            </div>

            {/* Button */}
            <button className="w-full text-[#005DDC] font-medium py-1 rounded-lg border border-[#005DDC] cursor-pointer">
                Post Job
            </button>
        </div>
    );
}