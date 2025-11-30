import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, MapPin, Target } from "lucide-react";
import { toast } from "sonner";
import { CourseDialog } from "@/components/CourseDialog";
import { TeesDialog } from "@/components/TeesDialog";
import { HolesDialog } from "@/components/HolesDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import course1 from "@/assets/course-1.jpg";
import course2 from "@/assets/course-2.jpg";
import course3 from "@/assets/course-3.jpg";
import course4 from "@/assets/course-4.jpg";
import course5 from "@/assets/course-5.jpg";
import course6 from "@/assets/course-6.jpg";

const courseImages = [course1, course2, course3, course4, course5, course6];

export default function Courses() {
  const queryClient = useQueryClient();
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [teesDialogOpen, setTeesDialogOpen] = useState(false);
  const [holesDialogOpen, setHolesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; name: string } | null>(null);

  // Randomly select a course image on mount
  const headerImage = useMemo(() => {
    return courseImages[Math.floor(Math.random() * courseImages.length)];
  }, []);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_tees(*), course_holes(*)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted successfully");
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete course: " + error.message);
    },
  });

  const handleAddCourse = () => {
    setSelectedCourse(null);
    setCourseDialogOpen(true);
  };

  const handleEditCourse = (course: any) => {
    setSelectedCourse(course);
    setCourseDialogOpen(true);
  };

  const handleManageTees = (course: any) => {
    setSelectedCourse(course);
    setTeesDialogOpen(true);
  };

  const handleManageHoles = (course: any) => {
    setSelectedCourse(course);
    setHolesDialogOpen(true);
  };

  const handleDeleteClick = (course: any) => {
    setCourseToDelete({ id: course.id, name: course.name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (courseToDelete) {
      deleteMutation.mutate(courseToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p>Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-64 overflow-hidden">
        <img
          src={headerImage}
          alt="Golf course"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold text-primary-foreground mb-2">
                Golf Courses
              </h1>
              <p className="text-lg text-primary-foreground/90">
                Manage courses, tees, and hole configurations
              </p>
            </div>
            <Button onClick={handleAddCourse} size="lg" className="shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-6">

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{course.name}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEditCourse(course)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(course)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
              {course.phone && (
                <CardDescription className="text-sm">{course.phone}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {course.notes && (
                <p className="text-sm text-muted-foreground">{course.notes}</p>
              )}

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleManageTees(course)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Tees ({course.course_tees?.length || 0})
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleManageHoles(course)}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Manage Holes ({course.course_holes?.length || 0})
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!courses || courses.length === 0) && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No courses yet. Add your first course to get started.</p>
          </div>
        )}
      </div>
      </main>

      <CourseDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        course={selectedCourse}
      />

      {selectedCourse && (
        <>
          <TeesDialog
            open={teesDialogOpen}
            onOpenChange={setTeesDialogOpen}
            course={selectedCourse}
          />
          <HolesDialog
            open={holesDialogOpen}
            onOpenChange={setHolesDialogOpen}
            course={selectedCourse}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.name}"? This will also delete all associated tees and holes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
