import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export default function Breadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  // Define breadcrumb items based on the current path
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    // Handle admin routes
    if (pathname.startsWith('/events/')) {
      const eventId = pathname.split('/')[2];
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Aktion Details', path: pathname }
      ];
    }
    
    if (pathname === '/persons') {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Mitglieder', path: '/persons' }
      ];
    }

    if (pathname === '/persons/requests') {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Mitglieder', path: '/persons' },
        { label: 'Anfragen', path: '/persons/requests' }
      ];
    }

    if (pathname === '/stats') {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Statistik', path: '/stats' }
      ];
    }

    if (pathname === '/broadcast') {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Push-Nachrichten', path: '/broadcast' }
      ];
    }

    if (pathname === '/pinnwand') {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Pinnwand', path: '/pinnwand' }
      ];
    }

    if (pathname === '/einstellungen') {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Einstellungen', path: '/einstellungen' }
      ];
    }

    if (pathname === '/profil') {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Profil', path: '/profil' }
      ];
    }
    
    // Handle person routes
    if (pathname === '/dashboard') {
      return [
        { label: 'Übersicht', path: '/dashboard' }
      ];
    }
    
    // Handle public invite route
    if (pathname.startsWith('/invite/')) {
      return [
        { label: 'Einladung', path: pathname }
      ];
    }
    
    // Default for home/dashboard
    if (pathname === '/') {
      return [
        { label: 'Dashboard', path: '/' }
      ];
    }
    
    // Fallback
    return [
      { label: 'Start', path: '/' },
      { label: 'Seite', path: pathname }
    ];
  };

  const items = getBreadcrumbItems();

  return (
    <nav className="mb-8 pb-4 border-b border-border">
      <ol className="flex items-center gap-2 text-text-dim text-[12px] font-black uppercase tracking-[0.2em]">
        {items.map((item, index) => (
          <React.Fragment key={item.path}>
            {index > 0 && (
              <span>
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
            {index === items.length - 1 ? (
              <span className="text-text">{item.label}</span>
            ) : (
              <NavLink 
                to={item.path} 
                className="hover:text-text transition-colors"
                end
              >
                {item.label}
              </NavLink>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}