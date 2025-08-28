"use client";

import React from "react";
import { motion } from "framer-motion";

interface ButtonProps {
  text: string;
  onClick?: () => void;
  className?: string;
  variant?: 'dark' | 'light';
  animation?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  text, 
  onClick, 
  className = "", 
  variant = 'dark',
  animation = true
}) => {
  
  // Variant-based styles
  const getButtonStyles = () => {
    switch (variant) {
      case 'light':
        return {
          background: 'bg-white',
          text: 'text-[#005DDC] text-[10px] lg:text-sm',
          border: 'border-2 border-[#005DDC]',
          shadow: 'shadow-lg',
          hoverShadow: '0 20px 25px -5px rgb(0 93 220 / 0.1), 0 8px 10px -6px rgb(0 93 220 / 0.1)'
        };
      case 'dark':
      default:
        return {
          background: 'bg-[#005DDC]',
          text: 'text-white text-[10px] lg:text-sm',
          border: 'border-2 border-[#005DDC]',
          shadow: 'shadow-lg',
          hoverShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
        };
    }
  };

  const styles = getButtonStyles();

  // NO ANIMATION VERSION - Normal HTML
  if (!animation) {
    return (
      <div className={className}>
        <button
          onClick={onClick}
          className={`${styles.background} ${styles.text} ${styles.border} font-semibold py-1 px-1 lg:py-1.5 lg:px-3 rounded-sm lg:rounded-lg ${styles.shadow} hover:shadow-xl transition-shadow duration-300`}
        >
          <span className={variant === 'light' ? 'text-[#005DDC]' : 'text-white'}>
            {text}
          </span>
        </button>
      </div>
    );
  }

  // WITH ANIMATION VERSION - Framer Motion
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.8, duration: 0.6 }}
    >
      <motion.button
        onClick={onClick}
        className={`${styles.background} ${styles.text} ${styles.border} font-semibold py-0.5 px-1 lg:py-1.5 lg:px-3 rounded-lg ${styles.shadow} hover:shadow-xl transition-shadow duration-300`}
        whileHover={{
          scale: 1.05,
          boxShadow: styles.hoverShadow
        }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          className={variant === 'light' ? 'text-[#005DDC]' : 'text-white'}
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