"use client";

const ContactBox = () => {
    return (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4 mt-8">
            <div>
                <h3 className="font-semibold text-gray-800">Still have questions?</h3>
                <p className="text-sm text-gray-600">
                    Can’t find the answer you’re looking for? Please chat to our friendly team.
                </p>
            </div>
            <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 transition">
                Get in touch
            </button>
        </div>
    );
};

export default ContactBox;