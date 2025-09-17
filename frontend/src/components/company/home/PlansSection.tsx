import PlansTestimonialCard from "./PlansTestimonialCard";
import JobFormCard from "./JobFormCard";

export default function PlansSection() {
    return (
        <section
            className="relative bg-[#1a1a1a] py-8 px-4 sm:p-10 md:p-13 lg:p-20 text-white"
            style={{
                backgroundImage: "url('/images/bg-pattern.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* mdkcmd */}
            <div className="max-w-5xl xl:max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center">
                {/* Left Side */}
                <div className="mb-8 md:mb-0 max-w-[350px] sm:max-w-[425px] lg:max-w-[768px] justify-center">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4">
                        Our plans to buy for more features
                    </h2>
                    <p className="text-sm sm:text-base lg:text-lg text-gray-300 mb-6 max-w-md">
                        You can find various solutions just by accessing our platform.
                        Because we are committed to maintaining the quality of user service.
                    </p>
                    <button className="max-w-[160px] sm:max-w-[320px] w-full bg-[#005DDC] hover:bg-[#003E93] text-white font-medium px-6 py-3 rounded-md cursor-pointer">
                        Buy
                    </button>
                </div>

                {/* Right Side */}
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <PlansTestimonialCard
                        profileImage="/images/planssectionavatar.png"
                        name="Roberto Alexander"
                        role="UI/UX Designer"
                        review="It's amazing, using this platform really helped me in finding a job according to my field. Thanks a lot jobfind!."
                        date="This week"
                        rating={5}
                        progress={77}
                    />
                    <JobFormCard />
                </div>
            </div>
        </section>
    );
}