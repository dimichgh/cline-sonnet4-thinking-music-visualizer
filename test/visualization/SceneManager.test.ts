import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as THREE from 'three';

describe('Three.js Memory Isolation Tests', () => {

  describe('Three.js Core Components', () => {
    it('should create THREE.Scene without OOM', () => {
      console.log('Testing THREE.Scene creation...');
      const scene = new THREE.Scene();
      expect(scene).to.be.instanceOf(THREE.Scene);
      console.log('THREE.Scene created successfully');
    });

    it('should create THREE.PerspectiveCamera without OOM', () => {
      console.log('Testing THREE.PerspectiveCamera creation...');
      const camera = new THREE.PerspectiveCamera(75, 1.6, 0.1, 1000);
      expect(camera).to.be.instanceOf(THREE.PerspectiveCamera);
      console.log('THREE.PerspectiveCamera created successfully');
    });

    it('should create THREE.Color without OOM', () => {
      console.log('Testing THREE.Color creation...');
      const color = new THREE.Color(0x000000);
      expect(color).to.be.instanceOf(THREE.Color);
      console.log('THREE.Color created successfully');
    });

    it('should create basic THREE.SphereGeometry without OOM', () => {
      console.log('Testing THREE.SphereGeometry creation...');
      const geometry = new THREE.SphereGeometry(1, 8, 6);
      expect(geometry).to.be.instanceOf(THREE.SphereGeometry);
      console.log('THREE.SphereGeometry created successfully');
      
      // Dispose immediately
      geometry.dispose();
      console.log('THREE.SphereGeometry disposed');
    });

    it('should create THREE.MeshBasicMaterial without OOM', () => {
      console.log('Testing THREE.MeshBasicMaterial creation...');
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      expect(material).to.be.instanceOf(THREE.MeshBasicMaterial);
      console.log('THREE.MeshBasicMaterial created successfully');
      
      // Dispose immediately
      material.dispose();
      console.log('THREE.MeshBasicMaterial disposed');
    });
  });


  describe('Complex Geometry Tests', () => {
    it('should create THREE.IcosahedronGeometry without OOM', () => {
      console.log('Testing THREE.IcosahedronGeometry creation...');
      
      // Test with minimal subdivisions first
      const geometry1 = new THREE.IcosahedronGeometry(1, 0);
      expect(geometry1).to.be.instanceOf(THREE.IcosahedronGeometry);
      console.log('IcosahedronGeometry (subdivisions: 0) created successfully');
      geometry1.dispose();
      
      // Test with 1 subdivision
      const geometry2 = new THREE.IcosahedronGeometry(1, 1);
      expect(geometry2).to.be.instanceOf(THREE.IcosahedronGeometry);
      console.log('IcosahedronGeometry (subdivisions: 1) created successfully');
      geometry2.dispose();
      
      // Test with 2 subdivisions (this might be where OOM happens)
      try {
        const geometry3 = new THREE.IcosahedronGeometry(1, 2);
        expect(geometry3).to.be.instanceOf(THREE.IcosahedronGeometry);
        console.log('IcosahedronGeometry (subdivisions: 2) created successfully');
        geometry3.dispose();
      } catch (error) {
        console.log('IcosahedronGeometry (subdivisions: 2) failed:', (error as Error).message);
        throw error;
      }
    });

    it('should create multiple geometries in sequence', () => {
      console.log('Testing multiple geometry creation...');
      
      const geometries: THREE.SphereGeometry[] = [];
      try {
        for (let i = 0; i < 10; i++) {
          console.log(`Creating geometry ${i + 1}/10...`);
          const geom = new THREE.SphereGeometry(1, 8, 6);
          geometries.push(geom);
        }
        
        console.log('All 10 geometries created successfully');
        
        // Dispose all
        geometries.forEach((geom, index) => {
          geom.dispose();
          console.log(`Disposed geometry ${index + 1}/10`);
        });
        
      } catch (error) {
        console.log('Multiple geometry creation failed at geometry:', geometries.length + 1);
        // Cleanup
        geometries.forEach(geom => geom.dispose());
        throw error;
      }
    });
  });

  describe('Memory Stress Tests', () => {
    it('should test extensive geometry creation to find memory limit', () => {
      console.log('Testing extensive geometry creation...');
      
      const geometries: THREE.BufferGeometry[] = [];
      let createdCount = 0;
      
      try {
        // Try creating many geometries to see where memory fails
        for (let i = 0; i < 100; i++) {
          console.log(`Creating complex geometry ${i + 1}/100...`);
          
          // Create increasingly complex geometries
          const radius = 1;
          const widthSegments = Math.min(32, 8 + i);
          const heightSegments = Math.min(32, 8 + i);
          
          const geom = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
          geometries.push(geom);
          createdCount++;
          
          // Check memory usage periodically
          if (i % 10 === 0) {
            console.log(`Memory checkpoint at geometry ${i + 1}: ${geometries.length} geometries created`);
          }
        }
        
        console.log(`Successfully created ${createdCount} complex geometries`);
        
      } catch (error) {
        console.log(`Memory test failed after creating ${createdCount} geometries:`, (error as Error).message);
      } finally {
        // Cleanup all created geometries
        console.log(`Cleaning up ${geometries.length} geometries...`);
        geometries.forEach((geom, index) => {
          geom.dispose();
          if (index % 10 === 0) {
            console.log(`Disposed ${index + 1}/${geometries.length} geometries`);
          }
        });
        console.log('All geometries disposed');
      }
    });
  });
});
