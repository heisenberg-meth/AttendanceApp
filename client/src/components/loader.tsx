export function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
        <LoaderSpinner />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <LoaderSpinner />
    </div>
  );
}

function LoaderSpinner() {
  return (
    <div className="relative w-16 h-16">
      {/* Outer rotating circle with gradient */}
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/60 animate-spin-slow"></div>
      
      {/* Inner pulsing circle */}
      <div className="absolute inset-2 rounded-full bg-primary/20 animate-pulse-slow"></div>
      
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-primary"></div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoaderSpinner />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
