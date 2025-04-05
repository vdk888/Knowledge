import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Concept } from "@shared/schema"; // Import Concept type
import { apiRequest } from "@/lib/queryClient"; // Import apiRequest if needed for search query

interface AppHeaderProps {
  currentDomain?: string;
  onToggleProgressDrawer: () => void;
  onToggleSidebar?: () => void;
}

const AppHeader = ({ currentDomain, onToggleProgressDrawer, onToggleSidebar }: AppHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isMobile = useIsMobile();
  const [, navigate] = useLocation(); // For navigation
  const searchContainerRef = useRef<HTMLDivElement>(null); // Ref for detecting clicks outside
  
  const { data: domains = [] } = useQuery<string[]>({
    queryKey: ["/api/domains"],
  });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch search results when debounced query changes
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery<Concept[]>({
    queryKey: ["/api/concepts/search", debouncedQuery],
    queryFn: async ({ queryKey }) => {
      // Explicitly type the destructured queryKey elements
      const [, query] = queryKey as [string, string]; 
      if (!query) {
        return []; // No query, no results
      }
      const res = await fetch(`/api/concepts/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.json();
    },
    enabled: debouncedQuery.length > 0 && isSearchFocused, // Only run query if focused and query exists
    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
  });
  
  // Handle clicks outside the search container to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);
  
  const handleResultClick = (conceptId: number) => {
    // TODO: Navigate to the concept detail page - adjust path if needed
    navigate(`/concept/${conceptId}`); 
    setSearchQuery(''); // Clear search bar
    setIsSearchFocused(false); // Close dropdown
  };

  return (
    <header className="bg-white border-b border-neutral-200 py-3 px-4 md:py-4 md:px-6 flex flex-wrap items-center justify-between">
      <div className="flex items-center">
        {/* Mobile menu button */}
        {isMobile && onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="mr-3 p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        )}
        <h1 className="text-lg md:text-xl font-heading font-semibold text-neutral-900">Knowledge Atlas</h1>
        {domains.length > 0 && !isMobile && (
          <div className="ml-4 flex">
            {currentDomain && (
              <button className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded text-sm font-medium hover:bg-neutral-200 mr-2">
                {currentDomain}
              </button>
            )}
            <div className="relative group">
              <button className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded text-sm font-medium hover:bg-neutral-200 flex items-center">
                <span>+ Add Domain</span>
              </button>
              <div className="absolute left-0 mt-1 bg-white shadow-lg rounded-md p-1 hidden group-hover:block z-10 w-48">
                {domains.map(domain => (
                  <Link key={domain} href={`/domain/${domain}`}>
                    <div className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md">
                      {domain}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Mobile search toggle */}
        {isMobile && (
          <button 
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full"
            onClick={() => setIsSearchVisible(!isSearchVisible)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </button>
        )}
        
        {/* Search bar - hidden on mobile unless toggled */}
        {(!isMobile || isSearchVisible) && (
          <div className="relative mr-2 md:mr-4" ref={searchContainerRef}>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search concepts..." 
                className="bg-neutral-100 border-0 rounded-full py-2 pl-4 pr-10 w-full md:w-64 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                // onBlur is tricky with dropdowns, using click outside instead
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                {isSearchLoading ? (
                  // Simple spinner
                  <svg className="animate-spin h-5 w-5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                )}
              </div>
            </div>
            
            {/* Search Results Dropdown */}
            {isSearchFocused && debouncedQuery.length > 0 && (
              <div className="absolute left-0 mt-2 w-full md:w-80 bg-white rounded-md shadow-lg border border-neutral-200 z-20 max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((concept) => (
                    <div
                      key={concept.id}
                      onClick={() => handleResultClick(concept.id)}
                      className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex justify-between items-center"
                    >
                      <span>{concept.name}</span>
                      <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {concept.domain}
                      </span>
                    </div>
                  ))
                ) : !isSearchLoading ? (
                  <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                    No concepts found for "{debouncedQuery}"
                  </div>
                ) : null /* Show nothing while loading initially */}
              </div>
            )}
          </div>
        )}
        
        {/* Progress button */}
        <button 
          className={`${isMobile ? 'p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full' : 'bg-primary-500 hover:bg-primary-600 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors'}`}
          onClick={onToggleProgressDrawer}
        >
          {isMobile ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ) : (
            "My Progress"
          )}
        </button>
      </div>
      
      {/* Mobile domain selector - shown below header when on mobile */}
      {isMobile && currentDomain && (
        <div className="w-full mt-2 overflow-x-auto pb-2 flex">
          <div className="flex space-x-2">
            {domains.map(domain => (
              <Link key={domain} href={`/domain/${domain}`}>
                <div className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${domain === currentDomain ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-700'}`}>
                  {domain}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
