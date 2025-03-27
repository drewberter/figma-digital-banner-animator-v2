import React, { useState, useEffect } from 'react';
import { syncLogs, SyncLogEntry, LogLevel, clearSyncLogs } from '../utils/syncLogger';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

/**
 * Debug panel that displays layer syncing logs
 * This helps diagnose and troubleshoot issues with the GIF frame layer syncing system
 */
const SyncDebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevel | null>(null);

  // Update logs
  useEffect(() => {
    // Function to update logs from the syncLogs array
    const updateLogs = () => {
      setLogs([...syncLogs]);
    };

    // Set up interval to check for new logs
    const intervalId = setInterval(updateLogs, 500);
    
    // Initial update
    updateLogs();
    
    return () => clearInterval(intervalId);
  }, []);

  // Filter logs based on level
  const filteredLogs = filterLevel 
    ? logs.filter(log => log.level === filterLevel)
    : logs;

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.ERROR:
        return 'text-red-500';
      case LogLevel.WARN:
        return 'text-amber-500';
      case LogLevel.SUCCESS:
        return 'text-green-500';
      case LogLevel.DEBUG:
        return 'text-blue-500';
      default:
        return 'text-slate-200';
    }
  };

  const handleClearLogs = () => {
    clearSyncLogs();
    setLogs([]);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          Show Sync Logs {logs.length > 0 && `(${logs.length})`}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-slate-900 border border-slate-700 rounded-tl-lg shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-slate-700">
        <h3 className="text-white font-semibold">Layer Sync Logs</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleClearLogs} className="h-7 text-slate-400 hover:text-white">
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-7 text-slate-400 hover:text-white">
            <X size={16} />
          </Button>
        </div>
      </div>
      
      <div className="flex gap-1 p-2 border-b border-slate-700">
        <Badge 
          variant={filterLevel === null ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setFilterLevel(null)}
        >
          All
        </Badge>
        <Badge 
          variant={filterLevel === LogLevel.ERROR ? "destructive" : "outline"} 
          className="cursor-pointer"
          onClick={() => setFilterLevel(LogLevel.ERROR)}
        >
          Errors
        </Badge>
        <Badge 
          variant={filterLevel === LogLevel.WARN ? "default" : "outline"} 
          className="cursor-pointer bg-amber-500 hover:bg-amber-600"
          onClick={() => setFilterLevel(LogLevel.WARN)}
        >
          Warnings
        </Badge>
        <Badge 
          variant={filterLevel === LogLevel.SUCCESS ? "default" : "outline"} 
          className="cursor-pointer bg-green-500 hover:bg-green-600"
          onClick={() => setFilterLevel(LogLevel.SUCCESS)}
        >
          Success
        </Badge>
        <Badge 
          variant={filterLevel === LogLevel.DEBUG ? "default" : "outline"} 
          className="cursor-pointer bg-blue-500 hover:bg-blue-600"
          onClick={() => setFilterLevel(LogLevel.DEBUG)}
        >
          Debug
        </Badge>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 text-center p-4">
            No logs to display
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, index) => (
              <div key={index} className="text-xs border-b border-slate-800 pb-2">
                <div className="flex justify-between">
                  <span className={`font-semibold ${getLogColor(log.level)}`}>[{log.level}]</span>
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-300 whitespace-pre-wrap">{log.message}</div>
                {log.data && (
                  <div className="text-slate-400 text-xs mt-1 bg-slate-800 p-1 rounded overflow-x-auto">
                    {log.data}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default SyncDebugPanel;