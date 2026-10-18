import { Video } from 'lucide-react';

export default function GoogleMeetLinks({ links }: { links: string[] }) {
    if (!links.length) return null;
    return <ul className="mt-4 flex flex-wrap gap-3">
        {links.map(href => <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 motion-reduce:transition-none">
                <Video size={17} aria-hidden="true" />Join Google Meet<span className="sr-only"> (opens in a new tab)</span>
            </a>
        </li>)}
    </ul>;
}
