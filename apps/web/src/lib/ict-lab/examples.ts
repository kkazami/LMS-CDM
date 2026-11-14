import type { PlaygroundExampleSnippet } from "./types";

export const PLAYGROUND_EXAMPLES: PlaygroundExampleSnippet[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "Basic HTML heading, paragraph, and introductory console log",
    html: `<h1>Hello, BTLEd ICT!</h1>
<p id="greeting">Welcome to the web programming practice sandbox.</p>`,
    css: `body {
  font-family: system-ui, -apple-system, sans-serif;
  padding: 1.5rem;
  color: #1e293b;
  background: #f8fafc;
}
h1 {
  color: #2563eb;
  margin-bottom: 0.5rem;
}
p {
  line-height: 1.5;
  color: #475569;
}`,
    js: `console.log("Hello from ICT Lab Code Playground!");
const greeting = document.getElementById("greeting");
if (greeting) {
  console.log("Greeting element text:", greeting.textContent);
}`,
  },
  {
    id: "button-counter",
    title: "Button Counter (addEventListener)",
    description: "Interactive button click counter demonstrating DOM event listeners",
    html: `<div class="counter-box">
  <h2>Interactive Counter</h2>
  <p id="count-display">Current count: 0</p>
  <button id="increment-btn" type="button">Click Me (+1)</button>
</div>`,
    css: `body {
  font-family: system-ui, -apple-system, sans-serif;
  padding: 1.5rem;
  background: #f8fafc;
}
.counter-box {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem;
  max-width: 320px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
h2 {
  margin-top: 0;
  font-size: 1.15rem;
  color: #0f172a;
}
#count-display {
  font-weight: 600;
  color: #334155;
}
button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
button:hover {
  background: #1d4ed8;
}`,
    js: `let count = 0;
const btn = document.getElementById("increment-btn");
const display = document.getElementById("count-display");

btn.addEventListener("click", () => {
  count++;
  display.textContent = "Current count: " + count;
  console.log("Counter clicked. New count =", count);
});

console.log("Counter event listener attached.");`,
  },
  {
    id: "css-card",
    title: "CSS Layout Card",
    description: "Responsive card component styled with modern CSS flexbox",
    html: `<article class="card">
  <span class="badge">BTLEd ICT Module</span>
  <h3>Computer Networking Essentials</h3>
  <p>Learn Ethernet cabling, T568A/T568B pinouts, and network topologies.</p>
  <div class="card-footer">
    <span class="meta">8 Practical Exercises</span>
    <button id="view-details" type="button">Explore</button>
  </div>
</article>`,
    css: `body {
  font-family: system-ui, -apple-system, sans-serif;
  padding: 1.5rem;
  background: #f1f5f9;
}
.card {
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 1rem;
  padding: 1.25rem;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.badge {
  align-self: flex-start;
  background: #dbeafe;
  color: #1e40af;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
}
h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}
p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}
.meta {
  font-size: 0.75rem;
  color: #64748b;
}
button {
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 0.375rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
button:hover {
  background: #0284c7;
}`,
    js: `const exploreBtn = document.getElementById("view-details");
exploreBtn.addEventListener("click", () => {
  console.log("Card action clicked: Exploring Computer Networking Essentials");
});
console.log("Card layout loaded.");`,
  },
  {
    id: "loop-array",
    title: "Loop & Array Exercise",
    description: "Iterate over an array of PC parts and dynamically render list items",
    html: `<h2>Hardware Components</h2>
<ul id="parts-list"></ul>`,
    css: `body {
  font-family: system-ui, -apple-system, sans-serif;
  padding: 1.5rem;
  background: #f8fafc;
}
h2 {
  color: #334155;
  font-size: 1.25rem;
  margin-top: 0;
}
ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 360px;
}
li {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #1e293b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}`,
    js: `const components = [
  "Central Processing Unit (CPU)",
  "Random Access Memory (RAM)",
  "Motherboard",
  "Solid State Drive (SSD)",
  "Power Supply Unit (PSU)"
];

const list = document.getElementById("parts-list");
components.forEach((item, index) => {
  const li = document.createElement("li");
  li.textContent = (index + 1) + ". " + item;
  list.appendChild(li);
  console.log("Rendered component:", item);
});
console.log("Total components rendered =", components.length);`,
  },
];

export const DEFAULT_EXAMPLE_ID = "hello-world";
export const DEFAULT_EXAMPLE = PLAYGROUND_EXAMPLES[0]!;

