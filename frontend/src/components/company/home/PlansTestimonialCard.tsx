import { Star } from "lucide-react";

interface PlansTestimonialCardProps {
    profileImage: string;
    name: string;
    role: string;
    review: string;
    date: string;
    rating?: number;
    progress?: number; // percentage 0–100
}

export default function PlansTestimonialCard({
    profileImage,
    name,
    role,
    review,
    date,
    rating = 5,
    progress = 80, // default 80%
}: PlansTestimonialCardProps) {
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="bg-white text-black rounded-lg py-4 px-6 w-full md:w-1/2">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3 mb-2">
                {/* Avatar with progress ring */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                        <img
                            src={profileImage}
                            alt={name}
                            className="w-full h-full object-cover object-center"
                        />
                    </div>
                    <svg className="absolute w-13 h-13" viewBox="0 0 100 100">
                        {/* Background ring */}
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="white"
                            strokeWidth="8"
                        />
                        {/* Progress ring */}
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="#005DDC"
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={-offset}   // <--reversed here
                            transform="rotate(5 50 50)"
                        />
                    </svg>
                </div>

                <div>
                    <h4 className="lg:text-base xl:text-xl font-semibold">{name}</h4>
                    <p className="text-sm text-[#A5A5A5]">{role}</p>
                </div>
            </div>

            {/* Rating */}
            <div className="flex text-yellow-400 mb-4 gap-1">
                {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={18} fill="currentColor" />
                ))}
            </div>

            {/* Review */}
            <p className="text-black mb-6 font-medium text-lg">"{review}"</p>

            {/* Footer */}
            {/* Footer */}
            <div className="flex items-center gap-2 text-sm text-[#A5A5A5]">
                <img src="/images/fish.png" alt="fish" className="w-5 h-5" /> {/* Fish image */}
                <span className="w-1 h-1 rounded-full bg-[#A5A5A5]"></span> {/* Dot */}
                <span>{date}</span>
            </div>
        </div>
    );
}