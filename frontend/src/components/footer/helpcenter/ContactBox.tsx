"use client";

import Image from "next/image";

const ContactBox = () => {
    return (
        <div className="flex-col sm:flex-row flex sm:items-center justify-between bg-[#EFF5FF] rounded-lg p-4 sm:p-6 mt-8">
            {/* Left side with image + text */}
            <div className="flex items-start gap-4">
                <Image
                    src="/images/contact1.png" // 👉 place your image inside /public/images/contact.png
                    alt="Contact illustration"
                    width={48}
                    height={48}
                    className="flex-shrink-0"
                />
                <div>
                    <h3 className="font-semibold text-lg">
                        Still have questions?
                    </h3>
                    <p className="text-sm text-[#757575]">
                        Can’t find the answer you’re looking for? Please chat to our friendly team.
                    </p>
                </div>
            </div>
            {/* CTA button */}
            <button className="mt-4 sm:m-0 bg-[#005DDC] text-white rounded-md px-2 md:px-6 py-2 text-sm hover:bg-[#004EB7] font-medium">
                Get in touch
            </button>
        </div>
    );
};

export default ContactBox;