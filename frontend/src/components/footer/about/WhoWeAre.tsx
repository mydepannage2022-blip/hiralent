import { Briefcase, Users, Building2 } from "lucide-react";

const stats = [
    { id: 1, label: "Live Jobs", value: "1,75,324", icon: Briefcase },
    { id: 2, label: "Candidates", value: "2,750", icon: Users },
    { id: 3, label: "Companies", value: "97,354", icon: Building2 },
];

export default function WhoWeAre() {
    return (
        <section id="who-we-are" className="py-16 max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Who we are</h2>
            <p className="text-center text-gray-500 mb-12">Get to know us</p>

            <div className="grid md:grid-cols-2 gap-10 items-center">
                {/* Left Content */}
                <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">
                        We’re highly skilled and professionals team.
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                        We provide tailored recruitment solutions designed to connect the best
                        talent with top companies. Our commitment to excellence, transparency,
                        and efficiency ensures successful outcomes for both employers and
                        candidates.
                    </p>
                </div>

                {/* Right Stats */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {stats.map((stat) => (
                        <div
                            key={stat.id}
                            className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg shadow-sm"
                        >
                            <stat.icon className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="text-xl font-semibold">{stat.value}</p>
                                <p className="text-gray-500 text-sm">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
