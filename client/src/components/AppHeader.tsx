import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface AppHeaderProps {
  currentDomain?: string;
  onToggleProgressDrawer: () => void;
}

const AppHeader = ({ currentDomain, onToggleProgressDrawer }: AppHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: domains = [] } = useQuery<string[]>({
    queryKey: ["/api/domains"],
  });

  return (
    <header className="bg-white border-b border-neutral-200 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-xl font-heading font-semibold text-neutral-900">Knowledge Map</h1>
        {domains.length > 0 && (
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
                    <a className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md">
                      {domain}
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center">
        <div className="relative mr-4">
          <input 
            type="text" 
            placeholder="Search concepts..." 
            className="bg-neutral-100 border-0 rounded-full py-2 px-4 w-64 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="absolute right-3 top-2 text-neutral-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </button>
        </div>
        
        <button 
          className="bg-primary-500 hover:bg-primary-600 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
          onClick={onToggleProgressDrawer}
        >
          My Progress
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
