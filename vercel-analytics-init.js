// Vercel Web Analytics initialization script
// This initializes the analytics queue that Vercel will use when deployed

(function() {
  // Skip if already initialized
  if (window.va) return;
  
  // Initialize the analytics function and queue
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };
})();
