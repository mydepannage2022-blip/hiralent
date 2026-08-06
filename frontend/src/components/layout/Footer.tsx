"use client";

import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";
import { IoMailOutline, IoCallOutline } from "react-icons/io5";

const Footer = () => {
  return (
    <footer className="relative w-full flex justify-center items-center bg-white overflow-hidden">
      {/* Subtle background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#F7FBFF] to-transparent" />
        <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-[#005DDC] opacity-[0.035] blur-3xl" />
        <div className="absolute -bottom-36 -right-28 h-80 w-80 rounded-full bg-[#005DDC] opacity-[0.025] blur-3xl" />
      </div>

      <div className="relative lg:max-w-5xl xl:max-w-7xl w-9/10 flex flex-col justify-between items-center py-12 lg:py-16">
        {/* Top grid */}
        <div className="w-full flex flex-col lg:flex-row justify-between items-start gap-10">
          {/* Brand */}
          <div className="w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4">
            <Link href="/" className="inline-flex items-center">
              <img
                src="/images/logo.png"
                alt="Logo"
                className="w-32 h-auto"
                draggable={false}
              />
            </Link>

            <p className="text-xs lg:text-sm text-center lg:text-left text-[#64748B] leading-relaxed">
              Hiralent is a smart job search and recruitment platform that
              connects job seekers with employers. With fast search,
              professional resume building, and intelligent matching,
              Hiralent makes hiring and job hunting easy and efficient.
            </p>

            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#94A3B8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#005DDC]" />
              Verified signals • Clean workflows
            </div>

            <div className="h-px w-full bg-[#E6ECF8] lg:hidden mt-2" />
          </div>

          {/* Services */}
          <div className="w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4">
            <h3 className="font-bold text-base tracking-tight text-[#0b1b3a]">
              Our Services
            </h3>

            <div className="flex flex-col gap-2">
              <FooterLink href="/job/jobsearch">Find job</FooterLink>
              <FooterLink href="/company/discover">Search company</FooterLink>
              <FooterLink href="/company/pricing">Pricing Plan</FooterLink>
              <FooterLink href="/footer/about">About us</FooterLink>
            </div>

            <div className="h-px w-full bg-[#E6ECF8] lg:hidden mt-2" />
          </div>

          {/* Links */}
          <div className="w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4">
            <h3 className="font-bold text-base tracking-tight text-[#0b1b3a]">
              Links
            </h3>

            <div className="flex flex-col gap-2">
              <FooterLink href="/footer/blog">Blog</FooterLink>
              <FooterLink href="/footer/helpcenter">Help Center</FooterLink>
              <FooterLink href="/footer/contact">Contact us</FooterLink>
              <FooterLink href="/footer/privacypolicy">Privacy Policy</FooterLink>
            </div>

            <div className="h-px w-full bg-[#E6ECF8] lg:hidden mt-2" />
          </div>

          {/* Contact */}
          <div className="w-full lg:w-1/4 flex flex-col justify-center items-center lg:items-start gap-4">
            <h3 className="font-bold text-base tracking-tight text-[#0b1b3a]">
              Contact Us
            </h3>

            {/* Social icons */}
            <div className="flex justify-center lg:justify-start gap-3 lg:gap-4">
              <SocialIcon src="/images/instgram.png" alt="Instagram" />
              <SocialIcon src="/images/facebook.png" alt="Facebook" />
              <SocialIcon src="/images/x.png" alt="Twitter" />
              <SocialIcon src="/images/linkedin.ico" alt="LinkedIn" />
            </div>

            {/* Contact info */}
            <div className="flex flex-col gap-3 text-xs lg:text-sm text-[#64748B]">
              <a
                href="mailto:Contact@hiralent.com"
                className="group flex items-start gap-3 hover:text-[#0b1b3a] transition-colors"
              >
                <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-[#F7FBFF] text-[#005DDC] shadow-[0_12px_28px_-24px_rgba(2,8,23,0.35)]">
                  <IoMailOutline className="text-lg" />
                </span>
                <p className="break-all">Contact@hiralent.com</p>
              </a>

              <a
                href="tel:+212754505060"
                className="group flex items-start gap-3 hover:text-[#0b1b3a] transition-colors"
              >
                <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-[#F7FBFF] text-[#005DDC] shadow-[0_12px_28px_-24px_rgba(2,8,23,0.35)]">
                  <IoCallOutline className="text-lg" />
                </span>
                <p>+212 754 505 060</p>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="w-full pt-10 lg:pt-14">
          <div className="h-px w-full bg-[#E6ECF8]" />
          <div className="w-full flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-3 pt-6">
            <p className="text-xs lg:text-sm text-[#64748B]">
              © 2025 Hiralent. All rights reserved.
            </p>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-[#94A3B8]">
              <Link href="/footer/privacypolicy" className="hover:text-[#0b1b3a] transition">
                Privacy
              </Link>
              <span className="h-1 w-1 rounded-full bg-[#CBD5E1]" />
              <Link href="/footer/helpcenter" className="hover:text-[#0b1b3a] transition">
                Support
              </Link>
              <span className="h-1 w-1 rounded-full bg-[#CBD5E1]" />
              <Link href="/footer/contact" className="hover:text-[#0b1b3a] transition">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

/* ======================= */

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-xs lg:text-sm text-[#64748B] hover:text-[#0b1b3a] transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1] group-hover:bg-[#005DDC] transition" />
      {children}
    </Link>
  );
}

function SocialIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <motion.a
      href="#"
      aria-label={alt}
      className="relative group grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-[0_18px_50px_-44px_rgba(2,8,23,0.55)] backdrop-blur"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#005DDC]/[0.10] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
      <img
        className="relative h-5 w-5 object-contain opacity-80 group-hover:opacity-100 transition"
        src={src}
        alt={alt}
        draggable={false}
      />
    </motion.a>
  );
}
