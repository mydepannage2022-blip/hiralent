'use client'

import React from 'react'
import EmployerPricingSection from "../../../src/components/company/pricing/EmployerPricingSection"
import EmployerFAQ from "../../../src/components/company/pricing/EmployerFAQ"
import CustomerReviews from "../../../src/components/company/pricing/CustomerReviews"

const page = () => {
    return (
        <div className="mt-30 md:mt-35 mb-20">
            <EmployerPricingSection />
            <EmployerFAQ />
            <CustomerReviews />
        </div>
    );
};

export default page