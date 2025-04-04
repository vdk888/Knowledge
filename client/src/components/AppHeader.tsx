import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppHeaderProps {
  currentDomain?: string;
  onToggleProgressDrawer: () => void;
  onToggleSidebar?: () => void;
}

const AppHeader = ({ currentDomain, onToggleProgressDrawer, onToggleSidebar }: AppHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const isMobile = useIsMobile();
  
  const { data: domains = [] } = useQuery<string[]>({
    queryKey: ["/api/domains"],
  });

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
          <div className="relative mr-2 md:mr-4">
            <input 
              type="text" 
              placeholder="Search concepts..." 
              className="bg-neutral-100 border-0 rounded-full py-2 px-4 w-full md:w-64 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-3 top-2 text-neutral-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </button>
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
