'use client';

import { useState } from 'react';
import Image from 'next/image';

const PublicProfileTabs = () => {
    const [activeTab, setActiveTab] = useState('aboutcompany');

    const tabs = [
        { id: 'aboutcompany', label: 'About Company' },
        { id: 'peopleatbmw', label: 'People at BMW' },
        { id: 'overview', label: 'Overview' },
        { id: 'jobsfrombmw', label: 'Jobs From BMW' },
    ];

    return (
        <div className="w-full">
            {/* Tabs Navigation */}
            <div className="flex border-b border-[#CBCBCB] gap-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`sm:px-4 py-2 text-xs sm:text-sm md:text-lg font-medium transition-colors duration-200
              ${activeTab === tab.id
                                ? 'border-b-2 border-[#005DDC] text-[#005DDC]'
                                : 'text-[#515151]'
                            }
            `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tabs Content */}
            <div className="pt-6 sm:py-8">
                {activeTab === 'aboutcompany' &&
                    <>
                        <h1 className="text-2xl font-bold mb-4">Company Informations</h1>
                        <p className="text-base sm:text-lg">BMW is synonymous with engineering excellence, consistently setting the standard for precision, performance, and technological innovation across its entire range of vehicles. Driven by a customer-centric approach, the brand seamlessly integrates dynamic handling, powerful engine performance, and sophisticated design to deliver a truly premium and exhilarating driving experience. Beyond performance, BMW is deeply committed to sustainability, focusing on the development of electric mobility solutions, eco-friendly manufacturing processes, and reducing its overall environmental footprint. This commitment to a greener future is reflected in the company’s continued efforts to lead the automotive industry into a smarter, more sustainable era. Rooted in a rich heritage of German craftsmanship, BMW remains dedicated to delivering timeless style, engineering mastery, and a driving experience that continuously redefines what it means to be a leader in luxury automobiles.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6 sm:py-8">
                            {/* Left column */}
                            <div className="grid gap-4 md:col-span-1">
                                <div className="relative w-full h-40 md:h-32">
                                    <Image
                                        src="/images/companyinfo1.png"
                                        alt="Image 1"
                                        fill
                                        className="object-cover rounded-lg"
                                    />
                                </div>
                                <div className="relative w-full h-40 md:h-32">
                                    <Image
                                        src="/images/companyinfo2.png"
                                        alt="Image 2"
                                        fill
                                        className="object-cover rounded-lg"
                                    />
                                </div>
                                <div className="relative w-full h-40 md:h-32">
                                    <Image
                                        src="/images/companyinfo3.png"
                                        alt="Image 3"
                                        fill
                                        className="object-cover rounded-lg"
                                    />
                                </div>

                                {/* Big image (only visible on mobile) */}
                                <div className="relative w-full h-60 md:hidden">
                                    <Image
                                        src="/images/companyinfo4.png"
                                        alt="Main Image"
                                        fill
                                        className="object-cover rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Right column (hidden on mobile) */}
                            <div className="relative w-full h-full md:col-span-2 hidden md:block">
                                <Image
                                    src="/images/companyinfo4.png"
                                    alt="Main Image"
                                    fill
                                    className="object-cover rounded-lg"
                                />
                            </div>
                        </div>
                    </>
                }
                {activeTab === 'peopleatbmw' && <p>...</p>}
                {activeTab === 'overview' && <p>...</p>}
                {activeTab === 'jobsfrombmw' && <p>...</p>}
            </div>
        </div>
    );
}

export default PublicProfileTabs;