// Enhanced 400 Error Debugger - Paste in browser console
// This intercepts at a lower level to catch all Neon queries

(function() {
  console.log('🔍 Enhanced 400 Error Debugger Starting...');
  console.log('⚠️  Make sure to do a HARD REFRESH (Ctrl+Shift+R) first!');
  
  // Store the original fetch
  const originalFetch = window.fetch;
  
  // Counter for requests
  let requestCount = 0;
  
  // Override fetch globally
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Check if this is a Neon SQL API call
    if (url && typeof url === 'string' && url.includes('neon.tech/sql')) {
      requestCount++;
      const reqId = requestCount;
      
      console.log(`\n📤 [Request #${reqId}] Neon SQL Request Intercepted`);
      console.log(`🔗 URL: ${url}`);
      console.log(`⚙️  Method: ${options?.method || 'GET'}`);
      
      // Try multiple ways to extract the SQL query
      if (options?.body) {
        console.log(`📦 Raw Body Type: ${typeof options.body}`);
        console.log(`📦 Raw Body:`, options.body);
        
        try {
          // Try parsing as JSON
          const parsedBody = JSON.parse(options.body);
          console.log(`📝 Parsed Body:`, parsedBody);
          
          if (parsedBody.query) {
            console.log(`✅ SQL Query Found:`, parsedBody.query);
          }
          if (parsedBody.params) {
            console.log(`✅ Parameters:`, parsedBody.params);
          }
        } catch (parseError) {
          console.log(`⚠️  Could not parse body as JSON:`, parseError.message);
        }
      } else {
        console.log(`⚠️  No body in request`);
      }
    }
    
    // Make the actual fetch call
    let response;
    try {
      response = await originalFetch.apply(this, args);
    } catch (fetchError) {
      console.error(`❌ Fetch itself failed:`, fetchError);
      throw fetchError;
    }
    
    // Check if it's a Neon call that failed
    if (url && typeof url === 'string' && url.includes('neon.tech/sql')) {
      if (!response.ok) {
        console.error(`\n❌ [Request #${requestCount}] Neon SQL Request FAILED!`);
        console.error(`📊 Status: ${response.status} ${response.statusText}`);
        console.error(`🔗 URL: ${url}`);
        
        // Try to read the error response
        try {
          const errorClone = response.clone();
          const errorText = await errorClone.text();
          console.error(`📄 Error Response Body:`, errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            console.error(`📄 Error Response JSON:`, errorJson);
          } catch (e) {
            // Not JSON, that's ok
          }
        } catch (readError) {
          console.error(`⚠️  Could not read error response:`, readError);
        }
        
        // Log stack trace to see where this is being called from
        console.error(`📍 Error originated from:`, new Error().stack);
      } else {
        console.log(`✅ [Request #${requestCount}] Success (${response.status})`);
      }
    }
    
    return response;
  };
  
  console.log('\n✅ Enhanced 400 Error Debugger Active!');
  console.log('📋 This will log ALL Neon database requests with full details');
  console.log('💡 Now trigger the error and watch the console\n');
})();

