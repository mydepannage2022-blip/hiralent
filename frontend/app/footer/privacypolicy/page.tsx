"use client";

import React from "react";

const page = () => {
    return (
        <div className="px-4 sm:p-0 max-w-[608px] mx-auto sm:max-w-2xl sm:mx-10 md:mx-13 sm:max-w-5xl xl:max-w-7xl lg:mx-auto mt-30 md:mt-35 mb-20">
            {/* Title */}
            <div className="flex flex-col justify-center items-center">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold w-full max-w-sm sm:max-w-md lg:max-w-lg text-center">
                    The Hiralent's Privacy Policy
                </h1>
                <p className="sm:text-lg text-[#515151] mt-4 font-medium text-center">Our personal statement, cookies, third-parties</p>
            </div>

            {/* Sections */}
            <section className="mt-12 mb-10">
                <h2 className="text-2xl font-semibold mb-4">Personal Statement</h2>
                <p className="leading-relaxed">
                    This section serves as an introduction to the document. It explains the purpose of this statement, emphasizing
                    our commitment to being transparent and responsible regarding data collection and usage practices. We assure
                    you that we take steps to protect your personal information.
                </p>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">What are ‘cookies’?</h2>
                <p className="leading-relaxed mb-3">
                    Cookies are small text files that are stored on your device (computer, smartphone, tablet) when you visit a
                    website. They are used to remember information about your visit, such as your preferences and login details.
                    Cookies can be classified into two types:
                </p>
                <ul className="list-disc list-inside space-y-4">
                    <p>1. Session Cookies: Temporary cookies that expire once you close your browser.</p>
                    <p>2. Persistent Cookies: Cookies that remain on your device for a set period or until you delete them.</p>
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Why do we use cookies?</h2>
                <p className="leading-relaxed mb-3">We use cookies for various reasons, including:</p>
                <ul className="list-disc list-inside space-y-2">
                    <li>
                        <span className="font-medium">Enhancing User Experience:</span> Cookies help us remember your preferences
                        and settings, making your visits more personalized.
                    </li>
                    <li>
                        <span className="font-medium">Analytics:</span> We use cookies to gather data on how visitors interact with
                        our website, allowing us to improve functionality and content.
                    </li>
                    <li>
                        <span className="font-medium">Advertising:</span> Cookies can help us deliver relevant advertisements to you
                        based on your interests and browsing behavior.
                    </li>
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">
                    What information do we gather specifically?
                </h2>
                <p className="leading-relaxed mb-3">
                    We gather various types of information through cookies, including:
                </p>
                <ul className="list-disc list-inside space-y-2">
                    <li>
                        <span className="font-medium">User Preferences:</span> Language settings, display preferences, and other
                        customization options.
                    </li>
                    <li>
                        <span className="font-medium">Usage Data:</span> Information about how you interact with our website (pages
                        visited, time spent, links clicked).
                    </li>
                    <li>
                        <span className="font-medium">Device Information:</span> Details about the device you are using, such as
                        operating system, browser type, and IP address.
                    </li>
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">
                    What third-parties do we share your information with?
                </h2>
                <p className="leading-relaxed mb-3">
                    We may share key information with trusted third-parties to enhance our services, including:
                </p>
                <ul className="list-disc list-inside space-y-2">
                    <li>
                        <span className="font-medium">Analytics Providers:</span> Companies that help us analyze website traffic and
                        user behavior.
                    </li>
                    <li>
                        <span className="font-medium">Advertising Partners:</span> Third-party advertisers who may use your data to
                        serve targeted ads.
                    </li>
                    <li>
                        <span className="font-medium">Service Providers:</span> Vendors who assist us in supporting our website or
                        conducting our business.
                    </li>
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Website Media</h2>
                <p className="leading-relaxed">
                    This section refers to any media content featured on our website, such as images, videos, and audio files. We
                    ensure that all media is either owned by us or licensed. Users must respect the rights of content creators.
                    Users may not reproduce or distribute media without proper authorization.
                </p>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Disclosure of your information</h2>
                <p className="leading-relaxed">
                    We will not sell or rent your personal information to third-parties. However, we may disclose your information
                    if required to do so by law or in response to valid legal processes (e.g., subpoenas or court orders). We may
                    also disclose your information when necessary to protect our rights, safety, or property.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-semibold mb-4">Updates</h2>
                <p className="leading-relaxed">
                    We may revise this privacy statement from time to time to reflect changes in our practices or applicable laws.
                    We encourage you to review this document periodically for any updates. The date of the last revision will be
                    indicated at the bottom of this page.
                </p>
            </section>
        </div>
    );
};

export default page;