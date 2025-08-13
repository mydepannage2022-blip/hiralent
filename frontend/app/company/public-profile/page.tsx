'use client'

import React, { useState } from 'react';
import Navbar from '../../src/components/layout/Navbar'
import Image from 'next/image';
import CompanyInfoCard from '../../src/components/company/public-profile/CompanyInfoCard';

const publicProfile = () => {
    return (
        <div className="text-black">
            <div className="mt-30 mb-20">
                {/* Banner */}
                <div className="relative h-56 w-full overflow-hidden">
                    <Image
                        src="/images/publicprofile-banner.png" // your banner image path
                        alt="Company banner"
                        fill
                        className="object-cover blur-sm scale-105"
                    />
                </div>
                <div className="relative w-full">

                    {/* Card */}
                    <div className="relative z-10 -mt-20 px-4">
                        <CompanyInfoCard
                            logo="/images/bmw-logo.png"
                            name="BMW"
                            website="bmw.com"
                            websiteUrl="https://bmw.com"
                            location="Germany"
                            companySize="1000"
                            email="BMW@gmail.com"
                            phone="+1 98482346"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default publicProfile;