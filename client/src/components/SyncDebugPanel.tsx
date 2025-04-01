import React from 'react';
import { clearSyncLogs } from '../utils/syncLogger';

/**
 * Debug panel has been completely removed
 * Layer sync functionality has been disabled
 */
const SyncDebugPanel: React.FC = () => {
  // Component returns null - no UI rendered
  // This effectively removes the Layer Sync Logs dialog from the interface
  return null;
};

export default SyncDebugPanel;