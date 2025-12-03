import { useState, useEffect, useCallback, useRef } from "react";
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
const TRANSITION_DURATION = 1500; // 1.5s crossfade

export const KenBurnsBackground = () => {
  // Use two alternating layers to avoid animation restart jitter
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0);
  const [layer0Index, setLayer0Index] = useState(() => 
    Math.floor(Math.random() * courseImages.length)
  );
  const [layer1Index, setLayer1Index] = useState(() => {
    let idx = Math.floor(Math.random() * courseImages.length);
    while (idx === layer0Index && courseImages.length > 1) {
      idx = Math.floor(Math.random() * courseImages.length);
    }
    return idx;
  });
  const [animationKey0, setAnimationKey0] = useState(0);
  const [animationKey1, setAnimationKey1] = useState(0);

  const getNextRandomIndex = useCallback((current: number) => {
    let next = Math.floor(Math.random() * courseImages.length);
    while (next === current && courseImages.length > 1) {
      next = Math.floor(Math.random() * courseImages.length);
    }
    return next;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (activeLayer === 0) {
        // Layer 0 is visible, prepare layer 1 with new image and switch to it
        const nextIdx = getNextRandomIndex(layer0Index);
        setLayer1Index(nextIdx);
        setAnimationKey1(prev => prev + 1);
        setActiveLayer(1);
      } else {
        // Layer 1 is visible, prepare layer 0 with new image and switch to it
        const nextIdx = getNextRandomIndex(layer1Index);
        setLayer0Index(nextIdx);
        setAnimationKey0(prev => prev + 1);
        setActiveLayer(0);
      }
    }, ZOOM_DURATION);

    return () => clearInterval(timer);
  }, [activeLayer, layer0Index, layer1Index, getNextRandomIndex]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Layer 0 */}
      <div
        className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
          activeLayer === 0 ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      >
        <img
          key={`layer0-${animationKey0}`}
          src={courseImages[layer0Index]}
          alt="Golf course background"
          className="w-full h-full object-cover animate-ken-burns"
        />
      </div>

      {/* Layer 1 */}
      <div
        className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
          activeLayer === 1 ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      >
        <img
          key={`layer1-${animationKey1}`}
          src={courseImages[layer1Index]}
          alt="Golf course background"
          className="w-full h-full object-cover animate-ken-burns"
        />
      </div>

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-20" />
    </div>
  );
};