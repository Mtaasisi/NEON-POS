// Paste this in your browser console to debug 400 errors
// This will intercept Neon API calls and log the failing queries

(function() {
  console.log('🔍 Starting 400 Error Debugger...');
  
  // Store the original fetch
  const originalFetch = window.fetch;
  
  // Override fetch to intercept Neon API calls
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Only intercept Neon SQL API calls
    if (url && url.includes('neon.tech/sql')) {
      console.log('📤 Neon SQL Request:', {
        url: url,
        method: options?.method || 'GET',
        body: options?.body || 'No body'
      });
      
      try {
        // Try to parse the SQL query from the body
        if (options?.body) {
          try {
            const parsedBody = JSON.parse(options.body);
            console.log('📝 SQL Query:', parsedBody.query || parsedBody);
            console.log('📝 Parameters:', parsedBody.params || 'None');
          } catch (e) {
            console.log('📝 Body:', options.body);
          }
        }
      } catch (e) {
        console.error('Error parsing request:', e);
      }
    }
    
    // Make the actual fetch call
    const response = await originalFetch.apply(this, args);
    
    // If it's a Neon call and it failed
    if (url && url.includes('neon.tech/sql') && !response.ok) {
      console.error('❌ Neon SQL Request Failed!', {
        status: response.status,
        statusText: response.statusText,
        url: url
      });
      
      // Try to read the error response
      try {
        const errorData = await response.clone().text();
        console.error('❌ Error Response:', errorData);
      } catch (e) {
        console.error('Could not read error response');
      }
    }
    
    return response;
  };
  
  console.log('✅ 400 Error Debugger Active - All Neon requests will be logged');
  console.log('💡 Trigger the error now, and check the logs above for the failing query');
})();

