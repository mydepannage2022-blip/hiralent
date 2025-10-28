import Image from "next/image";

interface PostCardProps {
    image: string;
    title: string;
    description: string;
    date: string;
    categories?: string[];
}

const PostCard = ({ image, title, description, date, categories = [] }: PostCardProps) => {
    return (
        <article className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
            {/* Left Thumbnail */}
            <div className="relative w-full sm:w-64 h-48 sm:h-auto">
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover rounded-t-lg sm:rounded-l-lg sm:rounded-t-none"
                />
            </div>

            {/* Right Content */}
            <div className="flex flex-col p-5 flex-1">
                {/* Date */}
                <span className="text-xs text-gray-500 mb-1">{date}</span>

                {/* Title */}
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-[#005DDC] cursor-pointer">
                    {title}
                </h3>

                {/* Categories */}
                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {categories.map((cat, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center text-xs tracking-wider px-3 py-0.5 rounded-sm border border-[#A5A5A5] bg-white text-[#515151]"
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                )}

                {/* Description */}
                <p className="text-xs lg:text-sm xl:text-lg text-gray-600">{description}</p>
            </div>
        </article>
    );
};

export default PostCard;