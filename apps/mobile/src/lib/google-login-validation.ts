export function googleCallbackTicket(value: string, returnUri: string, state: string) {
  const actual = new URL(value), expected = new URL(returnUri);
  if (actual.username || actual.password || actual.hash || actual.protocol !== expected.protocol || actual.host !== expected.host || actual.pathname !== expected.pathname || actual.searchParams.get('state') !== state) throw new Error('Google returned an unexpected sign-in response. Please try again.');
  if (actual.searchParams.has('error')) throw new Error(actual.searchParams.get('error') || 'Google sign-in was cancelled.');
  const ticket = actual.searchParams.get('ticket');
  if (!ticket || ticket.length > 8192) throw new Error('Google sign-in did not return a valid response. Please try again.');
  return ticket;
}
