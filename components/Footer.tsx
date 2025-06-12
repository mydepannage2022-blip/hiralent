'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Cpu, Mail, Phone, MapPin, Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  const socialLinks = [
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  const footerLinks = [
    {
      title: 'Services',
      links: [
        { name: '3D Visualization', href: '#' },
        { name: 'AR/VR Development', href: '#' },
        { name: 'Interactive Experiences', href: '#' },
        { name: 'Web Development', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Our Work', href: '#' },
        { name: 'Careers', href: '#' },
        { name: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Blog', href: '#' },
        { name: 'Case Studies', href: '#' },
        { name: 'Documentation', href: '#' },
        { name: 'Support', href: '#' },
      ],
    },
  ];

  return (
    <footer className="">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 mb-8 bg-transparent rounded-3xl backdrop-blur-md shadow-lg">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-6">
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                <Cpu className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold gradient-text">
                Talenta
              </span>
            </Link>
            
            <p className="text-white/90 mb-6 leading-relaxed font-light">
              Creating immersive digital experiences that blur the line between 
              imagination and reality.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-400">
                <Mail className="h-4 w-4 text-[#00F5DA]" />
                <span className="text-sm text-white/90 font-light">hello@altermind.studio</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Phone className="h-4 w-4 text-[#00F5DA]" />
                <span className="text-sm text-white/90 font-light">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <MapPin className="h-4 w-4 text-[#00F5DA]" />
                <span className="text-sm text-white/90 font-light">San Francisco, CA</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerLinks.map((section, index) => (
            <div key={index}>
              <h3 className="text-white font-semibold text-lg mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-white/90 hover:text-white transition-colors duration-200 text-sm font light"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-white/90 text-sm mb-4 md:mb-0 leading-relaxed font-light">
            © 2025 AlterMind Studio. All rights reserved.
          </div>

          {/* Social Links */}
          <div className="flex space-x-4">
            {socialLinks.map((social, index) => (
              <motion.a
                key={index}
                href={social.href}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg glass-effect hover:bg-[#00F5DA] transition-colors duration-200"
                aria-label={social.label}
              >
                <social.icon className="h-5 w-5 text-[#00F5DA] hover:text-black transition-colors duration-200" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;