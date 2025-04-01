/**
 * Automated Test Runner
 * 
 * This script executes the automated test and fix system when imported.
 */

import { runAutomatedTestAndFix } from './utils/automatedTestAndFix';

// Execute automated tests when this module is imported
// This allows running tests from any part of the application
setTimeout(() => {
  console.clear();
  console.log('🤖 Executing Automated Test and Fix System...');
  runAutomatedTestAndFix().then(() => {
    console.log('✅ Automated testing and fixing completed!');
    console.log('Check console for detailed results or inspect window.__TEST_REPORT__');
  }).catch(error => {
    console.error('❌ Error during automated testing:', error);
  });
}, 1000); // Short delay to ensure app is fully initialized

export default runAutomatedTestAndFix;