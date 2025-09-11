"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

export type AccordionItem = {
    question: string;
    answer: string;
};

type AccordionProps = {
    items: AccordionItem[];
};

const Accordion = ({ items }: AccordionProps) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="w-full space-y-3">
            {items.map((item, index) => {
                const isOpen = openIndex === index;
                return (
                    <div
                        key={index}
                        className={`rounded-md border border-gray-200 transition-colors ${isOpen ? "bg-[#EDEDED]" : "bg-white"
                            }`}
                    >
                        {/* Question */}
                        <button
                            onClick={() => toggle(index)}
                            className="flex w-full items-center justify-between p-4 sm:p-6 text-left text-base font-medium text-gray-800 focus:outline-none cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                {isOpen && <span className="text-gray-600">•</span>}
                                {item.question}
                            </span>
                            <span className="ml-2 text-gray-500">
                                {isOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                            </span>
                        </button>

                        {/* Answer */}
                        <AnimatePresence initial={false}>
                            {isOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-7 pb-4 text-sm text-gray-600 leading-relaxed">
                                        {item.answer}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};

export default Accordion;