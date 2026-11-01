const fs = require('fs');
let c = fs.readFileSync('src/app/live/room/[id]/page.tsx', 'utf8');

if (!c.includes('const wmRef = useRef<HTMLDivElement>(null);')) {
  c = c.replace(
    "import { useEffect, useState, use } from 'react';",
    "import { useEffect, useState, use, useRef } from 'react';"
  );

  c = c.replace(
    'const [loadingClass, setLoadingClass] = useState(true);',
    `const [loadingClass, setLoadingClass] = useState(true);
  const wmRef = useRef<HTMLDivElement>(null);

  // Floating Watermark Animation
  useEffect(() => {
    let x = 10 + Math.random() * 60;
    let y = 10 + Math.random() * 60;
    let dx = (Math.random() > 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.02);
    let dy = (Math.random() > 0.5 ? 1 : -1) * (0.015 + Math.random() * 0.015);
    let animationFrameId: number;

    const animate = () => {
      x += dx;
      y += dy;
      
      if (x <= 1) { x = 1; dx = Math.abs(dx); }
      if (x >= 82) { x = 82; dx = -Math.abs(dx); }
      if (y <= 1) { y = 1; dy = Math.abs(dy); }
      if (y >= 88) { y = 88; dy = -Math.abs(dy); }
      
      if (wmRef.current) {
        wmRef.current.style.left = \`\${x}%\`;
        wmRef.current.style.top = \`\${y}%\`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);`
  );

  c = c.replace(
    '<div className="absolute inset-0">',
    `<div className="absolute inset-0">
          {/* Floating Email Watermark - Enhanced for Anti-Piracy */}
          {user && (
            <div
              ref={wmRef}
              className="absolute z-[60] pointer-events-none select-none drop-shadow-lg"
              style={{ left: '20%', top: '20%' }}
            >
              <div className="flex flex-col items-center opacity-40">
                <span className="text-sm md:text-base font-black text-white whitespace-nowrap drop-shadow-md"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}>
                  {user.email}
                </span>
                {user.phone && (
                  <span className="text-xs md:text-sm font-black text-white whitespace-nowrap drop-shadow-md mt-1"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}>
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          )}`
  );
  
  fs.writeFileSync('src/app/live/room/[id]/page.tsx', c);
  console.log('Fixed live room watermark!');
} else {
  console.log('Already has watermark');
}
