"use client";

interface InputProps {
    label: string;
    placeholder?: string;
    value?: string;
    type?: string;
    required?: boolean;
    textarea?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const LabeledInput = ({
    label,
    placeholder,
    value,
    type = "text",
    required = false,
    textarea = false,
}: InputProps) => {
    return (
        <div className="relative w-full">
            <label className="text-sm sm:text-base absolute -top-3 left-3 bg-white px-2 font-medium text-black">
                {label}
                {required && <span className="text-[#DC0000] ml-0.5">*</span>}
            </label>

            {textarea ? (
                <textarea
                    placeholder={value ? undefined : placeholder}
                    defaultValue={value}
                    className="w-full rounded-md border border-[#A5A5A5] px-4 py-4 focus:ring-2 focus:ring-black focus:outline-none resize-none"
                    rows={4}
                />
            ) : (
                <input
                    type={type}
                    placeholder={value ? undefined : placeholder}
                    defaultValue={value}
                    className="w-full rounded-md border border-[#A5A5A5] px-4 py-3 focus:ring-2 focus:ring-black focus:outline-none"
                />
            )}
        </div>
    );
};

export default LabeledInput;