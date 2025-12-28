/**
 * Tests for Image Cleanup Functionality
 * Verifies that large base64 images are properly handled
 */

import { emergencyUrlCleanup } from '../../features/lats/lib/imageUtils';

describe('Image Cleanup - HTTP 431 Prevention', () => {
  
  test('should replace large base64 images with placeholder', () => {
    // Create a large base64 image (>10KB)
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(15000);
    
    const result = emergencyUrlCleanup(largeBase64);
    
    // Should return a small SVG placeholder instead
    expect(result).toContain('data:image/svg+xml');
    expect(result.length).toBeLessThan(1000);
    expect(result).not.toEqual(largeBase64);
  });

  test('should keep small base64 images unchanged', () => {
    // Create a small base64 image (<10KB)
    const smallBase64 = 'data:image/png;base64,' + 'A'.repeat(5000);
    
    const result = emergencyUrlCleanup(smallBase64);
    
    // Should keep original image
    expect(result).toEqual(smallBase64);
  });

  test('should keep regular URLs unchanged', () => {
    const regularUrl = 'https://example.com/image.jpg';
    
    const result = emergencyUrlCleanup(regularUrl);
    
    expect(result).toEqual(regularUrl);
  });

  test('should handle extremely long non-data URLs', () => {
    // Create an extremely long URL (>2KB)
    const longUrl = 'https://example.com/' + 'path/'.repeat(500);
    
    const result = emergencyUrlCleanup(longUrl);
    
    // Should return placeholder for safety
    expect(result).toContain('data:image/svg+xml');
    expect(result.length).toBeLessThan(1000);
  });

  test('should handle null/undefined gracefully', () => {
    expect(emergencyUrlCleanup('')).toContain('data:image/svg+xml');
    expect(emergencyUrlCleanup(null as any)).toContain('data:image/svg+xml');
    expect(emergencyUrlCleanup(undefined as any)).toContain('data:image/svg+xml');
  });

  test('boundary test: exactly 10KB should pass', () => {
    // Create a base64 image of exactly 10,000 chars (10KB)
    const exactlyTenKB = 'data:image/png;base64,' + 'A'.repeat(9979); // +21 for prefix = 10000
    
    const result = emergencyUrlCleanup(exactlyTenKB);
    
    // Should keep it (not over limit)
    expect(result).toEqual(exactlyTenKB);
  });

  test('boundary test: 10KB + 1 should be replaced', () => {
    // Create a base64 image of 10,001 chars (just over limit)
    const overTenKB = 'data:image/png;base64,' + 'A'.repeat(9980); // +21 for prefix = 10001
    
    const result = emergencyUrlCleanup(overTenKB);
    
    // Should be replaced with placeholder
    expect(result).toContain('data:image/svg+xml');
    expect(result).not.toEqual(overTenKB);
  });

  test('should log warning for large images', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(50000);
    emergencyUrlCleanup(largeBase64);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Replacing large base64 image')
    );
    
    consoleWarnSpy.mockRestore();
  });

  test('performance: should handle 100 large images quickly', () => {
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(50000);
    
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      emergencyUrlCleanup(largeBase64);
    }
    const duration = Date.now() - start;
    
    // Should process 100 images in under 100ms
    expect(duration).toBeLessThan(100);
  });
});

describe('Real-World Scenarios', () => {
  
  test('scenario: Product[5] with 100KB image', () => {
    // Simulate the actual issue from console logs
    const product5Image = 'data:image/png;base64,' + 'A'.repeat(100299);
    
    const result = emergencyUrlCleanup(product5Image);
    
    expect(result).toContain('data:image/svg+xml');
    expect(result.length).toBeLessThan(1000);
  });

  test('scenario: Product[43] with 65KB image', () => {
    const product43Image = 'data:image/png;base64,' + 'A'.repeat(65847);
    
    const result = emergencyUrlCleanup(product43Image);
    
    expect(result).toContain('data:image/svg+xml');
  });

  test('scenario: Product[74] with 45KB image', () => {
    const product74Image = 'data:image/png;base64,' + 'A'.repeat(45495);
    
    const result = emergencyUrlCleanup(product74Image);
    
    expect(result).toContain('data:image/svg+xml');
  });

  test('scenario: Normal product with external URL', () => {
    const normalProduct = 'https://example.com/products/shoe.jpg';
    
    const result = emergencyUrlCleanup(normalProduct);
    
    // Should remain unchanged
    expect(result).toEqual(normalProduct);
  });

  test('scenario: Compressed base64 thumbnail (5KB)', () => {
    const thumbnail = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
    
    const result = emergencyUrlCleanup(thumbnail);
    
    // Should remain unchanged (under 10KB limit)
    expect(result).toEqual(thumbnail);
  });
});

