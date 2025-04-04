import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Concept, UserProgress } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<number[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const { data: domains = [] } = useQuery<string[]>({
    queryKey: ["/api/domains"],
    enabled: !!user && isOpen,
  });
  
  const { data: conceptsByDomain = {} } = useQuery({
    queryKey: ["/api/concepts/by-domains", selectedDomains],
    queryFn: async () => {
      if (selectedDomains.length === 0) return {};
      
      const result: Record<string, Concept[]> = {};
      
      for (const domain of selectedDomains) {
        const concepts = await apiRequest<Concept[]>(`/api/concepts/domain/${encodeURIComponent(domain)}`);
        result[domain] = concepts as Concept[];
      }
      
      return result;
    },
    enabled: !!user && isOpen && selectedDomains.length > 0 && step === 2,
  });
  
  // Create a mutation for updating progress (marking concepts as learned)
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
    },
    onError: (error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDomainToggle = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };
  
  const handleConceptToggle = (conceptId: number) => {
    setSelectedConcepts(prev => 
      prev.includes(conceptId)
        ? prev.filter(id => id !== conceptId)
        : [...prev, conceptId]
    );
  };
  
  const handleNext = () => {
    if (step === 1 && selectedDomains.length > 0) {
      setStep(2);
    }
  };
  
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };
  
  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      // Mark all selected concepts as learned
      for (const conceptId of selectedConcepts) {
        await updateProgressMutation.mutateAsync({
          conceptId,
          isLearned: true,
          learnedAt: new Date(),
        });
      }
      
      toast({
        title: "Onboarding complete",
        description: `You've marked ${selectedConcepts.length} concepts as learned. Your knowledge map is now personalized.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };
  
  const getDomainColor = (domain: string) => {
    switch (domain) {
      case "Physics": return "bg-blue-500 hover:bg-blue-600";
      case "Mathematics": return "bg-purple-500 hover:bg-purple-600";
      case "Computer Science": return "bg-green-500 hover:bg-green-600";
      case "Biology": return "bg-amber-500 hover:bg-amber-600";
      case "Economics": return "bg-red-500 hover:bg-red-600";
      case "Sociology": return "bg-pink-500 hover:bg-pink-600";
      case "Psychology": return "bg-indigo-500 hover:bg-indigo-600";
      case "Human Science": return "bg-teal-500 hover:bg-teal-600";
      default: return "bg-gray-500 hover:bg-gray-600";
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
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welcome to Knowledge Atlas</DialogTitle>
          <DialogDescription>
            Let's personalize your learning experience. Tell us a bit about your existing knowledge.
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4">Select domains you're familiar with:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {domains.map(domain => (
                <button
                  key={domain}
                  className={`
                    p-4 rounded-md text-white font-medium text-center
                    ${selectedDomains.includes(domain) 
                      ? getDomainColor(domain) + ' ring-2 ring-offset-2'
                      : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'}
                  `}
                  onClick={() => handleDomainToggle(domain)}
                >
                  {domain}
                </button>
              ))}
            </div>
            <p className="text-sm text-neutral-500 mb-2">
              {selectedDomains.length === 0 
                ? "Select at least one domain to continue." 
                : `You've selected ${selectedDomains.length} ${selectedDomains.length === 1 ? 'domain' : 'domains'}.`}
            </p>
          </div>
        )}
        
        {step === 2 && (
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4">
              Select concepts you already know:
            </h3>
            <div className="max-h-96 overflow-y-auto pr-2">
              {selectedDomains.map(domain => (
                <div key={domain} className="mb-6">
                  <h4 className="font-medium text-neutral-900 mb-2">{domain}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {conceptsByDomain[domain]?.map(concept => (
                      <Card 
                        key={concept.id} 
                        className={`cursor-pointer border transition-colors ${
                          selectedConcepts.includes(concept.id) 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'hover:border-neutral-300'
                        }`}
                        onClick={() => handleConceptToggle(concept.id)}
                      >
                        <CardContent className="py-3 px-4 flex items-center space-x-2">
                          <Checkbox 
                            checked={selectedConcepts.includes(concept.id)}
                            onCheckedChange={() => handleConceptToggle(concept.id)}
                            className="pointer-events-none"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{concept.name}</div>
                            <Badge className={getDifficultyBadgeColor(concept.difficulty)}>
                              {concept.difficulty}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(!conceptsByDomain[domain] || conceptsByDomain[domain].length === 0) && (
                      <p className="text-sm text-neutral-500 col-span-2">
                        No concepts found for this domain.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-neutral-500 mt-2 mb-2">
              {selectedConcepts.length === 0
                ? "Select the concepts you already know." 
                : `You've selected ${selectedConcepts.length} ${selectedConcepts.length === 1 ? 'concept' : 'concepts'}.`}
            </p>
          </div>
        )}
        
        <DialogFooter className="sm:justify-between">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} disabled={isCompleting}>
              Back
            </Button>
          )}
          
          <div className="flex space-x-2">
            <Button variant="ghost" onClick={onClose} disabled={isCompleting}>
              Skip
            </Button>
            
            {step === 1 ? (
              <Button onClick={handleNext} disabled={selectedDomains.length === 0}>
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleComplete} 
                disabled={isCompleting}
                className={isCompleting ? 'opacity-80' : ''}
              >
                {isCompleting ? 'Completing...' : 'Complete'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;