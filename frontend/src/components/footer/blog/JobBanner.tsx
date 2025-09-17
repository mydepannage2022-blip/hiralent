import Image from "next/image";

const JobBanner = () => {
    return (
        <section className="mt-24 relative w-full mx-auto">
            <div className="relative w-full h-64 sm:h-72 md:h-96 rounded-lg overflow-hidden">
                {/* Background Image */}
                <Image
                    src="/images/firstjob2.png"
                    alt="First Job Banner"
                    fill
                    className="object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/15" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 px-4 sm:px-6 md:px-10 py-4 text-white w-full">
                    {/* Title */}
                    <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 leading-snug">
                        First Job, No Experience?
                    </h2>

                    {/* Description */}
                    <p className="text-xs sm:text-sm md:text-base max-w-full text-white/95 mb-3 sm:mb-4">
                        Learn how to get hired without experience, smart strategies for
                        landing your first job.
                    </p>

                    {/* Category */}
                    <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                        <span className="inline-flex items-center text-xs sm:text-sm px-2 sm:px-3 py-0.5 rounded-sm border border-white text-white">
                            Career
                        </span>
                        <span className="inline-flex items-center text-xs sm:text-sm px-2 sm:px-3 py-0.5 rounded-sm border border-white text-white">
                            Job Market
                        </span>
                    </div>

                    {/* Author + Date */}
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs md:text-sm text-white/90">
                        <span>By Ana Amiri</span>
                        <span>•</span>
                        <span>12 Jan 2025</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default JobBanner;