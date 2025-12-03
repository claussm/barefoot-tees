import { useState, useEffect, useCallback } from "react";
import course1 from "@/assets/course-1.jpg";
import course2 from "@/assets/course-2.jpg";
import course3 from "@/assets/course-3.jpg";
import course4 from "@/assets/course-4.jpg";
import course5 from "@/assets/course-5.jpg";
import course6 from "@/assets/course-6.jpg";
import course7 from "@/assets/course-7.jpg";
import course8 from "@/assets/course-8.jpg";
import course9 from "@/assets/course-9.jpg";

const courseImages = [course1, course2, course3, course4, course5, course6, course7, course8, course9];

const ZOOM_DURATION = 12000; // 12 seconds per image
const MAX_SCALE = 1.25; // Zoom to 125%
const TRANSITION_DURATION = 1500; // 1.5s crossfade

export const KenBurnsBackground = () => {
  const [currentIndex, setCurrentIndex] = useState(() => 
    Math.floor(Math.random() * courseImages.length)
  );
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const getNextRandomIndex = useCallback((current: number) => {
    let next = Math.floor(Math.random() * courseImages.length);
    // Ensure we don't show the same image twice in a row
    while (next === current && courseImages.length > 1) {
      next = Math.floor(Math.random() * courseImages.length);
    }
    return next;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = getNextRandomIndex(currentIndex);
      setNextIndex(next);
      setIsTransitioning(true);

      // After transition completes, update current and reset
      setTimeout(() => {
        setCurrentIndex(next);
        setNextIndex(null);
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    }, ZOOM_DURATION);

    return () => clearInterval(timer);
  }, [currentIndex, getNextRandomIndex]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Current image with Ken Burns zoom */}
      <div
        className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <img
          key={`current-${currentIndex}`}
          src={courseImages[currentIndex]}
          alt="Golf course background"
          className="w-full h-full object-cover animate-ken-burns"
        />
      </div>

      {/* Next image fading in */}
      {nextIndex !== null && (
        <div
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            isTransitioning ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            key={`next-${nextIndex}`}
            src={courseImages[nextIndex]}
            alt="Golf course background"
            className="w-full h-full object-cover animate-ken-burns"
          />
        </div>
      )}

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
};