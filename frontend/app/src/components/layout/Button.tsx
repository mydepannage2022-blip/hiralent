"use client";

import React from "react";
import { motion } from "framer-motion";

interface ButtonProps {
  text: string;
  onClick?: () => void;
  className?: string; // optional extra classes
}

const Button: React.FC<ButtonProps> = ({ text, onClick, className = "" }) => {
  return (
    <motion.div
      className={`text-center mt-16 ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.8, duration: 0.6 }}
    >
      <motion.button
        onClick={onClick}
        className='bg-[#005DDC] text-white font-semibold py-4 px-8 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300'
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
          {text}
        </motion.span>
      </motion.button>
    </motion.div>
  );
};

export default Button;
