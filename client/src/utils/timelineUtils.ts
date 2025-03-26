// Calculate time from a position in the timeline
export function calculateTimeFromPosition(
  position: number, 
  containerWidth: number, 
  duration: number
): number {
  // Calculate the time based on position relative to container width
  return (position / containerWidth) * duration;
}

// Calculate position in the timeline based on time
export function calculatePositionFromTime(
  time: number, 
  duration: number, 
  scale: number = 100
): number {
  // Base calculation (100px = 1 second at 100% scale)
  const basePixelsPerSecond = 100;
  
  // Adjust for scale
  const pixelsPerSecond = basePixelsPerSecond * (scale / 100);
  
  // Calculate position
  return time * pixelsPerSecond;
}

// Generate ruler ticks for timeline
export function generateRulerTicks(
  duration: number, 
  scale: number = 100
): { position: number; label: string }[] {
  // Determine tick interval based on duration and scale
  let interval = 0.5; // Default: 0.5 second intervals
  
  if (duration > 10) {
    interval = 1; // 1 second intervals for longer animations
  }
  
  if (scale < 50) {
    interval = 2; // 2 second intervals when zoomed out
  }
  
  // Generate ticks
  const ticks: { position: number; label: string }[] = [];
  for (let time = 0; time <= duration; time += interval) {
    ticks.push({
      position: calculatePositionFromTime(time, duration, scale),
      label: time.toFixed(1) + 's'
    });
  }
  
  return ticks;
}

// Snap time to the nearest frame or keyframe
export function snapTimeToFrame(
  time: number, 
  frameRate: number = 30, 
  keyframes: number[] = []
): number {
  // Frame duration in seconds
  const frameDuration = 1 / frameRate;
  
  // First try to snap to a keyframe if it's close enough
  const keyframeSnapThreshold = frameDuration / 2;
  for (const keyframeTime of keyframes) {
    if (Math.abs(time - keyframeTime) <= keyframeSnapThreshold) {
      return keyframeTime;
    }
  }
  
  // If not close to a keyframe, snap to the nearest frame
  const frameIndex = Math.round(time / frameDuration);
  return frameIndex * frameDuration;
}
