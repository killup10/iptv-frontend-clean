import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el state para mostrar la UI de error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Puedes registrar el error en un servicio de reporte de errores
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // UI de error personalizada
      return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-zinc-800 p-8 rounded-lg shadow-xl text-center">
            <div className="mb-6">
              <span className="text-white font-bold text-3xl">
                <span className="text-red-600">T</span>eamG Play
              </span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Oops! Algo salió mal
            </h2>
            <p className="text-gray-300 mb-6">
              Ha ocurrido un error inesperado. Por favor, recarga la página o intenta de nuevo.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition duration-200"
              >
                Recargar página
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="w-full py-2.5 px-4 rounded-md bg-zinc-600 hover:bg-zinc-700 text-white font-semibold transition duration-200"
              >
                Ir al login
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="text-gray-400 cursor-pointer">Detalles del error (desarrollo)</summary>
                <pre className="text-xs text-red-400 mt-2 overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
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
