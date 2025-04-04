import { Concept } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConceptDetailProps {
  concept: Concept;
}

interface ConceptConnection {
  prerequisites: Concept[];
  related: Concept[];
}

const ConceptDetail = ({ concept }: ConceptDetailProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: connections, isLoading: isLoadingConnections } = useQuery<ConceptConnection>({
    queryKey: [`/api/concepts/${concept.id}/connections`],
    enabled: !!concept,
  });
  
  const { data: userProgress, isLoading: isLoadingProgress } = useQuery<any[]>({
    queryKey: ["/api/user/progress"],
    enabled: !!user,
  });
  
  const isLearned = userProgress?.some(
    progress => progress.conceptId === concept.id && progress.isLearned
  );
  
  const markLearnedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/user/progress", {
        conceptId: concept.id,
        isLearned: !isLearned,
        learnedAt: !isLearned ? new Date() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/recommendations"] });
      toast({
        title: !isLearned ? "Concept marked as learned" : "Concept marked as not learned",
        description: !isLearned
          ? `You've successfully marked "${concept.name}" as learned.`
          : `You've removed "${concept.name}" from your learned concepts.`,
        variant: !isLearned ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getDomainDotColor = (domain: string) => {
    switch (domain) {
      case "Physics":
        return "bg-blue-500";
      case "Mathematics":
        return "bg-purple-500";
      case "Computer Science":
        return "bg-green-500";
      case "Biology":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };
  
  if (!concept) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-neutral-500">Select a concept from the knowledge map to see details.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center">
            <h2 className="text-xl font-heading font-semibold text-neutral-900">{concept.name}</h2>
            <span className={`ml-3 px-2 py-1 ${getDomainBadgeColor(concept.domain)} text-xs font-medium rounded`}>{concept.domain}</span>
            <span className={`ml-2 px-2 py-1 ${getDifficultyBadgeColor(concept.difficulty)} text-xs font-medium rounded`}>{concept.difficulty}</span>
          </div>
          <p className="text-neutral-500 mt-1">{concept.description}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
            </svg>
          </button>
          <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
            </svg>
          </button>
          <button 
            className={`${isLearned ? 'bg-neutral-200 hover:bg-neutral-300' : 'bg-secondary-500 hover:bg-secondary-600'} text-white rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center`}
            onClick={() => markLearnedMutation.mutate()}
            disabled={markLearnedMutation.isPending}
          >
            {markLearnedMutation.isPending ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
            {isLearned ? "Learned" : "Mark as Learned"}
          </button>
        </div>
      </div>
      
      <div className="flex space-x-8 mb-6">
        <div className="w-1/2">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Prerequisites</h3>
          {isLoadingConnections ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          ) : connections?.prerequisites && connections.prerequisites.length > 0 ? (
            connections.prerequisites.map(prereq => (
              <div key={prereq.id} className="flex items-center mb-2 p-2 bg-neutral-50 rounded border border-neutral-200">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getDomainDotColor(prereq.domain)}`}></div>
                <span className="ml-3 text-neutral-700">{prereq.name}</span>
                <div className="ml-auto">
                  {userProgress?.some(p => p.conceptId === prereq.id && p.isLearned) ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-neutral-500">
              No prerequisites found for this concept.
            </div>
          )}
        </div>
        
        <div className="w-1/2">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Related Concepts</h3>
          {isLoadingConnections ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          ) : connections?.related && connections.related.length > 0 ? (
            connections.related.map(related => (
              <div key={related.id} className="flex items-center mb-2 p-2 bg-neutral-50 rounded border border-neutral-200">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getDomainDotColor(related.domain)}`}></div>
                <span className="ml-3 text-neutral-700">{related.name}</span>
                <span className={`ml-2 px-2 py-1 ${getDifficultyBadgeColor(related.difficulty)} text-xs font-medium rounded`}>
                  {related.difficulty}
                </span>
              </div>
            ))
          ) : (
            <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-neutral-500">
              No related concepts found.
            </div>
          )}
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Description</h3>
        <div className="prose prose-sm max-w-none text-neutral-700">
          <p>{concept.description}</p>
          
          {/* Fetch and display LLM-generated explanation */}
          <LLMExplanation conceptId={concept.id} />
        </div>
      </div>
    </div>
  );
};

const LLMExplanation = ({ conceptId }: { conceptId: number }) => {
  const { data, isLoading, error } = useQuery<{ explanation: string }>({
    queryKey: [`/api/learn/${conceptId}`, { context: "detailed" }],
    enabled: !!conceptId,
  });
  
  if (isLoading) {
    return (
      <div className="mt-4 flex items-center text-neutral-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
        <span>Loading detailed explanation...</span>
      </div>
    );
  }
  
  if (error) {
    return <p className="mt-4 text-red-500">Error loading explanation. Please try again later.</p>;
  }
  
  if (data?.explanation) {
    return (
      <div className="mt-4">
        <h4 className="font-medium text-neutral-800 mb-2">Learning Assistant Explanation:</h4>
        <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
          {data.explanation.split('\n').map((paragraph, i) => (
            <p key={i} className={i > 0 ? "mt-2" : ""}>{paragraph}</p>
          ))}
        </div>
      </div>
    );
  }
  
  return null;
};

export default ConceptDetail;
