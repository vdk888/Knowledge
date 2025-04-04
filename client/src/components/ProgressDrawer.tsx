import { useQuery } from "@tanstack/react-query";
import { Concept, UserProgress } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

interface ProgressDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Recommendation {
  concept: Concept;
  reason: string;
}

const ProgressDrawer = ({ isOpen, onClose }: ProgressDrawerProps) => {
  const { user } = useAuth();
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/user/progress"],
    enabled: !!user,
  });
  
  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"],
    enabled: !!user,
  });
  
  const { data: recommendations = [] } = useQuery<Recommendation[]>({
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
        learned: 0,
        total: 0
      };
    }
    acc[concept.domain].learned += 1;
    return acc;
  }, {} as Record<string, { learned: number; total: number }>);
  
  // Count total concepts per domain
  concepts.forEach(concept => {
    if (!domainProgress[concept.domain]) {
      domainProgress[concept.domain] = {
        learned: 0,
        total: 0
      };
    }
    domainProgress[concept.domain].total += 1;
  });
  
  // Get recently learned concepts (sorted by learnedAt)
  const recentlyLearned = learnedConcepts
    .map(concept => {
      const progressItem = progress.find(p => p.conceptId === concept.id && p.isLearned);
      return {
        ...concept,
        learnedAt: progressItem?.learnedAt || new Date()
      };
    })
    .sort((a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime())
    .slice(0, 3);
  
  const getDomainColor = (domain: string) => {
    switch (domain) {
      case "Physics": return "bg-blue-500";
      case "Mathematics": return "bg-purple-500";
      case "Computer Science": return "bg-green-500";
      case "Biology": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };
  
  // Calculate stroke-dashoffset for progress ring
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (completionPercentage / 100) * circumference;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-50">
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-lg transform transition-transform duration-300">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="font-heading font-semibold text-neutral-900">My Learning Progress</h2>
          <button 
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-68px)]">
          <div className="flex items-center justify-center mb-8">
            <div className="relative inline-block">
              <svg className="progress-ring" width="160" height="160">
                <circle 
                  className="progress-ring-circle" 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  stroke="#E2E8F0" 
                  strokeWidth="12" 
                  fill="transparent"
                />
                <circle 
                  className="progress-ring-circle" 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  stroke="#4F46E5" 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90, 80, 80)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-neutral-900">{completionPercentage}%</span>
                <span className="text-sm text-neutral-500">Completion</span>
              </div>
            </div>
          </div>
          
          {Object.keys(domainProgress).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Domains</h3>
              <div className="space-y-3">
                {Object.entries(domainProgress).map(([domain, { learned, total }]) => (
                  <div key={domain}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-neutral-700">{domain}</span>
                      <span className="text-neutral-500">{learned}/{total} concepts</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2.5">
                      <div 
                        className={`${getDomainColor(domain)} h-2.5 rounded-full`} 
                        style={{ width: `${Math.round((learned / total) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {recentlyLearned.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Recently Learned</h3>
              <div className="space-y-2">
                {recentlyLearned.map(concept => {
                  const learnedDate = new Date(concept.learnedAt);
                  const daysAgo = Math.round((new Date().getTime() - learnedDate.getTime()) / (1000 * 60 * 60 * 24));
                  const timeAgo = daysAgo === 0 
                    ? "today" 
                    : daysAgo === 1 
                      ? "yesterday"
                      : `${daysAgo} days ago`;
                  
                  return (
                    <div key={concept.id} className="flex items-center p-2 bg-neutral-50 rounded border border-neutral-200">
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getDomainColor(concept.domain)}`}></div>
                      <span className="ml-3 text-neutral-700">{concept.name}</span>
                      <span className="ml-auto text-xs text-neutral-500">{timeAgo}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Recommended Next</h3>
              <div className="space-y-2">
                {recommendations.map(({ concept, reason }) => (
                  <div key={concept.id} className="flex items-center p-3 bg-neutral-50 rounded border border-neutral-200 hover:bg-neutral-100 cursor-pointer">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getDomainColor(concept.domain)}`}></div>
                    <div className="ml-3">
                      <span className="text-neutral-800 font-medium">{concept.name}</span>
                      <p className="text-xs text-neutral-500 mt-0.5">{reason}</p>
                    </div>
                    <svg className="w-5 h-5 ml-auto text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressDrawer;
