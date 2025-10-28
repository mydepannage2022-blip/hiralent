import React from "react";
import { motion } from "framer-motion";
import { Variants } from "framer-motion";

type Post = {
  id: number;
  image: string;
  categories: string[]; // multiple categories supported
  title: string;
  author: string;
  date: string;
  description: string;
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const blogBoxVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const blogPosts: Post[] = [
  {
    id: 1,
    image: "/images/blog1.png",
    categories: ["Job Market", "Career"],
    title: "When Should You Change Your Job?",
    author: "Mona Amiri",
    date: "13 March 2025",
    description:
      "A professional resume increases your chances of getting hired. This article covers key tips like choosing the right format, highlighting skills, and writing concisely. Following these principles makes your resu...",
  },
  {
    id: 2,
    image: "/images/blog2.png",
    categories: ["Freelancing", "Skills"],
    title: "Standing Out in Job Market",
    author: "Fateme Moradi",
    date: "16 Feb 2025",
    description:
      "In a competitive job market, showcasing unique skills, tailoring your resume, and building a strong online presence can set you apart. This article explores strategies to highlight your strengths and increase yo...",
  },
  {
    id: 3,
    image: "/images/blog3.png",
    categories: ["Career", "Interview"],
    title: "Skills Employers Seek",
    author: "Ali Amiri",
    date: "12 May 2025",
    description:
      "Employers value a combination of technical expertise and soft skills. This article highlights key skills like communication, problem-solving, and adaptability that make candidates more attractive to employers i...",
  },
];

export default function BlogSection() {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="flex flex-col justify-center items-center w-full">
        {/* Section heading (optional if you already render a heading above) */}
        <motion.div
          className="w-full max-w-4xl text-left"
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
        </motion.div>

        {/* Blog Posts Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blogPosts.map((post, index) => (
            <motion.div
              key={post.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
              variants={blogBoxVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{
                y: -5,
                transition: { duration: 0.25 },
              }}
            >
              {/* Blog Image */}
              <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Blog Content */}
              <div className="p-6 flex flex-col gap-4">
                {/* Categories (pills) */}
                <div className="flex flex-wrap gap-2">
                  {post.categories.slice(0, 3).map((cat, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-sm tracking-wider px-3 py-0.5 rounded-sm border border-[#A5A5A5] bg-white text-[#515151]"
                    >
                      {cat}
                    </span>
                  ))}

                  {post.categories.length > 3 && (
                    <span className="inline-flex items-center text-xs font-medium uppercase tracking-wider px-3 py-0.5 rounded-full border border-[#E6EEF9] bg-white text-[#6B7280] shadow-sm">
                      +{post.categories.length - 3}
                    </span>
                  )}
                </div>

                {/* Blog Title */}
                <h3 className="text-[#222] text-xl font-semibold hover:text-[#005DDC] transition-colors duration-300">
                  {post.title}
                </h3>

                {/* Meta Data */}
                <div className="flex items-center gap-2 text-xs text-[#757575]">
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                </div>

                {/* Description */}
                <p className="text-[#757575] text-sm">
                  {post.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}