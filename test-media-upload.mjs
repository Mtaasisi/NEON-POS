/**
 * Test script for WhatsApp media upload
 * Tests the /api/whatsapp/upload-media endpoint
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:8000/api/whatsapp/upload-media';
const API_KEY = 'f864609fa10f4062f5ce346b1bfe830ae49ca286226e0462c65b1a550b2a29d2';

// Create a small test image (1x1 PNG)
const createTestImage = () => {
  // Minimal PNG file (1x1 pixel, red color)
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
};

async function testUpload() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           WHATSAPP MEDIA UPLOAD TEST                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Create test image
    const testImageBuffer = createTestImage();
    console.log('✅ Created test image');
    console.log('   Size:', testImageBuffer.length, 'bytes');
    console.log('   Type: image/png');
    console.log('');

    // Create form data
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png',
      knownLength: testImageBuffer.length
    });

    console.log('📤 Uploading to:', API_URL);
    console.log('🔑 Using API key:', API_KEY.substring(0, 20) + '...');
    console.log('');

    // Send request
    const startTime = Date.now();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    const duration = Date.now() - startTime;

    console.log('📡 Response received in', duration, 'ms');
    console.log('   Status:', response.status, response.statusText);
    console.log('');

    // Parse response
    const responseText = await response.text();
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ UPLOAD SUCCESSFUL!');
      console.log('');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
      
      if (result.url) {
        console.log('');
        console.log('🎉 Media URL:', result.url);
      }
    } else {
      console.log('❌ UPLOAD FAILED');
      console.log('');
      console.log('Error response:', responseText);
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('');
        console.log('Parsed error:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        // Response is not JSON
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    
    process.exit(response.ok ? 0 : 1);

  } catch (error) {
    console.log('');
    console.log('❌ TEST FAILED WITH EXCEPTION');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('Stack trace:');
    console.log(error.stack);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Run the test
testUpload();

