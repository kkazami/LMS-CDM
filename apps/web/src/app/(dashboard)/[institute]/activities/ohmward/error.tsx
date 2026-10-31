'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <section className="ohm-surface" role="alert"><h2>Ohmward could not open this page</h2><p>Your confirmed saves remain stored. Check your connection, then try again. Keep any other tab with unsaved work open.</p><button type="button" className="ohm-button" onClick={reset}>Try again</button></section>;
}
