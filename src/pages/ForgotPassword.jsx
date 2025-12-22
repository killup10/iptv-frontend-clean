import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance.js';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/forgot-password', { email });
      console.log('[ForgotPassword] Reset email enviado:', response.data);
      setSuccess('✉️ Hemos enviado un código de verificación a tu correo.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al solicitar reset. Verifica tu email.');
      console.error('[ForgotPassword] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/reset-password', {
        email,
        resetCode,
        newPassword
      });
      console.log('[ForgotPassword] Contraseña reseteada:', response.data);
      setSuccess('✅ Contraseña cambiarla exitosamente. Redirigiendo al login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resetear la contraseña. Verifica el código.');
      console.error('[ForgotPassword] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        backgroundImage: `url(./fondo.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <main className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="w-full max-w-md p-6 sm:p-8 rounded-2xl"
          style={{
            backgroundColor: 'hsl(var(--card-background) / 0.8)',
            border: '1px solid hsl(var(--input-border) / 0.5)',
            '--card-background': '254 50% 8%',
            '--input-border': '315 100% 25%',
          }}
        >
          <h2 className="text-3xl font-black text-center text-primary mb-8">
            Recuperar Contraseña
          </h2>

          {/* STEP 1: Email */}
          {step === 1 && (
            <form onSubmit={handleRequestReset} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Correo Electrónico
                </label>
                <input 
                  type="email" 
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg text-foreground focus:outline-none focus:ring-2 text-base"
                  style={{
                    backgroundColor: 'hsl(254 50% 12%)',
                    border: '1px solid hsl(315 100% 25%)',
                    '--tw-ring-color': 'hsl(190 100% 50%)'
                  }}
                  disabled={loading}
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {success && <p className="text-green-500 text-sm text-center">{success}</p>}

              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3 rounded-lg text-base transition-all duration-300 ${
                  loading 
                    ? 'bg-gray-500 cursor-not-allowed animate-pulse' 
                    : 'bg-primary hover:scale-105 active:scale-95'
                }`}
                style={{
                  backgroundColor: loading ? 'hsl(190 30% 40%)' : 'hsl(190 100% 50%)',
                  color: 'hsl(254 50% 5%)'
                }}
              >
                {loading ? 'Enviando...' : 'Enviar Código'}
              </button>
            </form>
          )}

          {/* STEP 2: Code */}
          {step === 2 && (
            <form onSubmit={() => setStep(3)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Código de Verificación
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Revisa tu correo. Te hemos enviado un código de 6 dígitos.
                </p>
                <input 
                  type="text" 
                  placeholder="123456"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  required
                  className="w-full px-4 py-3 rounded-lg text-foreground text-center text-2xl font-mono focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'hsl(254 50% 12%)',
                    border: '1px solid hsl(315 100% 25%)',
                    '--tw-ring-color': 'hsl(190 100% 50%)',
                    letterSpacing: '0.5em'
                  }}
                  disabled={loading}
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 font-bold py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'hsl(190 30% 25%)',
                    color: 'hsl(190 100% 50%)'
                  }}
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={resetCode.length !== 6}
                  className="flex-1 font-bold py-3 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: resetCode.length === 6 ? 'hsl(190 100% 50%)' : 'hsl(190 30% 40%)',
                    color: 'hsl(254 50% 5%)'
                  }}
                >
                  Continuar
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-lg text-foreground focus:outline-none focus:ring-2 text-base"
                    style={{
                      backgroundColor: 'hsl(254 50% 12%)',
                      border: '1px solid hsl(315 100% 25%)',
                      '--tw-ring-color': 'hsl(190 100% 50%)'
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    disabled={loading}
                    tabIndex="-1"
                  >
                    {showNewPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 5a3 3 0 00-2.88 4.049l4.929 4.929A3 3 0 1010 5zm7.757 4.171A5.002 5.002 0 0017 10a7 7 0 10-9.757 6.171M10 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="Confirma tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-lg text-foreground focus:outline-none focus:ring-2 text-base"
                    style={{
                      backgroundColor: 'hsl(254 50% 12%)',
                      border: '1px solid hsl(315 100% 25%)',
                      '--tw-ring-color': 'hsl(190 100% 50%)'
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    disabled={loading}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 5a3 3 0 00-2.88 4.049l4.929 4.929A3 3 0 1010 5zm7.757 4.171A5.002 5.002 0 0017 10a7 7 0 10-9.757 6.171M10 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {success && <p className="text-green-500 text-sm text-center">{success}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="flex-1 font-bold py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'hsl(190 30% 25%)',
                    color: 'hsl(190 100% 50%)'
                  }}
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex-1 font-bold py-3 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: (newPassword.length >= 6 && newPassword === confirmPassword) ? 'hsl(190 100% 50%)' : 'hsl(190 30% 40%)',
                    color: 'hsl(254 50% 5%)'
                  }}
                >
                  {loading ? 'Procesando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿Recordaste tu contraseña?{' '}
            <Link to="/" className="font-medium text-secondary hover:underline">
              Vuelve al login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default ForgotPassword;
