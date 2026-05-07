// Vercel Web Analytics initialization script
// This initializes the analytics queue and loads the analytics script
// Based on: https://vercel.com/docs/analytics/quickstart

// Initialize the analytics queue
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Load the Vercel Analytics script
(function() {
  var script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cdn.vercel-insights.com/v1/script.js';
  document.head.appendChild(script);
})();
