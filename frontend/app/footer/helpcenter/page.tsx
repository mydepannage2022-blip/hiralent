"use client";

import SearchBar from "../../../src/components/footer/helpcenter/SearchBar";
import HelpCardGrid from "../../../src/components/footer/helpcenter/HelpCardGrid";
import ContactBox from "../../../src/components/footer/helpcenter/ContactBox";
import FAQSection from "../../../src/components/footer/helpcenter/FAQSection";

const HelpCenterPage = () => {
    const helpCards = [
        {
            icon: "/images/help1.png",
            title: "Can i try free trial now?",
            description: "We understand your unique needs and provide customized hiring strategies to ensure the perfect match"
        },
        {
            icon: "/images/help2.png",
            title: "How to Follow a Company on Joblin?",
            description: "We understand your unique needs and provide customized hiring strategies to ensure the perfect match"
        },
        {
            icon: "/images/help3.png",
            title: "Activate your Joblin account?",
            description: "We understand your unique needs and provide customized hiring strategies to ensure the perfect match"
        },
        {
            icon: "/images/help4.png",
            title: "How to search for jobs?",
            description: "We understand your unique needs and provide customized hiring strategies to ensure the perfect match"
        },
        {
            icon: "/images/help5.png",
            title: "How to set-up and edit your Profile?",
            description: "We understand your unique needs and provide customized hiring strategies to ensure the perfect match"
        },
        {
            icon: "/images/help6.png",
            title: "Account Settings and Security",
            description: "We understand your unique needs and provide customized hiring strategies to ensure the perfect match"
        },
    ];

    const faqItems = [
        { question: "Can I upgrade or downgrade my plan at any time?", answer: "Yes, you can easily switch plans..." },
        { question: "Can I try the plans before purchasing?", answer: "Yes! We offer a free trial period that allows you to explore all the features of your chosen plan before making a commitment. During this trial, you can test the functionality, evaluate the performance, and determine if it meets your needs. There are no charges during the trial period, and you can cancel anytime before it ends without being billed." },
        { question: "Are taxes included in the pricing?", answer: "Taxes are calculated at checkout..." },
        { question: "Do you offer refunds if I’m not satisfied with the service?", answer: "Yes, we provide a refund policy..." },
        { question: "What payment methods do you accept?", answer: "Yes, we provide a refund policy..." },
    ];

    return (
        <main className="px-4 sm:p-0 max-w-[608px] mx-auto sm:max-w-2xl sm:mx-10 md:mx-13 sm:max-w-5xl xl:max-w-7xl lg:mx-auto mt-30 md:mt-35 mb-20">
            <SearchBar />
            <HelpCardGrid cards={helpCards} />
            <ContactBox />
            <FAQSection title="FAQs – Everything You Need to Know" tabs={["General", "For Employer", "For Jobseeker"]} items={faqItems} />
        </main>
    );
};

export default HelpCenterPage;