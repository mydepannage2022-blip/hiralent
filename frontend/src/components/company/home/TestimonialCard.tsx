import React from "react";

interface TestimonialCardProps {
    description: string;
    name: string;
    role: string;
    avatar: string;
    company: {
        name: string;
        logo: string;
    };
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
    description,
    name,
    role,
    avatar,
    company,
}) => {
    return (
        <div className="bg-[#F9F9F9] rounded-lg p-4 xl:p-8 flex flex-col h-full relative">
            {/* Quote Icon */}
            <img
                src="/images/quoteblack.png"
                alt="quote"
                className="w-8 mb-4"
            />

            {/* Testimonial Text */}
            <p className="text-sm xl:text-base text-black">{description}</p>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* User Info */}
            <div className="flex items-center gap-4">
                <img
                    src={avatar}
                    alt={name}
                    className="w-18 rounded-full object-cover"
                />
                <div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{name}</span>
                        <span className="text-sm text-gray-500">{role}</span>
                    </div>
                    {/* Company Info */}
                    <div className="flex items-center gap-2 mt-1">
                        <img src={company.logo} alt={company.name} className="w-5 h-5" />
                        <span className="text-sm text-gray-600">{company.name}</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TestimonialCard;