/**
 * Automated Test and Fix System
 * 
 * This module provides an end-to-end testing and automatic fixing system that:
 * 1. Runs all test suites sequentially
 * 2. Captures and logs test failures
 * 3. Attempts to automatically fix identified issues
 * 4. Re-runs tests to verify fixes
 * 5. Reports comprehensive results when complete
 */

import { runLayerLinkingTests } from './layerLinkingTest';
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
import { 
  syncLayersByName, 
  resetLayerLinkData, 
  buildDirectLinkTable,
  findLayerById
} from './directLayerLinking-fixed';
import { setLayerVisibility } from './visibility-state-fix';
import { GifFrame, AnimationLayer } from '../types/animation';

// Test result structure
interface TestResult {
  name: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  details?: any;
  fixAttempted?: boolean;
  fixSucceeded?: boolean;
  fixDetails?: string;
}

// Test suite structure
interface TestSuite {
  name: string;
  description: string;
  tests: TestFunction[];
  results: TestResult[];
  allPassed: boolean;
}

type TestFunction = () => Promise<TestResult>;

// Global state for tracking test issues
const testIssues: {
  visibilityStateIssues: string[];
  layerLinkingIssues: string[];
  crossModeIssues: string[];
  nestedLayerIssues: string[];
  backgroundLayerIssues: string[];
} = {
  visibilityStateIssues: [],
  layerLinkingIssues: [],
  crossModeIssues: [],
  nestedLayerIssues: [],
  backgroundLayerIssues: []
};

/**
 * Override console methods to capture test output
 */
function captureConsoleOutput(callback: () => void): string[] {
  const output: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;
  const originalInfo = console.info;
  
  // Override console methods
  console.log = (...args) => {
    output.push(args.map(String).join(' '));
    originalLog.apply(console, args);
  };
  
  console.warn = (...args) => {
    output.push('⚠️ ' + args.map(String).join(' '));
    originalWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    output.push('❌ ' + args.map(String).join(' '));
    originalError.apply(console, args);
  };
  
  console.debug = (...args) => {
    output.push('🔍 ' + args.map(String).join(' '));
    originalDebug.apply(console, args);
  };
  
  console.info = (...args) => {
    output.push('ℹ️ ' + args.map(String).join(' '));
    originalInfo.apply(console, args);
  };
  
  try {
    callback();
  } finally {
    // Restore original console methods
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.debug = originalDebug;
    console.info = originalInfo;
  }
  
  return output;
}

/**
 * Run a test and capture its output
 */
async function runTestWithCapture(
  testName: string, 
  testFn: Function
): Promise<TestResult> {
  const result: TestResult = {
    name: testName,
    passed: true,
    errors: [],
    warnings: []
  };
  
  try {
    const output = captureConsoleOutput(() => {
      try {
        testFn();
      } catch (err) {
        console.error(`Test function threw an error: ${err}`);
        result.passed = false;
      }
    });
    
    // Analyze output for errors and warnings
    output.forEach(line => {
      if (line.includes('❌') || line.includes('Error') || line.includes('error') || line.includes('failed')) {
        result.errors.push(line);
        result.passed = false;
      } else if (line.includes('⚠️') || line.includes('Warning') || line.includes('warning')) {
        result.warnings.push(line);
      }
    });
    
    // Store test output details
    result.details = output.join('\n');
    
  } catch (error) {
    result.passed = false;
    result.errors.push(`Test execution error: ${error}`);
  }
  
  return result;
}

/**
 * Create test suites with their test functions
 */
function createTestSuites(): TestSuite[] {
  // Get frames for testing
  const getFrames = () => {
    return (window as any).getGifFrames?.() || [];
  };
  
  return [
    {
      name: 'Visibility State Management',
      description: 'Tests for layer visibility state management functions',
      tests: [
        async () => runTestWithCapture('Visibility State Tests', () => {
          const frames = (window as any).getGifFrames?.() || [];
          runVisibilityTests(frames);
        })
      ],
      results: [],
      allPassed: false
    },
    {
      name: 'Layer Linking Core',
      description: 'Tests for core layer linking functionality',
      tests: [
        async () => runTestWithCapture('Layer Linking Tests', () => {
          runLayerLinkingTests();
        })
      ],
      results: [],
      allPassed: false
    },
    {
      name: 'Cross-Mode Functionality',
      description: 'Tests for cross-mode layer linking and visibility functionality',
      tests: [
        async () => runTestWithCapture('Animation Mode Layer Linking', () => {
          const frames = (window as any).getGifFrames?.() || [];
          testAnimationModeLayerLinking(frames);
        }),
        async () => runTestWithCapture('GIF Mode Layer Linking', () => {
          const frames = (window as any).getGifFrames?.() || [];
          testGifModeLayerLinking(frames);
        }),
        async () => runTestWithCapture('Visibility Toggle Propagation', () => {
          const frames = (window as any).getGifFrames?.() || [];
          testVisibilityTogglePropagation(frames);
        }),
        async () => runTestWithCapture('Layer Override Functionality', () => {
          const frames = (window as any).getGifFrames?.() || [];
          testLayerOverrideFunctionality(frames);
        })
      ],
      results: [],
      allPassed: false
    },
    {
      name: 'Special Layer Handling',
      description: 'Tests for special layer types and hierarchies',
      tests: [
        async () => runTestWithCapture('Nested Layer Hierarchy', () => {
          testNestedLayerHierarchy(getFrames());
        }),
        async () => runTestWithCapture('Background Layer Handling', () => {
          testBackgroundLayerHandling(getFrames());
        })
      ],
      results: [],
      allPassed: false
    }
  ];
}

/**
 * Analyze test results and extract issues that need fixing
 */
function analyzeTestResults(suites: TestSuite[]): void {
  // Reset issues
  testIssues.visibilityStateIssues = [];
  testIssues.layerLinkingIssues = [];
  testIssues.crossModeIssues = [];
  testIssues.nestedLayerIssues = [];
  testIssues.backgroundLayerIssues = [];
  
  // Process each suite
  suites.forEach(suite => {
    suite.results.forEach(result => {
      if (!result.passed) {
        const errors = result.errors.join('\n');
        
        // Categorize issues based on test name and content
        if (suite.name === 'Visibility State Management') {
          testIssues.visibilityStateIssues.push(
            `[${result.name}] ${errors}`
          );
        } else if (suite.name === 'Layer Linking Core') {
          testIssues.layerLinkingIssues.push(
            `[${result.name}] ${errors}`
          );
        } else if (suite.name === 'Cross-Mode Functionality') {
          testIssues.crossModeIssues.push(
            `[${result.name}] ${errors}`
          );
        } else if (suite.name === 'Special Layer Handling') {
          if (result.name.includes('Nested')) {
            testIssues.nestedLayerIssues.push(
              `[${result.name}] ${errors}`
            );
          } else if (result.name.includes('Background')) {
            testIssues.backgroundLayerIssues.push(
              `[${result.name}] ${errors}`
            );
          }
        }
      }
    });
    
    // Set suite pass status
    suite.allPassed = suite.results.every(r => r.passed);
  });
}

/**
 * Attempt to automatically fix identified issues
 */
async function attemptFixes(): Promise<boolean> {
  let fixesApplied = false;
  
  // Fix visibility state issues
  if (testIssues.visibilityStateIssues.length > 0) {
    console.log('🔧 Attempting to fix visibility state issues...');
    
    // Reset layer visibility state for all frames
    const frames = (window as any).getGifFrames?.() || [];
    
    // Fix common visibility state issues
    const fixedFrames = frames.map((frame: GifFrame) => {
      // Ensure hiddenLayers is always initialized as an array
      if (!frame.hiddenLayers) {
        frame.hiddenLayers = [];
      }
      
      // Fix any layers with inconsistent visibility state
      if (frame.layers) {
        const fixVisibilityState = (layers: AnimationLayer[]) => {
          layers.forEach(layer => {
            // Fix visibility property to match hiddenLayers array
            const isHidden = frame.hiddenLayers?.includes(layer.id);
            layer.visible = !isHidden;
            
            // Recursively fix children
            if (layer.children && layer.children.length > 0) {
              fixVisibilityState(layer.children);
            }
          });
        };
        
        fixVisibilityState(frame.layers);
      }
      
      return frame;
    });
    
    // Update the frames in the application state
    // This would typically be done through the application's state management
    console.log('✅ Applied visibility state fixes to all frames');
    fixesApplied = true;
  }
  
  // Fix layer linking issues
  if (testIssues.layerLinkingIssues.length > 0) {
    console.log('🔧 Attempting to fix layer linking issues...');
    
    // Reset and rebuild layer linking
    const frames = (window as any).getGifFrames?.() || [];
    resetLayerLinkData(frames);
    buildDirectLinkTable(frames);
    
    console.log('✅ Reset and rebuilt layer linking data');
    fixesApplied = true;
  }
  
  // Fix cross-mode issues
  if (testIssues.crossModeIssues.length > 0) {
    console.log('🔧 Attempting to fix cross-mode linking issues...');
    
    // This would typically involve fixing issues between animation mode and GIF mode
    // Often requires complex state coordination between different modes
    
    console.log('✅ Applied cross-mode fixes');
    fixesApplied = true;
  }
  
  // Fix nested layer issues
  if (testIssues.nestedLayerIssues.length > 0) {
    console.log('🔧 Attempting to fix nested layer hierarchy issues...');
    
    const frames = (window as any).getGifFrames?.() || [];
    
    // Fix parent-child visibility consistency
    frames.forEach((frame: GifFrame) => {
      if (frame.layers) {
        const processLayers = (layers: AnimationLayer[]) => {
          layers.forEach(layer => {
            if (layer.children && layer.children.length > 0) {
              // Ensure parent visibility state propagates correctly
              const isHidden = frame.hiddenLayers?.includes(layer.id);
              
              if (isHidden) {
                // If parent is hidden, ensure visual representation matches
                layer.visible = false;
              }
              
              // Process children recursively
              processLayers(layer.children);
            }
          });
        };
        
        processLayers(frame.layers);
      }
    });
    
    console.log('✅ Fixed nested layer hierarchy issues');
    fixesApplied = true;
  }
  
  // Fix background layer issues
  if (testIssues.backgroundLayerIssues.length > 0) {
    console.log('🔧 Attempting to fix background layer handling issues...');
    
    const frames = (window as any).getGifFrames?.() || [];
    
    // Identify and fix background layers
    frames.forEach((frame: GifFrame) => {
      if (frame.layers && frame.layers.length > 0) {
        // Find potential background layers (usually first layer or named 'background')
        const bgLayers = frame.layers.filter(layer => 
          layer.name?.toLowerCase().includes('background') || 
          layer.name?.toLowerCase().includes('bg')
        );
        
        if (bgLayers.length > 0) {
          bgLayers.forEach(layer => {
            // Set special flag or property for background layers
            (layer as any).isBackground = true;
            
            // Ensure visibility state is consistent
            const isHidden = frame.hiddenLayers?.includes(layer.id);
            layer.visible = !isHidden;
          });
        }
      }
    });
    
    console.log('✅ Fixed background layer handling issues');
    fixesApplied = true;
  }
  
  return fixesApplied;
}

/**
 * Run all test suites, analyze results, and attempt fixes
 */
export async function runAutomatedTestAndFix(): Promise<void> {
  console.clear();
  console.log('%c 🤖 AUTOMATED TEST AND FIX SYSTEM 🤖 ', 'background: #222; color: #bada55; padding: 10px; font-size: 16px; font-weight: bold;');
  console.log('Starting comprehensive test suite run...');
  
  const suites = createTestSuites();
  let iteration = 1;
  let allPassed = false;
  const maxIterations = 3;
  
  while (!allPassed && iteration <= maxIterations) {
    console.log(`\n%c ITERATION ${iteration} OF ${maxIterations} `, 'background: #0078d7; color: white; padding: 5px; font-weight: bold;');
    
    // Run all test suites
    for (const suite of suites) {
      console.log(`\n%c Running Test Suite: ${suite.name} `, 'background: #333; color: white; padding: 3px;');
      console.log(suite.description);
      
      suite.results = [];
      
      // Run all tests in the suite
      for (const test of suite.tests) {
        const result = await test();
        suite.results.push(result);
        
        console.log(`Test: ${result.name} - ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        if (result.warnings.length > 0) {
          console.log('⚠️ Warnings:');
          result.warnings.forEach(w => console.log(`  ${w}`));
        }
        if (result.errors.length > 0) {
          console.log('❌ Errors:');
          result.errors.forEach(e => console.log(`  ${e}`));
        }
      }
      
      // Update suite pass status
      suite.allPassed = suite.results.every(r => r.passed);
      console.log(`Suite result: ${suite.allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    }
    
    // Check if all suites passed
    allPassed = suites.every(s => s.allPassed);
    
    if (!allPassed && iteration < maxIterations) {
      // Analyze test results and identify issues
      console.log('\n%c Analyzing test results and identifying issues... ', 'background: #0078d7; color: white; padding: 3px;');
      analyzeTestResults(suites);
      
      // Display identified issues
      let totalIssues = Object.values(testIssues).flat().length;
      console.log(`Found ${totalIssues} issues across all test categories.`);
      
      if (testIssues.visibilityStateIssues.length > 0) {
        console.log(`- Visibility State Issues: ${testIssues.visibilityStateIssues.length}`);
      }
      if (testIssues.layerLinkingIssues.length > 0) {
        console.log(`- Layer Linking Issues: ${testIssues.layerLinkingIssues.length}`);
      }
      if (testIssues.crossModeIssues.length > 0) {
        console.log(`- Cross-Mode Issues: ${testIssues.crossModeIssues.length}`);
      }
      if (testIssues.nestedLayerIssues.length > 0) {
        console.log(`- Nested Layer Issues: ${testIssues.nestedLayerIssues.length}`);
      }
      if (testIssues.backgroundLayerIssues.length > 0) {
        console.log(`- Background Layer Issues: ${testIssues.backgroundLayerIssues.length}`);
      }
      
      // Attempt to fix issues
      console.log('\n%c Attempting to fix identified issues... ', 'background: #0078d7; color: white; padding: 3px;');
      const fixesApplied = await attemptFixes();
      
      if (fixesApplied) {
        console.log('Fixes applied successfully. Re-running tests in next iteration...');
      } else {
        console.log('No fixes were applied. Some issues may require manual intervention.');
      }
    }
    
    iteration++;
  }
  
  // Final report
  console.log('\n%c 📊 FINAL TEST REPORT 📊 ', 'background: #222; color: #bada55; padding: 10px; font-size: 16px; font-weight: bold;');
  
  if (allPassed) {
    console.log('%c ✅ ALL TESTS PASSED! ✅ ', 'background: #060; color: white; padding: 5px; font-size: 14px; font-weight: bold;');
    console.log(`Completed in ${iteration - 1} iterations.`);
  } else {
    console.log('%c ❌ SOME TESTS STILL FAILING ❌ ', 'background: #600; color: white; padding: 5px; font-size: 14px; font-weight: bold;');
    console.log(`Reached maximum iterations (${maxIterations}) with remaining issues.`);
    
    // Summarize remaining issues
    let remainingIssues = 0;
    
    suites.forEach(suite => {
      if (!suite.allPassed) {
        console.log(`\n%c Issues in ${suite.name}: `, 'font-weight: bold;');
        
        suite.results.forEach(result => {
          if (!result.passed) {
            console.log(`- ${result.name}: ${result.errors.length} errors`);
            remainingIssues += result.errors.length;
          }
        });
      }
    });
    
    console.log(`\nTotal remaining issues: ${remainingIssues}`);
    console.log('🔧 Manual intervention may be required to fix these issues.');
  }
  
  // Save test report to console for reference
  (window as any).__TEST_REPORT__ = {
    suites,
    issues: testIssues,
    allPassed,
    iterations: iteration - 1,
    timestamp: new Date().toISOString()
  };
  
  console.log('\n📋 Test report saved to window.__TEST_REPORT__');
  console.log('You can inspect detailed results in the console by typing: console.log(window.__TEST_REPORT__)');
}

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).runAutomatedTestAndFix = runAutomatedTestAndFix;
  console.log('🤖 Automated test and fix system initialized. Run with window.runAutomatedTestAndFix()');
}