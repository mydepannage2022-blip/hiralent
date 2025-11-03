"use client"
import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation';
import { IoSearchOutline } from "react-icons/io5";
import { IoIosNotificationsOutline, IoIosArrowDropright } from "react-icons/io";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import SmartLink from './SmartLink';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? '/';

  // Consider a user authenticated if we have a user object. Token may be cookie-only.
  const isLoggedIn = !!user;

  // ✅ get correct role switch link
  const getSwitchRoleLink = () => {
    if (pathname === "/" || pathname.startsWith("/candidate/home")) {
      return { label: "Employer", href: "/company/home" };
    }
    if (pathname.startsWith("/company/home")) {
      return { label: "Job Seeker", href: "/candidate/home" };
    }
    return null; // no link outside these pages
  };

  // Navigation items
  const navItems = [
    { href: '/', label: 'Home', activePattern: /^\/$/ },
    { href: '/candidate/findjob', label: 'Find job', activePattern: /^\/candidate\/findjob/ },
    { href: '/company/discover', label: 'Companies', activePattern: /^\/company/ },
    { href: '/auth/signup', label: 'Create CV', activePattern: /^\/auth\/signup/ },
  ];

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Active nav link
  const isActiveNavItem = (activePattern: RegExp) => activePattern.test(pathname);

  const NavLink = ({
    href,
    label,
    activePattern,
    className = '',
    onClick,
    isMobile = false
  }: {
    href: string;
    label: string;
    activePattern: RegExp;
    className?: string;
    onClick?: () => void;
    isMobile?: boolean;
  }) => {
    const isActive = isActiveNavItem(activePattern);
    return (
      <motion.li whileHover={{ scale: 1.05, color: "#005DDC" }} transition={{ duration: 0.2 }} className={isMobile ? 'block' : ''}>
        <SmartLink
          className={`text-sm transition-all duration-200 relative ${isActive ? 'text-[#005DDC] font-medium' : 'text-[#222] font-light hover:text-[#005DDC]'
            } ${className}`}
          href={href}
          onClick={onClick}
        >
          {label}
          {isActive && !isMobile && (
            <motion.div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#005DDC] rounded-full" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
          )}
          {isActive && isMobile && (
            <motion.div className="absolute left-0 top-0 bottom-0 w-1 bg-[#005DDC] rounded-r-full" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3 }} />
          )}
        </SmartLink>
      </motion.li>
    );
  };

  return (
    <motion.div
      className={`fixed top-0 w-full flex justify-center items-center z-50 transition-all duration-300 ${isScrolled ? 'bg-transparent' : 'bg-transparent'
        }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        className={`lg:max-w-5xl xl:max-w-7xl w-9/10 flex justify-between items-center my-4 rounded-lg px-4 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-sm shadow-md' : 'bg-white shadow-lg'
          }`}
        whileHover={{
          boxShadow: isScrolled
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo */}
        <div className='w-1/2 lg:w-1/8 xl:w-1/3 flex justify-start items-center'>
          <motion.img src="/images/logo.png" alt="Hiralent Ai Job Based Platform" className='w-24 py-3 object-contain' whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }} />
        </div>

        {/* Desktop Menu */}
        <div className='hidden lg:flex w-1/3 justify-center items-center'>
          <ul className='flex justify-around items-center gap-6'>
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} activePattern={item.activePattern} />
            ))}
          </ul>
        </div>

        {/* Desktop Right Section */}
        <div className='w-1/2 lg:w-1/3 flex justify-end items-center gap-2'>
          <div className='hidden lg:flex justify-center items-center gap-4 border-r-1 px-2 border-[#CBCBCB]'>
            <motion.div whileHover={{ scale: 1.2, color: "#005DDC" }} transition={{ duration: 0.2 }}>
              <IoSearchOutline className='text-[#222] cursor-pointer lg:text-xl hover:text-[#005DDC] transition-colors duration-200' />
            </motion.div>
            <motion.div whileHover={{ scale: 1.2, color: "#005DDC" }} transition={{ duration: 0.2 }}>
              <IoIosNotificationsOutline className='text-[#222] cursor-pointer lg:text-xl hover:text-[#005DDC] transition-colors duration-200' />
            </motion.div>

            {/* ✅ Employer / Job Seeker link */}
            {!isLoggedIn && getSwitchRoleLink() && (
              <motion.div whileHover={{ scale: 1.05, color: "#005DDC" }} transition={{ duration: 0.2 }}>
                <SmartLink
                  href={getSwitchRoleLink()!.href}
                  className={`font-light text-sm transition-colors duration-200 ${pathname.includes(getSwitchRoleLink()!.href) ? 'text-[#005DDC] font-medium' : 'text-[#222] hover:text-[#005DDC]'
                    }`}
                >
                  {getSwitchRoleLink()!.label}
                </SmartLink>
              </motion.div>
            )}
          </div>

          {/* Get Started / Dashboard */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
            {(() => {
              // determine dashboard href based on role (case-insensitive)
              const role = (user?.role || '').toString().toLowerCase();
              let dashboardHref = '/';
              if (isLoggedIn) {
                if (role === 'company' || role === 'company_admin') dashboardHref = '/company/dashboard';
                else if (role === 'candidate') dashboardHref = '/candidate/dashboard';
                else if (role === 'agency') dashboardHref = '/agency/dashboard';
                else dashboardHref = '/';
              }

              return (
                <SmartLink
                  href={isLoggedIn ? dashboardHref : "/auth/signup"}
                  className='flex justify-center items-center gap-1 bg-[#005DDC] text-white text-sm lg:text-sm px-2 py-2 rounded-lg hover:bg-[#0046B3] transition duration-300 shadow-md hover:shadow-lg'
                >
                  <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                    <IoIosArrowDropright className='text-white cursor-pointer lg:text-xl' />
                  </motion.div>
                  <span className='hidden lg:inline'>{isLoggedIn ? 'Dashboard' : 'Get Started'}</span>
                </SmartLink>
              );
            })()}
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.button onClick={toggleMenu} className='lg:hidden text-[#222] p-2' whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            {isMenuOpen ? <IoClose className='text-2xl' /> : <HiOutlineMenuAlt3 className='text-2xl' />}
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
            className={`lg:hidden absolute top-full left-0 right-0 shadow-lg rounded-b-lg mx-4 mt-2 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-sm' : 'bg-white'
              }`}
          >
            <div className='flex flex-col p-4 space-y-4'>
              {navItems.map((item, index) => (
                <motion.div key={item.href} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 * (index + 1) }} className="relative">
                  <NavLink href={item.href} label={item.label} activePattern={item.activePattern} className="block py-2 pl-4" onClick={() => setIsMenuOpen(false)} isMobile={true} />
                </motion.div>
              ))}

              {/* Mobile Icons Section */}
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className='flex items-center gap-4 py-2 border-t border-[#CBCBCB] pt-4'>
                <motion.div whileHover={{ scale: 1.2, color: "#005DDC" }} transition={{ duration: 0.2 }}>
                  <IoSearchOutline className='text-[#222] cursor-pointer text-xl hover:text-[#005DDC] transition-colors duration-200' />
                </motion.div>
                <motion.div whileHover={{ scale: 1.2, color: "#005DDC" }} transition={{ duration: 0.2 }}>
                  <IoIosNotificationsOutline className='text-[#222] cursor-pointer text-xl hover:text-[#005DDC] transition-colors duration-200' />
                </motion.div>

                {/* ✅ Employer / Job Seeker link (mobile) */}
                {!isLoggedIn && getSwitchRoleLink() && (
                  <motion.div whileHover={{ scale: 1.05, color: "#005DDC" }} transition={{ duration: 0.2 }}>
                    <SmartLink
                      href={getSwitchRoleLink()!.href}
                      className={`font-light transition-colors duration-200 ${pathname.includes(getSwitchRoleLink()!.href) ? 'text-[#005DDC] font-medium' : 'text-[#222] hover:text-[#005DDC]'
                        }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {getSwitchRoleLink()!.label}
                    </SmartLink>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Navbar;