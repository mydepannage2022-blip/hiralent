import Image from "next/image";

const FeaturedPost = () => {
    return (
        <section className="w-full flex justify-between mt-12">
            <div className="w-full grid md:grid-cols-2 gap-4 items-center">
                {/* Left Text */}
                <div>
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3">
                        Finding Your First Job Without Experience?
                    </h2>
                    <p className="font-medium text-[#A5A5A5] mb-4">28 Sep, 2025 - 1 min Read</p>
                    <p className="text-lg text-[#515151] font-medium">
                        Learn how to successfully land your first job even without prior experience by using smart strategies, building essential skills, and making the most of available opportunities.Learn how to successfubuilding essential skills, and making the most of availableand making the most of availableand making the most of.
                    </p>
                </div>

                {/* Right Image */}
                <div className="relative w-full h-64 md:h-80">
                    <Image
                        src="/images/firstjob.png"
                        alt="Featured Job"
                        fill
                        className="object-cover rounded-lg"
                    />
                </div>
            </div>
        </section>
    );
};

export default FeaturedPost;