import React from 'react';

const LAST_ERROR_STORAGE_KEY = 'teamg:last-error-boundary';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error || null };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturo un error:', error, errorInfo);

    try {
      const payload = {
        message: error?.message || String(error || 'Error desconocido'),
        name: error?.name || '',
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        path: window.location?.href || '',
        ts: Date.now(),
      };
      localStorage.setItem(LAST_ERROR_STORAGE_KEY, JSON.stringify(payload));
    } catch (storageError) {
      console.warn('ErrorBoundary: no se pudo guardar el ultimo error:', storageError);
    }

    this.setState({
      error: error || null,
      errorInfo: errorInfo || null,
    });
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || this.state.error?.toString() || 'Error desconocido';
      const firstStackLine = this.state.error?.stack
        ? String(this.state.error.stack)
            .split('\n')
            .map((line) => line.trim())
            .find((line) => line && line !== errorMessage)
        : '';

      return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
          <div className="max-w-xl w-full bg-zinc-800 p-8 rounded-lg shadow-xl text-center">
            <div className="mb-6">
              <span className="text-white font-bold text-3xl">
                <span className="text-red-600">T</span>eamG Play
              </span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Oops! Algo salio mal
            </h2>
            <p className="text-gray-300 mb-6">
              Ha ocurrido un error inesperado. Por favor, recarga la pagina o intenta de nuevo.
            </p>
            <div className="mb-6 rounded-md border border-red-500/30 bg-black/30 p-3 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-red-300">Error</p>
              <p className="mt-2 break-words text-sm font-semibold text-red-200">{errorMessage}</p>
              {firstStackLine && (
                <p className="mt-2 break-words text-xs text-zinc-400">{firstStackLine}</p>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition duration-200"
              >
                Recargar pagina
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full py-2.5 px-4 rounded-md bg-zinc-600 hover:bg-zinc-700 text-white font-semibold transition duration-200"
              >
                Volver al inicio
              </button>
            </div>
            {(process.env.NODE_ENV === 'development' || this.state.errorInfo?.componentStack) && (
              <details className="mt-6 text-left">
                <summary className="text-gray-400 cursor-pointer">Detalles del error</summary>
                <pre className="text-xs text-red-400 mt-2 overflow-auto whitespace-pre-wrap break-words">
                  {this.state.error && this.state.error.toString()}
                  {'\n'}
                  {this.state.error?.stack}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
