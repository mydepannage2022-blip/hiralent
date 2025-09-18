'use client'

import React from "react";
import TabsNav from "../../../src/components/footer/about/TabsNav";
import AboutSection from "../../../src/components/footer/about/AboutSection";
import WhoWeAre from "../../../src/components/footer/about/WhoWeAre";
import WhyChooseUs from "../../../src/components/footer/about/WhyChooseUs";
import OurTeam from "../../../src/components/footer/about/OurTeam";

export default function AboutPage() {
    return (
        <main className="mt-30 md:mt-35 mb-20 mx-auto max-w-[1280px]">
            <h1 className="text-6xl font-bold text-center mb-4">About Hiralent</h1>
            <p className="text-lg text-center text-[#515151] mb-8 font-medium">Last updated March 12, 2024</p>

            {/* Tabs Navigation */}
            <TabsNav />

            {/* Sections */}
            <AboutSection />
            <WhoWeAre />
            <WhyChooseUs />
            <OurTeam/>
        </main>
    );
}