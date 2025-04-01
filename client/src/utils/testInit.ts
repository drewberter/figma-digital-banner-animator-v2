/**
 * Test Initialization Module
 * 
 * This file adds testing utilities to the global window object
 * to enable easy debugging and testing from the browser console.
 */

import { runLayerLinkingTests } from './layerLinkingTest';
import { LinkRegistry } from './linkRegistryInterfaces';
import { linkRegistry } from './linkRegistry';
import { 
  syncLayersByName, 
  resetLayerLinkData, 
  buildDirectLinkTable,
  findLayerById,
  testLayerLinking
} from './directLayerLinking-fixed';
import { runVisibilityTests } from './visibility-test';
import {
  runCrossModeTests,
  testAnimationModeLayerLinking,
  testGifModeLayerLinking,
  testVisibilityTogglePropagation,
  testLayerOverrideFunctionality
} from './crossModeTestUtils';
import {
  testNestedLayerHierarchy,
  testBackgroundLayerHandling,
  runSpecialLayerTests
} from './specialLayerTests';
import { runAutomatedTestAndFix } from './automatedTestAndFix';

// Interface to extend the Window object type
declare global {
  interface Window {
    // Test utilities
    runLayerLinkingTests: typeof runLayerLinkingTests;
    runVisibilityTests: typeof runVisibilityTests;
    testLayerLinking: typeof testLayerLinking;
    __DEBUG_LINK_REGISTRY__: LinkRegistry;
    
    // Cross-mode testing utilities
    runCrossModeTests: typeof runCrossModeTests;
    testAnimationModeLayerLinking: typeof testAnimationModeLayerLinking;
    testGifModeLayerLinking: typeof testGifModeLayerLinking;
    testVisibilityTogglePropagation: typeof testVisibilityTogglePropagation;
    testLayerOverrideFunctionality: typeof testLayerOverrideFunctionality;
    
    // Special layer testing utilities
    testNestedLayerHierarchy: typeof testNestedLayerHierarchy;
    testBackgroundLayerHandling: typeof testBackgroundLayerHandling;
    runSpecialLayerTests: typeof runSpecialLayerTests;
    
    // Automated test and fix system
    runAutomatedTestAndFix: typeof runAutomatedTestAndFix;
    __TEST_REPORT__: any;
    
    // Layer linking utilities
    syncLayersByName: typeof syncLayersByName;
    resetLayerLinkData: typeof resetLayerLinkData;
    buildDirectLinkTable: typeof buildDirectLinkTable;
    findLayerById: typeof findLayerById;
    
    // Debug functions
    debugLinkRegistry: () => void;
    debugLayerLinks: (layerName: string) => void;
    analyzeGroupIdGeneration: (names: string[]) => void;
  }
}

/**
 * Initialize test utilities and add them to window object
 */
export function initializeTestUtilities(): void {
  if (typeof window === 'undefined') return;

  // Add test runners
  window.runLayerLinkingTests = runLayerLinkingTests;
  window.runVisibilityTests = runVisibilityTests;
  window.testLayerLinking = testLayerLinking;
  
  // Add cross-mode test utilities
  window.runCrossModeTests = runCrossModeTests;
  window.testAnimationModeLayerLinking = testAnimationModeLayerLinking;
  window.testGifModeLayerLinking = testGifModeLayerLinking;
  window.testVisibilityTogglePropagation = testVisibilityTogglePropagation;
  window.testLayerOverrideFunctionality = testLayerOverrideFunctionality;
  
  // Add special layer test utilities
  window.testNestedLayerHierarchy = testNestedLayerHierarchy;
  window.testBackgroundLayerHandling = testBackgroundLayerHandling;
  window.runSpecialLayerTests = runSpecialLayerTests;
  
  // Add automated test and fix system
  window.runAutomatedTestAndFix = runAutomatedTestAndFix;

  // Create a debug registry instance
  window.__DEBUG_LINK_REGISTRY__ = new LinkRegistry();

  // Add layer linking utilities
  window.syncLayersByName = syncLayersByName;
  window.resetLayerLinkData = resetLayerLinkData;
  window.buildDirectLinkTable = buildDirectLinkTable;
  window.findLayerById = findLayerById;

  // Add debug functions
  window.debugLinkRegistry = () => {
    console.group('Link Registry Debug Information');
    console.log('Groups:', window.__DEBUG_LINK_REGISTRY__.getDebugGroups());
    console.log('Layer to group mapping:', window.__DEBUG_LINK_REGISTRY__.getDebugLayerMap());
    console.groupEnd();
  };

  window.debugLayerLinks = (layerName: string) => {
    console.group(`Layer Links for "${layerName}"`);
    
    // Create test layer
    const testLayer = { name: layerName.toLowerCase() };
    
    // Generate deterministic ID using the same algorithm
    const layerHash = testLayer.name.split('').reduce(
      (hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 
      0
    );
    const seedValue = Math.abs(layerHash % 1000);
    
    console.log('Layer information:');
    console.log('- Name:', testLayer.name);
    console.log('- Hash:', layerHash);
    console.log('- Seed value:', seedValue);
    
    // Generate the expected group IDs for both modes
    const animationGroupId = `link-group-${layerHash}-${seedValue}a`;
    const gifGroupId = `link-group-${layerHash}-${seedValue}g`;
    
    console.log('\nExpected group IDs:');
    console.log('- Animation mode:', animationGroupId);
    console.log('- GIF mode:', gifGroupId);
    
    // Check if these groups exist in the registry
    const registry = window.__DEBUG_LINK_REGISTRY__;
    const groups = registry.getDebugGroups();
    
    const animGroup = Object.values(groups).find(g => g.id === animationGroupId);
    const gifGroup = Object.values(groups).find(g => g.id === gifGroupId);
    
    console.log('\nRegistry check:');
    console.log('- Animation group exists:', !!animGroup);
    if (animGroup) {
      console.log('  * Group:', animGroup);
    }
    
    console.log('- GIF group exists:', !!gifGroup);
    if (gifGroup) {
      console.log('  * Group:', gifGroup);
    }
    
    // Try to find other groups with the same name
    const nameMatchGroups = Object.values(groups).filter(g => g.name.toLowerCase() === testLayer.name);
    if (nameMatchGroups.length > 0) {
      console.log('\nOther groups with this name:');
      nameMatchGroups.forEach(g => {
        console.log('- Group ID:', g.id);
        console.log('  * Mode:', g.mode);
        console.log('  * Main layer:', g.mainLayerId);
        console.log('  * Layer count:', g.layerIds.length);
      });
    } else {
      console.log('\nNo other groups found with this name.');
    }
    
    console.groupEnd();
  };

  window.analyzeGroupIdGeneration = (names: string[]) => {
    console.group('Group ID Generation Analysis');
    
    const results: Record<string, { name: string, hash: number, seed: number, animId: string, gifId: string }> = {};
    
    names.forEach(name => {
      const normalizedName = name.toLowerCase();
      const layerHash = normalizedName.split('').reduce(
        (hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 
        0
      );
      const seedValue = Math.abs(layerHash % 1000);
      const animationGroupId = `link-group-${layerHash}-${seedValue}a`;
      const gifGroupId = `link-group-${layerHash}-${seedValue}g`;
      
      results[normalizedName] = {
        name: normalizedName,
        hash: layerHash,
        seed: seedValue,
        animId: animationGroupId,
        gifId: gifGroupId
      };
    });
    
    console.table(results);
    console.groupEnd();
  };

  console.log('🧪 Test utilities initialized. Available commands:');
  console.log('- window.runLayerLinkingTests() - Run full layer linking test suite');
  console.log('- window.runVisibilityTests() - Run tests for visibility state management functions');
  console.log('- window.testLayerLinking("layer name") - Analyze layer linking for a specific layer');
  console.log('');
  console.log('📊 Cross-mode testing utilities:');
  console.log('- window.runCrossModeTests() - Run all cross-mode tests');
  console.log('- window.testAnimationModeLayerLinking() - Test animation mode layer linking');
  console.log('- window.testGifModeLayerLinking() - Test GIF mode layer linking');
  console.log('- window.testVisibilityTogglePropagation() - Test visibility toggle propagation');
  console.log('- window.testLayerOverrideFunctionality() - Test layer override functionality');
  console.log('');
  console.log('🧩 Special layer testing utilities:');
  console.log('- window.testNestedLayerHierarchy() - Test nested layer visibility propagation');
  console.log('- window.testBackgroundLayerHandling() - Test background layer special handling');
  console.log('- window.runSpecialLayerTests() - Run all special layer tests');
  console.log('');
  console.log('🤖 Automated test and fix system:');
  console.log('- window.runAutomatedTestAndFix() - Run full test suite, diagnose and fix issues automatically');
  console.log('');
  console.log('🔍 Debug utilities:');
  console.log('- window.debugLinkRegistry() - Inspect the current link registry state');
  console.log('- window.debugLayerLinks("layer name") - Debug layer links for a specific layer name');
  console.log('- window.analyzeGroupIdGeneration(["name1", "name2", ...]) - Analyze group ID generation');
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  initializeTestUtilities();
}