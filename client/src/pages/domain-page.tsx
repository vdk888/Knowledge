import { useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Concept, UserProgress } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/Sidebar';
import AppHeader from '@/components/AppHeader';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useIsMobile } from '@/hooks/use-mobile';

export default function DomainPage() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract domain from URL
  const [, params] = useRoute('/domain/:domain');
  const domain = params?.domain ? decodeURIComponent(params.domain) : '';
  
  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts/domain", domain],
    queryFn: async () => {
      if (!domain) return [];
      const response = await apiRequest<Concept[]>(`/api/concepts/domain/${encodeURIComponent(domain)}`);
      return response;
    },
    enabled: !!domain && !!user,
  });
  
  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/user/progress"],
    enabled: !!user,
  });
  
  // Create a mutation for updating progress
  const updateProgressMutation = useMutation({
    mutationFn: async (data: {
      conceptId: number;
      isLearned: boolean;
      learnedAt?: Date;
    }) => {
      const response = await apiRequest('/api/user/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response;
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
  
  // Helper function to check if a concept is learned
  const isLearned = (conceptId: number) => {
    return progress.some(p => p.conceptId === conceptId && p.isLearned);
  };
  
  // Helper function to check if a concept is in progress
  const isInProgress = (conceptId: number) => {
    return progress.some(p => p.conceptId === conceptId && !p.isLearned);
  };
  
  // Handle adding a concept to study list
  const addToStudyList = (conceptId: number) => {
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
  
  const getDifficultyOrder = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return 1;
      case "intermediate": return 2;
      case "advanced": return 3;
      default: return 4;
    }
  };
  
  // Sort concepts by difficulty
  const sortedConcepts = [...concepts].sort((a, b) => 
    getDifficultyOrder(a.difficulty) - getDifficultyOrder(b.difficulty)
  );
  
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
          currentDomain={domain}
          onToggleProgressDrawer={() => {}} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center mb-6">
              <Badge className={getDomainBadgeColor(domain) + " mr-3 py-1.5 px-3 text-base"}>
                {domain}
              </Badge>
              <h1 className="text-2xl font-bold">Concepts</h1>
            </div>
            
            {sortedConcepts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedConcepts.map(concept => {
                  const learned = isLearned(concept.id);
                  const inProgress = isInProgress(concept.id);
                  
                  return (
                    <Card key={concept.id} className={`h-full ${learned ? 'border-green-200' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{concept.name}</CardTitle>
                          <Badge className={getDifficultyBadgeColor(concept.difficulty)}>
                            {concept.difficulty}
                          </Badge>
                        </div>
                        {learned && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Learned
                          </Badge>
                        )}
                        {inProgress && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            In Progress
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-neutral-600 line-clamp-3">
                          {concept.description}
                        </p>
                      </CardContent>
                      <CardFooter className="flex gap-2 pt-0">
                        {!learned && !inProgress && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => addToStudyList(concept.id)}
                          >
                            Add to study list
                          </Button>
                        )}
                        
                        {!learned && (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="flex-1"
                            onClick={() => markAsLearned(concept.id)}
                          >
                            Mark as learned
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <p className="text-neutral-500">No concepts found for this domain.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}