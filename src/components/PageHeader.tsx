import { useMemo, ReactNode } from "react";
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

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export const PageHeader = ({ title, subtitle, action }: PageHeaderProps) => {
  const headerImage = useMemo(() => {
    return courseImages[Math.floor(Math.random() * courseImages.length)];
  }, []);

  return (
    <div className="relative h-64 overflow-hidden">
      <img
        src={headerImage}
        alt="Golf course"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="container mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-2 [text-shadow:_0_2px_10px_rgb(0_0_0_/_80%)]">
              {title}
            </h1>
            <p className="text-lg text-primary-foreground/90 [text-shadow:_0_2px_8px_rgb(0_0_0_/_70%)]">
              {subtitle}
            </p>
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
    </div>
  );
};
