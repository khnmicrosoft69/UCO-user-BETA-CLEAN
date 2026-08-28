import React, { useState, useEffect, createContext, useContext } from 'react';
import { DesktopFrame } from './DesktopViewing';
import { MobileFrame } from './MobileViewing';
import UserHeader from '../UserHeader';

const ResponsiveLayoutContext = createContext({ isMobile: false });

export const useResponsiveLayout = () => useContext(ResponsiveLayoutContext);

export default function ResponsiveLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    // Auth guard: redirect to login if no user session found
    const user = localStorage.getItem('user');
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setAuthed(true);
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted || !authed) return <div className="min-h-screen bg-slate-50"></div>;

  const HeaderComp = (props) => <UserHeader isMobile={isMobile} {...props} />;

  const content = (
    <ResponsiveLayoutContext.Provider value={{ isMobile }}>
      {children}
    </ResponsiveLayoutContext.Provider>
  );

  if (isMobile) {
    return (
      <MobileFrame
        Header={HeaderComp}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      >
        {content}
      </MobileFrame>
    );
  }

  return (
    <DesktopFrame Header={HeaderComp}>
      {content}
    </DesktopFrame>
  );
}
