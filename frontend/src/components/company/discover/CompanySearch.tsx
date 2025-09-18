"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { IoSearchOutline, IoLocationOutline } from "react-icons/io5";
import Select from "react-select";

interface LocationOption {
  value: string;
  label: string;
}
interface Props {
  locationOptions: LocationOption[];
  onSearch: (title: string, location: LocationOption | null) => void;
  customStyles?: any;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const CompanySearch: React.FC<Props> = ({ locationOptions, onSearch, customStyles }) => {
  const [jobTitle, setJobTitle] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(jobTitle, selectedLocation);
  };

  return (
    <motion.form
      onSubmit={handleSearch}
      className='w-full flex md:flex-row flex-col lg:justify-start xl:justify-between lg:items-start xl:items-center gap-3 md:gap-4 lg:gap-2 pt-2 lg:pt-2 xl:py-0 sm:mx-10 md:mx-0 mx-4'
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.2 }}
    >
      <div className='w-full lg:w-full flex lg:justify-start xl:justify-center items-center wrap bg-white rounded-lg px-3 py-2 shadow-md shadow-black-500/50'>
        <IoSearchOutline className='text-lg md:text-xl lg:text-xl xl:text-xl text-[#CBCBCB] flex-shrink-0' />
        <input
          type="text"
          placeholder='Search for jobs, companies, or keywords'
          className='w-full outline-none px-2 text-[#A5A5A5] text-sm'
          onChange={(e) => setJobTitle(e.target.value)}
        />
      </div>

      <div className='w-full lg:w-full bg-white flex xl:justify-start items-center rounded-lg px-3 py-0 shadow-md shadow-black-500/50'>
        <IoLocationOutline className='text-lg md:text-xl lg:text-xl xl:text-xl text-[#CBCBCB] flex-shrink-0 broder-none' />
        <Select
          options={locationOptions}
          placeholder="Location"
          onChange={(option) => setSelectedLocation(option as LocationOption)}
          isSearchable={true}
          className="w-full outline-none text-sm text-[#A5A5A5] border-0"
          styles={customStyles}
        />
      </div>




      <motion.div
        className='w-full lg:w-full xl:w-2/5 flex justify-center items-center bg-[#005DDC] px-3 py-2 hover:bg-[#0046B3] transition-colors duration-300 rounded-lg text-white cursor-pointer shadow-md shadow-[#004bb5]/50'
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button type='submit' className='flex justify-center items-center gap-2 text-white text-sm cursor-pointer'>
          <IoSearchOutline className='text-lg md:text-xl lg:text-xl xl:text-xl' />
          <p>Search</p>
        </button>
      </motion.div>
    </motion.form>
  );
};

export default CompanySearch;
