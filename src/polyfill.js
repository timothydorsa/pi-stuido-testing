// Polyfills for browser environment
import process from 'process/browser';
import { Buffer } from 'buffer';

// Ensure global is available
if (typeof global === 'undefined') {
  window.global = window;
}

// Ensure process is available
if (!window.process) {
  window.process = process;
}

// Ensure Buffer is available
if (!window.Buffer) {
  window.Buffer = Buffer;
}

// Handle require for CommonJS modules
if (typeof window.require === 'undefined') {
  // We don't use an actual require implementation here as webpack should handle imports
  window.require = function(module) {
    console.warn(`Module ${module} was required but not properly bundled by webpack`);
    return {}; // Return empty object to prevent errors
  };
}
