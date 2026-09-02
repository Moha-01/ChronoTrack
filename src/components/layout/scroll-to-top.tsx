'use client';

import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ScrollToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // passive: der Handler ruft kein preventDefault, das entlastet das Scrollen.
    // rAF-Drosselung statt setState in jedem Scroll-Frame.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setVisible(window.scrollY > 400);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;

  return (
    <Button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      size="icon"
      // bottom-safe-b hält den Knopf über dem iOS-Home-Indikator.
      className="fixed right-4 z-50 h-12 w-12 rounded-full shadow-lg"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <ArrowUp className="h-5 w-5" />
      <span className="sr-only">Nach oben scrollen</span>
    </Button>
  );
}
