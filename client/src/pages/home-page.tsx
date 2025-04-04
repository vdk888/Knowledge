import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AppHeader from '@/components/AppHeader';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import ConceptDetail from '@/components/ConceptDetail';
import ChatPanel from '@/components/ChatPanel';
import ProgressDrawer from '@/components/ProgressDrawer';
import { Concept } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

export default function HomePage() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [isProgressDrawerOpen, setIsProgressDrawerOpen] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string | undefined>(undefined);
  
  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"],
  });

  // Handle concept selection from the graph
  const handleSelectConcept = (concept: Concept) => {
    setSelectedConcept(concept);
    // Update current domain based on selected concept
    setCurrentDomain(concept.domain);
  };

  // Toggle progress drawer
  const toggleProgressDrawer = () => {
    setIsProgressDrawerOpen(!isProgressDrawerOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AppHeader 
          currentDomain={currentDomain} 
          onToggleProgressDrawer={toggleProgressDrawer}
        />
        
        {/* Content Container */}
        <div className="flex-1 overflow-hidden flex">
          {/* Knowledge Graph and Concept Detail */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Knowledge Graph */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold text-neutral-900">Interactive Knowledge Map</h2>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </button>
                  <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                  </button>
                  <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                    </svg>
                  </button>
                  <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Knowledge Graph Visualization */}
              <KnowledgeGraph 
                onSelectConcept={handleSelectConcept} 
                currentConceptId={selectedConcept?.id}
              />
            </div>
            
            {/* Concept Detail Panel */}
            {selectedConcept ? (
              <ConceptDetail concept={selectedConcept} />
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-neutral-500 text-center">
                  Select a concept from the knowledge map above to view details.
                </p>
              </div>
            )}
          </div>
          
          {/* Chat Panel */}
          <ChatPanel concept={selectedConcept} />
        </div>
      </main>
      
      {/* Progress Drawer */}
      <ProgressDrawer 
        isOpen={isProgressDrawerOpen} 
        onClose={() => setIsProgressDrawerOpen(false)} 
      />
    </div>
  );
}
