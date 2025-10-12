/**
 * Image Upload Browser Console Test
 * 
 * Copy and paste this into your browser console (F12) while on the Add Product page
 * This will test the image upload functionality step by step
 */

async function testImageUpload() {
  console.log('🧪 Starting Image Upload Diagnostic Test...\n');
  
  try {
    // Step 1: Check if required services are available
    console.log('Step 1: Checking services...');
    
    const { RobustImageService } = await import('./src/lib/robustImageService.ts');
    console.log('✅ RobustImageService loaded');
    
    const { supabase } = await import('./src/lib/supabaseClient.ts');
    console.log('✅ Supabase client loaded');
    
    // Step 2: Check authentication
    console.log('\nStep 2: Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      console.log('💡 Please log in first');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Step 3: Check storage bucket
    console.log('\nStep 3: Checking storage bucket...');
    
    try {
      const { data: listData, error: listError } = await supabase.storage
        .from('product-images')
        .list('', { limit: 1 });
      
      if (listError) {
        console.error('❌ Bucket access failed:', listError.message);
        console.log('💡 The "product-images" bucket may not exist or you don\'t have permission');
        console.log('   Create it in Supabase Dashboard → Storage');
      } else {
        console.log('✅ Storage bucket "product-images" is accessible');
      }
    } catch (storageError) {
      console.error('❌ Storage check failed:', storageError);
    }
    
    // Step 4: Check database table
    console.log('\nStep 4: Checking product_images table...');
    
    const { data: tableData, error: tableError } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table check failed:', tableError.message);
      console.log('💡 Run CREATE-PRODUCT-IMAGES-BUCKET.sql to create the table');
    } else {
      console.log('✅ product_images table exists');
      
      // Count existing images
      const { count } = await supabase
        .from('product_images')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   Current images in database: ${count || 0}`);
    }
    
    // Step 5: Test file validation
    console.log('\nStep 5: Testing file validation...');
    
    // Create a test file (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testBlob = await fetch(`data:image/png;base64,${testImageBase64}`).then(r => r.blob());
    const testFile = new File([testBlob], 'test-image.png', { type: 'image/png' });
    
    console.log('Created test file:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // Test upload (commented out by default - uncomment to actually upload)
    /*
    console.log('\nStep 6: Testing actual upload...');
    console.log('⚠️  This will create a test image in your database');
    
    const uploadResult = await RobustImageService.uploadImage(
      testFile,
      'test-product-' + Date.now(),
      user.id,
      true
    );
    
    if (uploadResult.success) {
      console.log('✅ Test upload SUCCESSFUL!');
      console.log('   Image:', uploadResult.image);
    } else {
      console.error('❌ Test upload FAILED:', uploadResult.error);
    }
    */
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\nIf you see errors above:');
    console.log('1. ❌ Bucket error → Create "product-images" bucket in Supabase');
    console.log('2. ❌ Table error → Run CREATE-PRODUCT-IMAGES-BUCKET.sql');
    console.log('3. ❌ Auth error → Log in to the app');
    
    console.log('\nIf everything shows ✅:');
    console.log('- Uncomment the test upload code (Step 6) and run again');
    console.log('- Or try uploading an image through the UI');
    
    console.log('\n✅ Diagnostic complete!\n');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    console.log('\n💡 Make sure you\'re on the Add Product page');
    console.log('💡 Check that all imports are available');
  }
}

// Auto-run the test
testImageUpload();

// Instructions
console.log('\n📋 INSTRUCTIONS:');
console.log('This script will test your image upload configuration.');
console.log('Run it by pasting this entire file into the browser console (F12).');
console.log('Make sure you are on the Add Product page first.\n');

