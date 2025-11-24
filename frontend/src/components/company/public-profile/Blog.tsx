import React from 'react'
import { motion } from 'framer-motion';
import { Variants } from 'framer-motion';

const BlogSection = () => {

  const headingVariants: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const blogBoxVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const blogPosts = [
    {
      id: 1,
      image: "/images/post1.png",
      category: "Guide",
      title: "Everything EOR: A Guide to Employer of Record",
      author: "Sarah Johnson",
      date: "March 15, 2024",
      readTime: "5 min read",
      description: "Learn the essential tips and tricks to create a resume that stands out to employers and helps you land your dream job."
    },
    {
      id: 2,
      image: "/images/post2.png",
      category: "Guide",
      title: "The Business Case for Global Hiring",
      author: "Mike Chen",
      date: "March 12, 2024",
      readTime: "8 min read",
      description: "Prepare for your next job interview with these commonly asked questions and expert-approved answers."
    },
    {
      id: 3,
      image: "/images/post3.png",
      category: "Template",
      title: "Employer of Record RFP Template",
      author: "Emily Davis",
      date: "March 10, 2024",
      readTime: "6 min read",
      description: "Discover proven strategies to excel in remote work environments and maintain productivity while working from home."
    }
  ];

  return (
    <div className='w-full flex justify-center items-center bg-[#F8F9FA] pt-2 pb-8 sm:py-16'>
      <div className='lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col gap-12'>
        {/* Header Section */}
        <motion.div
          className='flex flex-col gap-5'
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.h2
            className='text-[#222] text-2xl lg:text-3xl xl:text-4xl font-semibold'
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Helpful resources to get you started
          </motion.h2>
          <motion.p
            className='text-[#757575] text-sm lg:text-base max-w-2xl'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            We’ve poured our expertise into a series of thoughtfully crafted, easy-to-follow guides and templates for businesses of all sizes.
          </motion.p>
        </motion.div>

        {/* Blog Posts Grid */}
        <div className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {blogPosts.map((post, index) => (
            <motion.div
              key={post.id}
              className='bg-[#000000DE] rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer'
              variants={blogBoxVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{
                y: -5,
                transition: { duration: 0.3 }
              }}
            >
              {/* Blog Image */}
              <div className='w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center'>
                <img src={post.image} alt={post.title} className='w-full h-full object-cover' />
              </div>

              {/* Blog Content */}
              <div className='p-6 flex flex-col gap-4'>
                {/* Blog Category */}
                <h3 className='text-sm sm:text-base text-[#FAF4EED9] uppercase font-semibold hover:text-[#005DDC] transition-colors duration-300'>
                  {post.category}
                </h3>

                {/* Blog Title */}
                <h3 className='text-white text-xl sm:text-2xl font-semibold hover:text-[#005DDC] transition-colors duration-300 sm:w-[275px]'>
                  {post.title}
                </h3>

                {/* Meta Data */}
                {/* <div className='flex items-center gap-4 text-xs text-[#757575]'>
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div> */}

                {/* Description */}
                {/* <p className='text-[#757575] text-sm line-clamp-3'>
                  {post.description}
                </p> */}

                {/* Read More Link */}
                <motion.a
                  href="#"
                  className='text-white text-xs sm:text-sm font-medium hover:underline inline-flex items-center gap-1'
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  Get the guide
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        {/* <motion.div
          className='text-center mt-16'
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <motion.button
            className='bg-[#005DDC] text-white font-semibold py-4 px-8 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer'
            whileHover={{
              scale: 1.05,
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className='bg-white bg-clip-text text-transparent'
              whileHover={{
                backgroundPosition: ["0% 50%", "100% 50%"]
              }}
              transition={{ duration: 0.5 }}
            >
              View All Posts  →
            </motion.span>
          </motion.button>
        </motion.div> */}
      </div>
    </div>
  )
}

export default BlogSection