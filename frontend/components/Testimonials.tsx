import React, { useRef, useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { ChevronRight, ChevronLeft, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { NavigationOptions } from "swiper/types";

const Testimonials = () => {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [navigationReady, setNavigationReady] = useState(false);

 const testimonials = [
  {
    name: "John Anderson",
    profession: "Marketing Director",
    text: "I was genuinely impressed with the professionalism and the speed of service. Highly recommended!",
    rating: 5,
    image:
      "https://www.dia-m.ru/upload/medialibrary/105/fo17oinkvc8cqpm4tnjacb649hdoju80/Chief-Executive-Officer_-Mike-Roman.jpg",
  },
  {
    name: "Huzaifa Iqbal",
    profession: "Full Stack Developer",
    text: "Their dedication and attention to detail made a huge difference for my business. I’ll definitely be coming back!",
    rating: 4,
    image:
      "https://www.dia-m.ru/upload/medialibrary/105/fo17oinkvc8cqpm4tnjacb649hdoju80/Chief-Executive-Officer_-Mike-Roman.jpg",
  },
  {
    name: "Sarah Malik",
    profession: "Product Manager",
    text: "Exceptional service and a team that truly cares about customer satisfaction. Five stars from me!",
    rating: 5,
    image:
      "https://www.dia-m.ru/upload/medialibrary/105/fo17oinkvc8cqpm4tnjacb649hdoju80/Chief-Executive-Officer_-Mike-Roman.jpg",
  },
  {
    name: "Omar Farooq",
    profession: "Startup Founder",
    text: "From start to finish, the entire process was smooth and stress-free. Great communication too!",
    rating: 4,
    image:
      "https://www.dia-m.ru/upload/medialibrary/105/fo17oinkvc8cqpm4tnjacb649hdoju80/Chief-Executive-Officer_-Mike-Roman.jpg",
  },
  {
    name: "Ayesha Khan",
    profession: "Creative Designer",
    text: "One of the best experiences I’ve had working with a team online. Quick, efficient, and friendly!",
    rating: 5,
    image:
      "https://www.dia-m.ru/upload/medialibrary/105/fo17oinkvc8cqpm4tnjacb649hdoju80/Chief-Executive-Officer_-Mike-Roman.jpg",
  },
];


  useEffect(() => {
    setNavigationReady(true); // Trigger Swiper render after refs are set
  }, []);

  return (
    <div className="w-full flex justify-center items-center bg-transparent py-12 lg:pb-[150px]">
      <div className="w-full lg:max-w-4xl xl:max-w-7xl px-4 flex flex-col lg:flex-row justify-between items-center gap-10">
        {/* Left content */}
        <div className="flex flex-col items-center lg:items-start gap-6 w-full lg:w-1/2 text-center lg:text-left">
          <h1 className="text-2xl lg:text-5xl gradient-text dark:text-white font-bold">
            What our <span className="dark:text-[#00F5DA]">Client says</span>
          </h1>
          <p className="text-sm lg:text-base font-light">
            Hear directly from our happy clients — their words reflect our
            commitment to quality, trust, and excellence.
          </p>

          {/* Navigation Buttons */}
          <div className="flex jusitfy-center items-center gap-5 mt-4 hidden lg:block">
            <button
              ref={prevRef}
              className="bg-[#28196A] dark:bg-gradient-to-r from-[#00F5DA] to-[#28196A] text-white px-4 py-2 rounded dark:hover:bg-[#00dbc0] transition"
            >
              <ChevronLeft />
            </button>
            <button
              ref={nextRef}
              className="bg-[#28196A] dark:bg-gradient-to-r from-[#28196A] to-[#00F5DA] text-white px-4 py-2 rounded dark:hover:bg-[#00dbc0] transition"
            >
              <ChevronRight />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-[#28196A]  dark:bg-gradient-to-r from-[#00F5DA] to-[#28196A] rounded-full font-semibold text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-300 "
          >
            Begin Your Free Trial
          </motion.button>
        </div>

        {/* Swiper Right Side */}
        <div className="w-full lg:w-1/2">
          {navigationReady && (
            <Swiper
              modules={[Navigation, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              navigation={{
                prevEl: prevRef.current,
                nextEl: nextRef.current,
              }}
              loop={true}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              onBeforeInit={(swiper) => {
                const navigation = swiper.params
                  .navigation as NavigationOptions;
                navigation.prevEl = prevRef.current;
                navigation.nextEl = nextRef.current;
              }}
            >
              {testimonials.map((testimonial, index) => (
                <SwiperSlide key={index}>
                  <div className="bg-white/70 dark:bg-white/90 shadow-md rounded-xl p-6 text-center hover:shadow-lg transition-shadow duration-300 w-4/5 mx-auto ring-1 ring-white/10 shadow-lg backdrop-blur-sm cursor-move">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-20 h-20 mx-auto rounded-full object-cover mb-4"
                    />
                    <h3 className="text-[#2C2F38] italic py-1">"{testimonial.profession}"</h3>
                    <p className="text-[#2C2F38] italic py-1">"{testimonial.text}"</p>

                    {/* Star Rating */}
                    <div className="flex justify-center mt-2 mb-1 text-yellow-500 py-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          fill={i < testimonial.rating ? "#facc15" : "none"}
                        />
                      ))}
                    </div>

                    <h3 className="mt-2 font-semibold text-lg text-gray-900">
                      {testimonial.name}
                    </h3>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            
          )}
          <div className="flex gap-4 mt-4 sm:block lg:hidden">
            <button
              ref={prevRef}
              className="bg-[#28196A] dark:bg-gradient-to-r from-[#00F5DA] to-[#28196A] text-white px-4 py-2 rounded dark:hover:bg-[#00dbc0] transition"
            >
              <ChevronLeft />
            </button>
            <button
              ref={nextRef}
              className="bg-[#28196A] dark:bg-gradient-to-r from-[#28196A] to-[#00F5DA] text-white px-4 py-2 rounded dark:hover:bg-[#00dbc0] transition"
            >
              <ChevronRight />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Testimonials;
