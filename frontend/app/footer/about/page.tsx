import TabsNav from "../../../src/components/footer/about/TabsNav";
import AboutSection from "../../../src/components/footer/about/AboutSection";
import WhoWeAre from "@../../../src/components/footer/about/WhoWeAre";

export default function AboutPage() {
    return (
        <main className="pt-10 mt-30">
            <h1 className="text-4xl font-bold text-center mb-2">About Hiralent</h1>
            <p className="text-center text-gray-500 mb-6">Last updated March 12, 2024</p>

            {/* Tabs Navigation */}
            <TabsNav />

            {/* Sections */}
            <AboutSection />
            <WhoWeAre />
        </main>
    );
}