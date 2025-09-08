"use client";

import { FaQuestionCircle, FaUserShield, FaBriefcase, FaRegEdit } from "react-icons/fa";
import SearchBar from "../../../src/components/footer/SearchBar";
import HelpCardGrid from "../../../src/components/footer/HelpCardGrid";
import ContactBox from "../../../src/components/footer/ContactBox";
import FAQSection from "../../../src/components/footer/FAQSection";

const HelpCenterPage = () => {
    const helpCards = [
        { icon: <FaQuestionCircle />, title: "Can I try free trial now?", description: "Lorem ipsum dolor sit amet..." },
        { icon: <FaBriefcase />, title: "How to search for jobs?", description: "We understand your unique needs..." },
        { icon: <FaRegEdit />, title: "How to set-up and edit your Profile?", description: "We help you customize hiring..." },
        { icon: <FaUserShield />, title: "Account Settings and Security", description: "Manage your account securely..." },
        { icon: <FaUserShield />, title: "Account Settings and Security", description: "Manage your account securely..." },
        { icon: <FaUserShield />, title: "Account Settings and Security", description: "Manage your account securely..." },
    ];

    const faqItems = [
        { question: "Can I upgrade or downgrade my plan at any time?", answer: "Yes, you can easily switch plans..." },
        { question: "Can I try the plans before purchasing?", answer: "We offer a free trial period..." },
        { question: "Are taxes included in the pricing?", answer: "Taxes are calculated at checkout..." },
        { question: "Do you offer refunds if not satisfied?", answer: "Yes, we provide a refund policy..." },
    ];

    return (
        <main className="max-w-6xl mx-auto px-4 py-12 mt-30 md:mt-35 mb-20">
            <SearchBar />
            <HelpCardGrid cards={helpCards} />
            <ContactBox />
            <FAQSection title="FAQs – Everything You Need to Know" tabs={["General", "For Employer", "For Jobseeker"]} items={faqItems} />
        </main>
    );
};

export default HelpCenterPage;