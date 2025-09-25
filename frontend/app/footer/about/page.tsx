'use client'

import React from "react";
import TabsNav from "../../../src/components/footer/about/TabsNav";
import AboutSection from "../../../src/components/footer/about/AboutSection";
import WhoWeAre from "../../../src/components/footer/about/WhoWeAre";
import WhyChooseUs from "../../../src/components/footer/about/WhyChooseUs";
import TestimonialsSection from "../../../src/components/footer/about/TestimonialsSection";
import OurTeam from "../../../src/components/footer/about/OurTeam";

const page = () => {
    return (
        <div className="mt-30 md:mt-35 mx-auto px-4 sm:p-0 max-w-[608px] sm:max-w-[690px] md:max-w-[920px] lg:max-w-[1024px] xl:max-w-[1280px]">
            <h1 className="text-4xl md:text-6xl font-bold text-center mb-4">About Hiralent</h1>
            <p className="text-lg text-center text-[#515151] mb-8 font-medium">Last updated March 12, 2024</p>

            {/* Tabs Navigation */}
            <TabsNav />

            {/* Sections */}
            <AboutSection />
            <WhoWeAre />
            <WhyChooseUs />
            <TestimonialsSection />
            <OurTeam />
        </div>
    );
};

export default page;
