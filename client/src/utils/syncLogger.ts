/**
 * Dedicated logging utility for the GIF frame layer linking system
 * Provides detailed information about the syncing process for debugging purposes
 */

// Set to true to enable detailed logging
export const DEBUG_SYNC = true;

// Log levels
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  SUCCESS = 'SUCCESS',
}

// Main logger function that tracks both to console and can store logs
export function syncLog(message: string, level: LogLevel = LogLevel.INFO, data?: any): void {
  if (!DEBUG_SYNC && level === LogLevel.DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[LayerSync][${level}]`;
  
  // Format the log message
  let logMessage = `${prefix} ${message}`;
  
  // Log to console with appropriate styling
  switch (level) {
    case LogLevel.ERROR:
      console.error(logMessage, data || '');
      break;
    case LogLevel.WARN:
      console.warn(logMessage, data || '');
      break;
    case LogLevel.DEBUG:
      console.debug(logMessage, data || '');
      break;
    case LogLevel.SUCCESS:
      console.log(`%c${logMessage}`, 'color: green; font-weight: bold;', data || '');
      break;
    default:
      console.log(logMessage, data || '');
  }
  
  // Store logs for UI display if needed
  syncLogs.push({
    timestamp,
    level,
    message,
    data: data ? JSON.stringify(data) : undefined,
  });
  
  // Keep log length manageable
  if (syncLogs.length > MAX_LOGS) {
    syncLogs.shift();
  }
}

// Store the last N logs
const MAX_LOGS = 100;
export interface SyncLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: string;
}

export const syncLogs: SyncLogEntry[] = [];

// Helper functions for different log levels
export const syncInfo = (message: string, data?: any) => 
  syncLog(message, LogLevel.INFO, data);

export const syncWarn = (message: string, data?: any) => 
  syncLog(message, LogLevel.WARN, data);

export const syncError = (message: string, data?: any) => 
  syncLog(message, LogLevel.ERROR, data);

export const syncDebug = (message: string, data?: any) => 
  syncLog(message, LogLevel.DEBUG, data);

export const syncSuccess = (message: string, data?: any) => 
  syncLog(message, LogLevel.SUCCESS, data);

// Function to log layer matches during translation
export function logLayerMatch(
  layerName: string,
  sourceLayerId: string,
  targetLayerId: string,
  sourceAdSizeId: string,
  targetAdSizeId: string
): void {
  syncSuccess(
    `Matched layer "${layerName}" from ${sourceAdSizeId} to ${targetAdSizeId}: ${sourceLayerId} → ${targetLayerId}`
  );
}

// Log the state of frame syncing
export function logFrameSyncState(
  sourceFrameId: string,
  targetFrameId: string,
  sourceLayerId: string, 
  targetLayerId: string,
  sourceLayerName: string,
  targetLayerName: string,
  sourceIsHidden: boolean,
  targetIsHidden: boolean,
  wasUpdated: boolean
): void {
  if (wasUpdated) {
    syncSuccess(
      `Synced layer visibility from ${sourceFrameId} to ${targetFrameId}:
       Layer ${sourceLayerId} (${sourceLayerName}) → ${targetLayerId} (${targetLayerName})
       Visibility: ${sourceIsHidden ? 'hidden' : 'visible'} → ${targetIsHidden ? 'hidden' : 'visible'}`
    );
  } else {
    syncDebug(
      `No visibility update needed for layer ${targetLayerId} (${targetLayerName}) in frame ${targetFrameId} - already matches source`
    );
  }
}

// Log when a layer sync is blocked due to an override
export function logOverrideBlocked(
  frameId: string,
  layerId: string,
  layerName: string
): void {
  syncWarn(
    `Layer "${layerName}" (${layerId}) in frame ${frameId} has an override and was not synced`
  );
}

// Log when a layer sync issue occurs due to layer matching problems
export function logSyncIssue(
  sourceFrameId: string, 
  targetFrameId: string,
  sourceLayerId: string,
  sourceLayerName: string,
  targetAdSize: string,
  reason: string,
  attemptedMethod?: string
): void {
  const methodInfo = attemptedMethod ? ` (attempted method: ${attemptedMethod})` : '';
  syncWarn(`Unable to sync layer from ${sourceFrameId} to ${targetFrameId}:
   Source layer: ${sourceLayerId} (${sourceLayerName})
   Target ad size: ${targetAdSize}
   Reason: ${reason}${methodInfo}`);
}

// Clear all logs
export function clearSyncLogs(): void {
  syncLogs.length = 0;
  syncInfo('Logs cleared');
}

// Export last N logs for debugging
export function getLastLogs(count: number = 10): SyncLogEntry[] {
  return syncLogs.slice(-count);
}