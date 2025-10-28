'use client'

import React from "react";
import OverviewCard from '@/src/components/company/public-profile/OverviewCard';

const CustomerReviews = () => {
    return (
        <section className="w-full px-4 mx-auto max-w-[1440px]">
            <div className="text-center mb-8 items-center flex flex-col">
                <h1 className="text-2xl sm:text-4xl font-medium mb-2">Customer Reviews & Feedback</h1>
                <p className="text-sm sm:text-base text-[#757575] max-w-[450px]">See what our users say about our pricing plans and share your own experience!.</p>
            </div>

            <div className="sm:mx-6 md:mx-9 lg:mx-28 xl:mx-16">
                {/* Overview Section */}
                <div className="py-6 sm:py-8 sm:mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <OverviewCard
                            name="Cody Fisher"
                            role="Job Seeker"
                            avatar="/images/avatar4.png"
                            rating={4.5}
                            text="I really appreciate how well you get along with everyone in the office. Your communication skills are so strong and you have a unique ability to make your teammates feel seen and heard"
                            likes={14}
                            dislikes={0}
                        />
                        <OverviewCard
                            name="Darlene Robertson"
                            role="Job Seeker"
                            avatar="/images/avatar5.png"
                            rating={4.5}
                            text="I’ve been doing my best to follow your advice and speak up more in meetings. It’s definitely out of my comfort zone, but I’m starting to feel more confident. I appreciate you encouraging me to share my ideas"
                            likes={56}
                            dislikes={1}
                        />
                        <OverviewCard
                            name="Ronald Richards"
                            role="Job Seeker"
                            avatar="/images/avatar6.png"
                            rating={4.5}
                            text="When I applied for a position at BMW, I knew I was about to experience one of the most challenging job interviews of my career. But what I didn’t expect was the incredible combination of professionalism, creativity, and team culture throughout the process."
                            likes={65}
                            dislikes={7}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CustomerReviews;