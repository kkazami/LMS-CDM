'use client';
import { Video } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function GoogleMeetLinks({ links, instituteCode }: { links: string[]; instituteCode?: string }) {
    const params = useParams();
    const code = instituteCode || (params?.institute as string) || '';
    const isIte = code.toLowerCase() === 'ite';

    if (!links.length) return null;
    return <ul className="mt-4 flex flex-wrap gap-3">
        {links.map(href => <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isIte
                        ? 'bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600'
                        : 'bg-orange-700 hover:bg-orange-800 focus-visible:outline-orange-600'
                }`}>
                <Video size={17} aria-hidden="true" />Join Google Meet<span className="sr-only"> (opens in a new tab)</span>
            </a>
        </li>)}
    </ul>;
}
