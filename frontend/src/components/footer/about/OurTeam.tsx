'use client'
import PeopleCard from "./PeopleCard"

export default function WhoWeAre() {
    return (
        <section id="our-team" className="py-12 mx-auto">
            <h2 className="text-2xl md:text-4xl font-medium text-center mb-3">Our Team</h2>
            <p className="text-center text-[#757575] mb-12 max-w-[475px] mx-auto">We believe that creative collaboration can happen anywhere and want our team to work where they feel comfortable and inspired.</p>

            {/* People Section */}
            <div className="py-6 sm:py-8 sm:mb-8">
                {/* Row + column gaps controlled separately */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-12 items-start">
                    <PeopleCard
                        image="/images/people1.png"
                        name="Cameron Williamson"
                        role="Product Analyst"
                        socials={[
                            { type: 'linkedin', href: '#' },
                            { type: 'dribbble', href: '#' },
                            { type: 'instagram', href: '#' },
                        ]}
                    />
                    <PeopleCard
                        image="/images/people2.png"
                        name="Cody Fisher"
                        role="Data Analyst Lead"
                        socials={[
                            { type: 'linkedin', href: '#' },
                            { type: 'dribbble', href: '#' },
                            { type: 'instagram', href: '#' },
                        ]}
                    />
                    <PeopleCard
                        image="/images/people3.png"
                        name="Brooklyn Simmons"
                        role="Senior Interaction Designer"
                        socials={[
                            { type: 'linkedin', href: '#' },
                            { type: 'dribbble', href: '#' },
                            { type: 'instagram', href: '#' },
                        ]}
                    />
                    <PeopleCard
                        image="/images/people4.png"
                        name="Kristin Watson"
                        role="Head of Product Design"
                        socials={[
                            { type: 'linkedin', href: '#' },
                            { type: 'dribbble', href: '#' },
                            { type: 'instagram', href: '#' },
                        ]}
                    />
                    <PeopleCard
                        image="/images/people5.png"
                        name="Darrell Steward"
                        role="Head of Engineering"
                        socials={[
                            { type: 'linkedin', href: '#' },
                            { type: 'dribbble', href: '#' },
                            { type: 'instagram', href: '#' },
                        ]}
                    />
                </div>
            </div>
        </section>
    );
}