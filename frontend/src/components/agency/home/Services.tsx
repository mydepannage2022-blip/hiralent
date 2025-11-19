import React from "react";
import { motion } from "framer-motion";
import { HiOutlineDocumentText, HiOutlineHome, HiOutlineUserGroup } from "react-icons/hi";

const Services = () => {
  const services = [
    {
      title: "Visa Processing",
      description: "Handle immigration paperwork, embassy processes, and work permit applications for candidates.",
      icon: HiOutlineDocumentText,
    },
    {
      title: "Relocation Services",
      description: "Manage housing search, utilities setup, travel logistics, and moving coordination.",
      icon: HiOutlineHome,
    },
    {
      title: "Integration Support",
      description: "Assist with banking, healthcare registration, telecom setup, and cultural orientation.",
      icon: HiOutlineUserGroup,
    },
  ];

  return (
    <div className="w-full flex justify-center items-center bg-white py-16 lg:py-24">
      <div className="lg:max-w-5xl xl:max-w-7xl w-9/10">
        
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-[#222] text-3xl lg:text-4xl xl:text-5xl font-bold mb-4">
            Services We Need
          </h2>
          <p className="text-[#757575] text-base lg:text-lg max-w-2xl mx-auto">
            We're looking for specialized agencies in these areas
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <motion.div
                key={index}
                className="border-2 border-[#E5E7EB] rounded-xl p-6 lg:p-8 hover:border-[#005DDC] hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                whileHover={{ y: -8 }}
              >
                {/* Icon */}
                <motion.div
                  className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <IconComponent className="text-[#005DDC] text-4xl lg:text-5xl" />
                </motion.div>

                {/* Title */}
                <h3 className="text-[#222] text-xl lg:text-2xl font-semibold mb-3">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-[#757575] text-sm lg:text-base">
                  {service.description}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Services;