import { type SVGProps, forwardRef } from "react";

const FlashcardIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      ref={ref}
      {...props}
    >
      <path d="M6 4h12a2 2 0 0 1 2 2v10" />
      <rect x="2" y="8" width="16" height="12" rx="2" />
      <path d="M6 13h8" />
      <path d="M6 16h5" />
    </svg>
  );
});

FlashcardIcon.displayName = "FlashcardIcon";

export default FlashcardIcon;
