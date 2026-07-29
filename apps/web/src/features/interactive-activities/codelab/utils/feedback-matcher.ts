/**
 * feedback-matcher.ts
 *
 * Categorizes raw stderr from Judge0 into student-friendly diagnostic hints.
 */

export function categorizeFeedback(stderr: string, statusId: number): string[] {
  const hints: string[] = [];

  if (!stderr && statusId === 3) return hints; // Accepted

  if (statusId === 5) {
    hints.push("Time Limit Exceeded: Your code took too long to execute. Check for infinite loops or inefficient algorithms.");
    return hints;
  }
  
  if (statusId === 6) {
    hints.push("Compilation Error: Your code failed to compile. Check for syntax errors, missing semicolons, or undefined variables.");
  } else if (statusId >= 7 && statusId <= 12) {
    hints.push("Runtime Error: Your program crashed during execution.");
  }

  const err = stderr.toLowerCase();

  // Python-specific
  if (err.includes("indexerror")) {
    hints.push("Array index out of bounds: You are trying to access an element at an index that doesn't exist in the list.");
  }
  if (err.includes("keyerror")) {
    hints.push("Dictionary key error: You are trying to access a key that does not exist in the dictionary.");
  }
  if (err.includes("indentationerror")) {
    hints.push("Indentation error: Check your spaces and tabs. Python relies on consistent indentation.");
  }
  if (err.includes("typeerror")) {
    hints.push("Type error: You are performing an operation on incompatible data types (e.g., adding a string and an integer).");
  }

  // JS-specific
  if (err.includes("referenceerror") && err.includes("is not defined")) {
    hints.push("Reference error: You are using a variable or function that hasn't been declared.");
  }

  // Java/C++ specific
  if (err.includes("arrayindexoutofboundsexception") || err.includes("out_of_range")) {
    hints.push("Array index out of bounds: You are trying to access an element past the end of the array/vector.");
  }
  if (err.includes("nullpointerexception") || err.includes("segmentation fault")) {
    hints.push("Memory access error (Null Pointer/Segfault): You might be trying to access an uninitialized object, null reference, or invalid memory address.");
  }

  if (hints.length === 0 && stderr) {
    // Fallback if we couldn't match a specific pattern
    hints.push("Check the console output for specific error details.");
  }

  return hints;
}
