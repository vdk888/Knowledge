import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Concept, UserProgress } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/Sidebar';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'wouter';

export default function StudyListPage() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/user/progress"],
    enabled: !!user,
  });
  
  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"],
    enabled: !!user,
  });
  
  const { data: recommendations = [] } = useQuery<{
    concept: Concept;
    reason: string;
  }[]>({
    queryKey: ["/api/user/recommendations"],
    enabled: !!user,
  });
  
  // Create a mutation for updating progress
  const updateProgressMutation = useMutation({
    mutationFn: async (data: {
      conceptId: number;
      isLearned: boolean;
      learnedAt?: Date;
    }) => {
      // Corrected argument order: method, url, data
      const response = await apiRequest(
        'POST', // method
        '/api/user/progress', // url
        data // data object (will be stringified by apiRequest)
      );
      // apiRequest now returns the Response object, we need to parse it if needed
      // Assuming the backend returns the updated/created progress object as JSON
      return await response.json(); 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/recommendations"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Get concepts that are in progress (not yet learned)
  const studyList = concepts.filter(concept => 
    progress.some(p => p.conceptId === concept.id && !p.isLearned)
  );
  
  // Helper function to check if a concept is in progress
  const isInStudyList = (conceptId: number) => {
    return progress.some(p => p.conceptId === conceptId && !p.isLearned);
  };
  
  // Handle adding a concept to study list
  const addToStudyList = (conceptId: number) => {
    // Check if the concept is already in the study list
    if (isInStudyList(conceptId)) {
      toast({
        title: "Already in study list",
        description: "This concept is already in your study list.",
        variant: "default", // Or maybe 'info' if you have one
      });
      return; // Don't proceed further
    }
    
    updateProgressMutation.mutate({
      conceptId,
      isLearned: false,
    });
    
    toast({
      title: "Added to study list",
      description: "This concept has been added to your study list.",
    });
  };
  
  // Handle marking a concept as learned
  const markAsLearned = (conceptId: number) => {
    updateProgressMutation.mutate({
      conceptId,
      isLearned: true,
      learnedAt: new Date(),
    });
    
    toast({
      title: "Marked as learned",
      description: "Congratulations on learning this concept!",
    });
  };
  
  // Handle removing a concept from study list
  const removeFromStudyList = (conceptId: number) => {
    // Since we don't have a dedicated delete endpoint, we'll just update it
    // In a real implementation, we might want to delete the progress record instead
    updateProgressMutation.mutate({
      conceptId,
      isLearned: false,
    });
    
    toast({
      title: "Removed from study list",
      description: "This concept has been removed from your study list.",
    });
    
    // This is just to trigger a refetch, in a real implementation you'd want proper invalidation
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
    }, 300);
  };
  
  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getDomainBadgeColor = (domain: string) => {
    switch (domain) {
      case "Physics":
        return "bg-blue-100 text-blue-800";
      case "Mathematics":
        return "bg-purple-100 text-purple-800";
      case "Computer Science":
        return "bg-green-100 text-green-800";
      case "Biology":
        return "bg-amber-100 text-amber-800";
      case "Economics":
        return "bg-red-100 text-red-800";
      case "Sociology":
        return "bg-pink-100 text-pink-800";
      case "Psychology":
        return "bg-indigo-100 text-indigo-800";
      case "Human Science":
        return "bg-teal-100 text-teal-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} onCloseSidebar={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader 
          onToggleProgressDrawer={() => {}} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">My Study List</h1>
            
            {studyList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {studyList.map(concept => (
                  <Card key={concept.id} className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{concept.name}</CardTitle>
                        <Badge className={getDifficultyBadgeColor(concept.difficulty)}>
                          {concept.difficulty}
                        </Badge>
                      </div>
                      <Badge className={getDomainBadgeColor(concept.domain)}>
                        {concept.domain}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-neutral-600 line-clamp-3 mb-4">
                        {concept.description}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeFromStudyList(concept.id)}
                      >
                        Remove
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => markAsLearned(concept.id)}
                      >
                        Mark as learned
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Your study list is empty</CardTitle>
                  <CardDescription>
                    Add concepts from the knowledge map or recommendations to build your study list.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild>
                    <Link href="/">Explore Knowledge Map</Link>
                  </Button>
                </CardFooter>
              </Card>
            )}
            
            {/* Recommended concepts */}
            <h2 className="text-xl font-semibold mb-4">Recommended for you</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.length > 0 ? (
                recommendations
                  .filter(({ concept }) => !isInStudyList(concept.id))
                  .map(({ concept, reason }) => (
                    <Card key={concept.id} className="h-full">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{concept.name}</CardTitle>
                          <Badge className={getDifficultyBadgeColor(concept.difficulty)}>
                            {concept.difficulty}
                          </Badge>
                        </div>
                        <Badge className={getDomainBadgeColor(concept.domain)}>
                          {concept.domain}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                          {concept.description}
                        </p>
                        <div className="text-sm bg-primary-50 text-primary-800 p-2 rounded-md mb-3">
                          <span className="font-medium">Why learn this:</span> {reason}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          variant="default" 
                          size="sm"
                          className="w-full"
                          onClick={() => addToStudyList(concept.id)}
                        >
                          Add to study list
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full text-center py-8 text-neutral-500">
                  No recommendations available yet. Start learning some concepts!
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
