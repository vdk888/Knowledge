import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Concept, UserProgress } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/Sidebar';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ProgressPage() {
  const { user } = useAuth();
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  
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
  
  // Calculate progress metrics
  useEffect(() => {
    if (concepts.length > 0) {
      const learnedCount = progress.filter(p => p.isLearned).length;
      const totalConcepts = concepts.length;
      setCompletionPercentage(Math.round((learnedCount / totalConcepts) * 100));
    }
  }, [progress, concepts]);
  
  // Get learned concepts with details
  const learnedConcepts = concepts.filter(concept => 
    progress.some(p => p.conceptId === concept.id && p.isLearned)
  );
  
  // Group by domain and count
  const domainProgress = learnedConcepts.reduce((acc, concept) => {
    if (!acc[concept.domain]) {
      acc[concept.domain] = {
        domain: concept.domain,
        learned: 0,
        total: concepts.filter(c => c.domain === concept.domain).length
      };
    }
    acc[concept.domain].learned += 1;
    return acc;
  }, {} as Record<string, { domain: string; learned: number; total: number }>);
  
  // Sort domains by progress percentage
  const sortedDomains = Object.values(domainProgress).sort((a, b) => 
    (b.learned / b.total) - (a.learned / a.total)
  );
  
  // Group learned concepts by difficulty
  const byDifficulty = learnedConcepts.reduce((acc, concept) => {
    const difficulty = concept.difficulty;
    if (!acc[difficulty]) {
      acc[difficulty] = [];
    }
    acc[difficulty].push(concept);
    return acc;
  }, {} as Record<string, Concept[]>);
  
  const getDomainColor = (domain: string): string => {
    switch (domain) {
      case "Physics": return "bg-blue-500";
      case "Mathematics": return "bg-purple-500";
      case "Computer Science": return "bg-green-500";
      case "Biology": return "bg-amber-500";
      case "Economics": return "bg-red-500";
      case "Sociology": return "bg-pink-500";
      case "Psychology": return "bg-indigo-500";
      case "Human Science": return "bg-teal-500";
      default: return "bg-gray-500";
    }
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
            <h1 className="text-2xl font-bold mb-6">My Learning Progress</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Overview card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Overall Progress</CardTitle>
                  <CardDescription>Your learning journey so far</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center mt-2">
                    <div className="relative flex justify-center items-center mb-4">
                      <svg className="w-32 h-32" viewBox="0 0 100 100">
                        <circle
                          className="text-neutral-200"
                          strokeWidth="8"
                          stroke="currentColor"
                          fill="transparent"
                          r="40"
                          cx="50"
                          cy="50"
                        />
                        <circle
                          className="text-primary-500"
                          strokeWidth="8"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="40"
                          cx="50"
                          cy="50"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercentage / 100)}`}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-3xl font-bold">{completionPercentage}%</div>
                        <div className="text-sm text-neutral-500">Completion</div>
                      </div>
                    </div>
                    <div className="w-full">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Concepts learned</span>
                        <span className="font-medium">{learnedConcepts.length}/{concepts.length}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Domain breakdown */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle>Domain Breakdown</CardTitle>
                  <CardDescription>Your progress across different fields</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sortedDomains.map(({ domain, learned, total }) => (
                      <div key={domain}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{domain}</span>
                          <span>{learned}/{total} concepts ({Math.round((learned / total) * 100)}%)</span>
                        </div>
                        <Progress value={(learned / total) * 100} className={getDomainColor(domain)} />
                      </div>
                    ))}
                    
                    {sortedDomains.length === 0 && (
                      <div className="text-center py-4 text-neutral-500">
                        You haven't learned any concepts yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="learned">
              <TabsList className="mb-4">
                <TabsTrigger value="learned">Learned Concepts</TabsTrigger>
                <TabsTrigger value="recommended">Recommended Next Steps</TabsTrigger>
              </TabsList>
              
              <TabsContent value="learned">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {learnedConcepts.length > 0 ? (
                    learnedConcepts.map(concept => (
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
                          <p className="text-sm text-neutral-600 line-clamp-3">
                            {concept.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-neutral-500">
                      You haven't learned any concepts yet. Start exploring the knowledge map!
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="recommended">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.length > 0 ? (
                    recommendations.map(({ concept, reason }) => (
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
                          <div className="text-sm bg-primary-50 text-primary-800 p-2 rounded-md">
                            <span className="font-medium">Why learn this:</span> {reason}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-neutral-500">
                      No recommendations available yet. Start learning some concepts!
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}