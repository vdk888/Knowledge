import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

const Sidebar = () => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const { data: domains = [] } = useQuery<string[]>({
    queryKey: ["/api/domains"],
    enabled: !!user
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 text-primary-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd"></path>
          </svg>
          <h1 className="text-xl font-bold font-heading text-neutral-900">Knowledge Atlas</h1>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-4">Navigation</h2>
          <ul>
            <li>
              <Link href="/">
                <a className={`flex items-center px-4 py-2 text-neutral-900 ${isActive("/") ? "bg-neutral-100 rounded-md font-medium" : "hover:bg-neutral-100 rounded-md"}`}>
                  <svg className="w-5 h-5 mr-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                  </svg>
                  Knowledge Map
                </a>
              </Link>
            </li>
            <li>
              <Link href="/progress">
                <a className={`flex items-center px-4 py-2 text-neutral-600 ${isActive("/progress") ? "bg-neutral-100 rounded-md font-medium" : "hover:bg-neutral-100 rounded-md"} mt-1`}>
                  <svg className="w-5 h-5 mr-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  My Progress
                </a>
              </Link>
            </li>
            <li>
              <Link href="/study-list">
                <a className={`flex items-center px-4 py-2 text-neutral-600 ${isActive("/study-list") ? "bg-neutral-100 rounded-md font-medium" : "hover:bg-neutral-100 rounded-md"} mt-1`}>
                  <svg className="w-5 h-5 mr-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  Study List
                </a>
              </Link>
            </li>
          </ul>
        </div>
        
        {domains.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-4">Domains</h2>
            <ul>
              {domains.map((domain, index) => (
                <li key={domain}>
                  <Link href={`/domain/${domain}`}>
                    <a className={`flex items-center px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-md ${index > 0 ? 'mt-1' : ''}`}>
                      <span className={`w-2 h-2 rounded-full mr-3 ${
                        domain === 'Physics' ? 'bg-blue-500' : 
                        domain === 'Computer Science' ? 'bg-green-500' :
                        domain === 'Mathematics' ? 'bg-purple-500' : 
                        domain === 'Biology' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></span>
                      {domain}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
      
      {user && (
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-neutral-200 mr-3 flex items-center justify-center text-neutral-600">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">{user.username}</p>
              <p className="text-xs text-neutral-500">{user.email || 'No email provided'}</p>
            </div>
            <button 
              className="ml-auto text-neutral-400 hover:text-neutral-500"
              onClick={handleLogout}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
