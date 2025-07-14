import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('WebGL Context Memory Tests', () => {
  it('should test canvas and WebGL context creation without Three.js', () => {
    console.log('Testing pure WebGL context creation...');
    
    // Test if we can import Three.js WebGLRenderer in Node
    try {
      const THREE = require('three');
      console.log('Three.js imported successfully in Node.js');
      
      // Try to create WebGLRenderer without canvas (should fail gracefully)
      try {
        const renderer = new THREE.WebGLRenderer();
        console.log('WebGLRenderer created without canvas - unexpected success');
        renderer.dispose();
      } catch (error) {
        console.log('WebGLRenderer creation failed without canvas (expected):', (error as Error).message);
      }
      
    } catch (error) {
      console.log('Three.js import failed:', (error as Error).message);
      throw error;
    }
  });

  it('should analyze memory usage patterns', () => {
    console.log('Testing memory patterns that might cause OOM...');
    
    // Test large array allocations (simulating vertex data)
    try {
      console.log('Creating large Float32Array (simulating vertex buffer)...');
      const largeArray = new Float32Array(1000000); // 4MB
      console.log('Large Float32Array created successfully');
      
      console.log('Creating multiple Float32Arrays...');
      const arrays = [];
      for (let i = 0; i < 100; i++) {
        arrays.push(new Float32Array(10000)); // 40KB each
      }
      console.log('100 Float32Arrays created successfully');
      
    } catch (error) {
      console.log('Array allocation failed:', (error as Error).message);
      throw error;
    }
  });

  it('should test if importing causes memory spike', () => {
    console.log('Testing memory usage before and after Three.js operations...');
    
    // Get initial memory if available
    if (process.memoryUsage) {
      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', {
        rss: `${Math.round(initialMemory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`
      });
      
      // Create many Three.js objects
      const THREE = require('three');
      const objects = [];
      
      for (let i = 0; i < 50; i++) {
        objects.push(new THREE.Scene());
        objects.push(new THREE.PerspectiveCamera());
        objects.push(new THREE.SphereGeometry(1, 32, 32));
        objects.push(new THREE.MeshBasicMaterial());
      }
      
      const afterMemory = process.memoryUsage();
      console.log('Memory after creating 200 Three.js objects:', {
        rss: `${Math.round(afterMemory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(afterMemory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(afterMemory.heapUsed / 1024 / 1024)}MB`
      });
      
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Cleanup
      objects.forEach(obj => {
        if (obj.dispose) obj.dispose();
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        const afterGC = process.memoryUsage();
        console.log('Memory after garbage collection:', {
          rss: `${Math.round(afterGC.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(afterGC.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(afterGC.heapUsed / 1024 / 1024)}MB`
        });
      }
    }
  });
});
