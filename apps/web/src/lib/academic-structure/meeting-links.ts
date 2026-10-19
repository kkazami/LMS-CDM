/** Extract posted meeting destinations; never fetch, embed or automatically join them. */
export function googleMeetLinks(content: string): string[] {
    const links = new Set<string>();
    for (const match of content.matchAll(/https:\/\/[^\s<>"'`]+/gi)) {
        try {
            const url = new URL(match[0].replace(/[),.!?;:]+$/, ''));
            if (url.protocol === 'https:' && url.hostname === 'meet.google.com' && !url.port && !url.username && !url.password
                && /^\/(?:[a-z]{3}-[a-z]{4}-[a-z]{3}|lookup\/[a-z\d_-]+)\/?$/i.test(url.pathname)) links.add(url.href);
        } catch { /* A malformed pasted URL remains plain announcement text. */ }
    }
    return [...links];
}
