import React, { useState, useEffect } from 'react';
import Button from './Button';

export default function ParentalPinModal({
  isOpen,
  channelName,
  onPinSubmit,
  onClose,
  isVerifying = false
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState('check');
  const [error, setError] = useState('');
  const [userHasPin, setUserHasPin] = useState(null);

  useEffect(() => {
    if (isOpen) {
      checkIfUserHasPin();
      setPin('');
      setConfirmPin('');
      setError('');
    }
  }, [isOpen]);

  const checkIfUserHasPin = async () => {
    try {
      const response = await fetch('/api/parental-pin/check', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUserHasPin(data.hasPin || false);
      setMode(data.hasPin ? 'check' : 'create');
    } catch (err) {
      console.error('Error checking PIN:', err);
      setUserHasPin(false);
      setMode('create');
    }
  };

  const validatePin = (value) => {
    return /^\d{0,6}$/.test(value);
  };

  const handlePinChange = (e) => {
    const value = e.target.value;
    if (validatePin(value)) {
      setPin(value);
      setError('');
    }
  };

  const handleConfirmPinChange = (e) => {
    const value = e.target.value;
    if (validatePin(value)) {
      setConfirmPin(value);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'check') {
      if (pin.length !== 6) {
        setError('El PIN debe tener 6 dígitos');
        return;
      }
      onPinSubmit(pin, 'verify');
    } else {
      if (pin.length !== 6) {
        setError('El PIN debe tener 6 dígitos');
        return;
      }
      if (confirmPin.length !== 6) {
        setError('Debes confirmar el PIN (6 dígitos)');
        return;
      }
      if (pin !== confirmPin) {
        setError('Los PINs no coinciden');
        return;
      }
      onPinSubmit(pin, 'create');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-2 text-white">
          🔐 Control Parental
        </h2>
        <p className="text-gray-300 mb-6 text-sm">
          Este es contenido para adultos: <span className="font-bold text-red-400">{channelName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'check' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ingresa tu PIN de 6 dígitos:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength="6"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50"
                  autoFocus
                  disabled={isVerifying}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {pin.length}/6 dígitos ingresados
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Crea un PIN de 6 dígitos:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength="6"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50"
                  autoFocus
                  disabled={isVerifying}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {pin.length}/6 dígitos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirma el PIN:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength="6"
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50"
                  disabled={isVerifying}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {confirmPin.length}/6 dígitos
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600"
              disabled={isVerifying}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isVerifying}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {mode === 'check' ? 'Verificar' : 'Crear PIN'}
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          {mode === 'create'
            ? '⚠️ Guardará tu PIN para futuras protecciones'
            : 'Debes verificar tu PIN para acceder a este contenido'}
        </p>
      </div>
    </div>
  );
}
