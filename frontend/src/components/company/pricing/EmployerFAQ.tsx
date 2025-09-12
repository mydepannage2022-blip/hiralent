"use client";

import Accordion, { AccordionItem } from "./Accoridian";

const faqItems: AccordionItem[] = [
    {
        question: "Can I upgrade or downgrade my plan at any time?",
        answer: "Yes! You can upgrade or downgrade your subscription at any time directly from your account settings."
    },
    {
        question: "Can I try the plans before purchasing?",
        answer: "Yes! We offer a free trial period that allows you to explore all the features of your chosen plan before making a commitment. During this trial, you can test the functionality, evaluate the performance, and determine if it meets your needs. There are no charges during the trial period, and you can cancel anytime before it ends without being billed."
    },
    {
        question: "Are taxes included in the pricing?",
        answer: "Taxes are calculated based on your billing address and will be shown at checkout."
    },
    {
        question: "Do you offer refunds if I’m not satisfied with the service?",
        answer: "Yes, we have a 14-day money-back guarantee. If you’re not satisfied, you can request a full refund."
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept major credit/debit cards, PayPal, and bank transfers depending on your region."
    }
];

const EmployerFAQ = () => {
    return (
        <section className="max-w-4xl md:max-w-5xl xl:max-w-7xl sm:mx-6 md:mx-13 lg:mx-auto mb-20 md:p-0 p-4">
            <div className="text-center mb-8 items-center flex flex-col">
                <h1 className="text-2xl sm:text-4xl font-medium mb-2">Pricing FAQs – Everything You Need to Know</h1>
                <p className="text-sm sm:text-base text-[#757575] max-w-[450px]">Find answers to common questions about our plans, payments, and policies.</p>
            </div>
            <Accordion items={faqItems} />
        </section>
    );
};

export default EmployerFAQ;