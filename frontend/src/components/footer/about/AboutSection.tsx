import Image from "next/image";

export default function AboutSection() {
    return (
        <section id="about" className="py-16 max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">About us</h2>
            <p className="text-center text-gray-500 mb-12">The last job offers Upload</p>

            <div className="grid md:grid-cols-2 gap-10 items-center">
                {/* Left Content */}
                <div className="space-y-4 text-gray-700 leading-relaxed">
                    <p>
                        At <span className="font-semibold">Hiralent</span>, we connect talented professionals with top career opportunities.
                    </p>
                    <p>
                        Since <span className="font-semibold">2025</span> our mission has been to provide tailored recruitment
                        solutions that fit the unique needs of employers and candidates.
                    </p>
                    <p>
                        Specializing in <span className="font-semibold">Job search and recruitment</span>, we offer comprehensive hiring
                        services to ensure the perfect match.
                    </p>
                    <p>
                        Our commitment to integrity, transparency, and excellence drives lasting relationships and successful outcomes.
                    </p>
                    <p>
                        Whether you&apos;re advancing your career or seeking the right talent, we&apos;re here to support you.
                    </p>
                </div>

                {/* Right Image */}
                <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden">
                    <Image
                        src="/images/About-us1.png"
                        alt="About Hiralent"
                        fill
                        className="object-cover"
                    />
                    {/* Overlay Badge */}
                    <div className="absolute top-4 right-4 bg-white text-sm px-3 py-1 rounded shadow">
                        Monthly employed <span className="font-semibold">5000+</span>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded shadow text-sm">
                        5000+ reviews ⭐
                    </div>
                </div>
            </div>
        </section>
    );
}