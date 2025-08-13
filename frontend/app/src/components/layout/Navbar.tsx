import React, { useState, useEffect } from 'react'
import { IoSearchOutline } from "react-icons/io5";
import { IoIosNotificationsOutline } from "react-icons/io";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { IoIosArrowDropright } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import SmartLink from './SmartLink';
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, token } = useAuth();

  const isLoggedIn = user && token;
  console.log(
  'is logged in ' , user, token
  )
  // Scroll effect handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <motion.div 
      className={`fixed top-0 w-full flex justify-center items-center z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-transparent' 
          : 'bg-transparent'
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div 
        className={`lg:max-w-5xl xl:max-w-7xl w-9/10 flex justify-between items-center my-4 rounded-lg px-4 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/90 backdrop-blur-sm shadow-md' 
            : 'bg-white shadow-lg'
        }`}
        whileHover={{ 
          boxShadow: isScrolled 
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        transition={{ duration: 0.3 }}

      >

        <div className='w-1/2 lg:w-1/8 xl:w-1/3 flex justify-start items-center'>
          <motion.img 
            src="/images/logo.png" 
            alt="Hiralent Ai Job Based Platform" 
            className='w-24 py-3 object-contain'
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Desktop Menu */}
        <div className='hidden lg:flex w-1/3 justify-center items-center'>
          <ul className='flex justify-around items-center gap-6 text-[#222] font-light'>
            <motion.li
              whileHover={{ scale: 1.05, color: "#005DDC" }}
              transition={{ duration: 0.2 }}
            >
              <SmartLink className='text-sm hover:text-[#005DDC] transition-colors duration-200' href="/">Home</SmartLink>
            </motion.li>
            <motion.li
              whileHover={{ scale: 1.05, color: "#005DDC" }}
              transition={{ duration: 0.2 }}
            >
              <SmartLink className='text-sm hover:text-[#005DDC] transition-colors duration-200' href="/candidate/findjob">Find job</SmartLink>
            </motion.li>
            <motion.li
              whileHover={{ scale: 1.05, color: "#005DDC" }}
              transition={{ duration: 0.2 }}
            >
              <SmartLink className='text-sm hover:text-[#005DDC] transition-colors duration-200' href="/candidate/company">Company</SmartLink>
            </motion.li>
            <motion.li
              whileHover={{ scale: 1.05, color: "#005DDC" }}
              transition={{ duration: 0.2 }}
            >
              <SmartLink className='text-sm hover:text-[#005DDC] transition-colors duration-200' href="/auth/signup">Create CV</SmartLink>
            </motion.li>
          </ul>
        </div>

        {/* Desktop Right Section */}
        <div className='w-1/2 lg:w-1/3 flex justify-end items-center gap-2'>
          <div className='hidden lg:flex justify-center items-center gap-4 border-r-1 px-2 border-[#CBCBCB]'>
            <motion.div
              whileHover={{ scale: 1.2, color: "#005DDC" }}
              transition={{ duration: 0.2 }}
            >
              <IoSearchOutline className='text-[#222] cursor-pointer lg:text-xl hover:text-[#005DDC] transition-colors duration-200' />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.2, color: "#005DDC" }}
              transition={{ duration: 0.2 }}
            >
              <IoIosNotificationsOutline className='text-[#222] cursor-pointer lg:text-xl hover:text-[#005DDC] transition-colors duration-200' />
            </motion.div>
            {!isLoggedIn && (
              <motion.div
                whileHover={{ scale: 1.05, color: "#005DDC" }}
                transition={{ duration: 0.2 }}
              >
                <SmartLink href="/auth/companyRegister" className='text-[#222] font-light text-sm hover:text-[#005DDC] transition-colors duration-200'>as company</SmartLink>
              </motion.div>
            )}
          </div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <SmartLink href={isLoggedIn ? "/candidate/dashboard" : "/auth/signup"} className='flex justify-center items-center gap-1 bg-[#005DDC] text-white text-sm lg:text-sm px-2 py-2 rounded-lg hover:bg-[#0046B3] transition duration-300 shadow-md hover:shadow-lg'>
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <IoIosArrowDropright className='text-white cursor-pointer lg:text-xl' />
              </motion.div>
              <span className='hidden lg:inline'>{isLoggedIn ? 'Dashboard' : 'Get Started'}</span>
            </SmartLink>
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={toggleMenu}
            className='lg:hidden text-[#222] p-2'
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMenuOpen ? (
              <IoClose className='text-2xl' />
            ) : (
              <HiOutlineMenuAlt3 className='text-2xl' />
            )}
          </motion.button>
        </div>

      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`lg:hidden absolute top-full left-0 right-0 shadow-lg rounded-b-lg mx-4 mt-2 z-50 transition-all duration-300 ${
              isScrolled 
                ? 'bg-white/90 backdrop-blur-sm' 
                : 'bg-white'
            }`}
          >
            <div className='flex flex-col p-4 space-y-4'>
              {/* Mobile Menu Items */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <SmartLink
                  href="/candidate/home"
                  className='block text-[#222] font-light py-2 hover:text-[#005DDC] transition duration-200'
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </SmartLink>
              </motion.div>
              
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <SmartLink
                  href="/candidate/findjob"
                  className='block text-[#222] font-light py-2 hover:text-[#005DDC] transition duration-200'
                  onClick={() => setIsMenuOpen(false)}
                >
                  Find job
                </SmartLink>
              </motion.div>
              
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <SmartLink
                  href="/candidate/company"
                  className='block text-[#222] font-light py-2 hover:text-[#005DDC] transition duration-200'
                  onClick={() => setIsMenuOpen(false)}
                >
                  Company
                </SmartLink>
              </motion.div>
              
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <SmartLink
                  href="/auth/signup"
                  className='block text-[#222] font-light py-2 hover:text-[#005DDC] transition duration-200'
                  onClick={() => setIsMenuOpen(false)}
                >
                  Create CV
                </SmartLink>
              </motion.div>

              {/* Mobile Icons Section */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className='flex items-center gap-4 py-2 border-t border-[#CBCBCB] pt-4'
              >
                <motion.div
                  whileHover={{ scale: 1.2, color: "#005DDC" }}
                  transition={{ duration: 0.2 }}
                >
                  <IoSearchOutline className='text-[#222] cursor-pointer text-xl hover:text-[#005DDC] transition-colors duration-200' />
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.2, color: "#005DDC" }}
                  transition={{ duration: 0.2 }}
                >
                  <IoIosNotificationsOutline className='text-[#222] cursor-pointer text-xl hover:text-[#005DDC] transition-colors duration-200' />
                </motion.div>
                {!isLoggedIn && (
                  <motion.div
                    whileHover={{ scale: 1.05, color: "#005DDC" }}
                    transition={{ duration: 0.2 }}
                  >
                    <SmartLink
                      href="/auth/companyRegister"
                      className='text-[#222] font-light hover:text-[#005DDC] transition-colors duration-200'
                      onClick={() => setIsMenuOpen(false)}
                    >
                      as company
                    </SmartLink>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default Navbar