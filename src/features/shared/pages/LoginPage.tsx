import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import InlineLoader from '../../../components/ui/InlineLoader';


const LoginPage: React.FC = () => {
  // Add state for email, default to recent email from localStorage
  const [email, setEmail] = useState(() => localStorage.getItem('recent_login_email') || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') === 'true');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login, error, clearError, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  // Unified loading system
  const { startLoading, completeLoading, failLoading } = useLoadingJob();

  // Error handling
  const { handleError, withErrorHandling } = useErrorHandler({
    maxRetries: 3,
    showToast: true,
    logToConsole: true
  });

  // Helper function to get the last visited page from navigation history - MEMOIZED to prevent loops
  const getLastVisitedPage = useCallback((): string => {
    // First check if there's a specific post-login redirect set
    const postLoginRedirect = localStorage.getItem('postLoginRedirect');
    if (postLoginRedirect) {
      localStorage.removeItem('postLoginRedirect');
      return postLoginRedirect;
    }

    // Then check navigation history for the last visited page
    const savedHistory = localStorage.getItem('navigationHistory');
    if (savedHistory) {
      try {
        const history: string[] = JSON.parse(savedHistory);
        
        // Get the last page from history (excluding login page)
        const lastPage = history[history.length - 1];
        if (lastPage && lastPage !== '/login' && lastPage !== '/') {
          return lastPage;
        }
        // If last page was login or root, try the second to last page
        if (history.length > 1) {
          const secondLastPage = history[history.length - 2];
          if (secondLastPage && secondLastPage !== '/login' && secondLastPage !== '/') {
            return secondLastPage;
          }
        }
      } catch (error) {
        console.error('❌ LoginPage: Error parsing navigation history:', error);
      }
    }

    // Fallback to dashboard if no valid history found
    return '/dashboard';
  }, []); // Empty deps - this function doesn't depend on any external state


  // Autofill from localStorage if available
  useEffect(() => {
    const loadSavedCredentials = async () => {
      await withErrorHandling(async () => {
        const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
        if (savedRememberMe) {
          const lastEmail = localStorage.getItem('last_login_email') || '';
          const lastPassword = localStorage.getItem('last_login_password') || '';
          if (lastEmail) setEmail(lastEmail);
          if (lastPassword) setPassword(lastPassword);
        }
      }, 'Loading saved credentials');
    };

    loadSavedCredentials();
  }, [withErrorHandling]);

  // Redirect to last visited page if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const redirectPath = getLastVisitedPage();
      navigate(redirectPath, { replace: true }); // Use replace to prevent back button issues
    }
  }, [isAuthenticated, loading, navigate, getLastVisitedPage]);

  // Show skeleton while checking authentication
  if (loading) {
    return <InlineLoader fullscreen transparent message="Checking authentication..." />;
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      handleError(new Error('Please enter both email and password'), 'Form validation');
      return;
    }
    
    const jobId = startLoading('Signing in...');
    
    await withErrorHandling(async () => {
      setIsLoading(true);
      clearError();
      
      const success = await login(email, password);
      
      if (success) {
        // Save remember me preference
        localStorage.setItem('rememberMe', rememberMe.toString());
        
        // Save last used email and password for autofill only if remember me is checked
        if (rememberMe) {
          localStorage.setItem('last_login_email', email);
          localStorage.setItem('last_login_password', password);
        } else {
          localStorage.removeItem('last_login_email');
          localStorage.removeItem('last_login_password');
        }
        
        completeLoading(jobId);
        
        // On successful login, save email to localStorage
        localStorage.setItem('recent_login_email', email);
        
        const redirectPath = getLastVisitedPage();
        navigate(redirectPath);
      } else {
        failLoading(jobId, 'Login failed');
        throw new Error('Login failed. Please check your credentials.');
      }
    }, 'Login process').catch((error) => {
      failLoading(jobId, 'Login failed');
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setEmail(e.target.value);
    } catch (error) {
      handleError(error as Error, 'Email input');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setPassword(e.target.value);
    } catch (error) {
      handleError(error as Error, 'Password input');
    }
  };


  return (
    <PageErrorWrapper pageName="Login" showDetails={false}>
      {/* iOS 17 Style Login Screen */}
      <div 
        className="min-h-screen h-screen w-screen flex flex-col items-center justify-center px-6 py-8 bg-white safe-area-inset"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
      >
        <div className="w-full max-w-sm mx-auto">
            {/* Logo */}
          <div className="flex flex-col items-center mb-8 sm:mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3">
              <img 
                src="/logo.svg" 
                alt="Dukani Pro" 
                className="w-full h-full object-contain drop-shadow-lg" 
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Dukani Pro</h1>
            </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-3.5">
            {/* Email Input - iOS Style */}
              <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 pl-1">
                Email
              </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                className={`w-full px-4 py-3.5 sm:py-4 bg-gray-50 border rounded-2xl text-base text-gray-900 placeholder-gray-400 transition-all duration-200 ${
                  emailFocused 
                    ? 'border-blue-500 bg-white shadow-sm' 
                    : 'border-gray-200'
                }`}
                style={{ 
                  WebkitAppearance: 'none',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  maxHeight: '52px'
                }}
                placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  autoFocus
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                />
              </div>

            {/* Password Input - iOS Style */}
              <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 pl-1">
                Password
              </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                className={`w-full px-4 py-3.5 sm:py-4 bg-gray-50 border rounded-2xl text-base text-gray-900 placeholder-gray-400 transition-all duration-200 ${
                  passwordFocused 
                    ? 'border-blue-500 bg-white shadow-sm' 
                    : 'border-gray-200'
                }`}
                style={{ 
                  WebkitAppearance: 'none',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  maxHeight: '52px'
                }}
                placeholder="Enter your password"
                  required
                  disabled={isLoading}
                autoComplete="current-password"
                />
              </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-3 block text-sm text-gray-700 font-medium cursor-pointer select-none"
                  style={{ fontSize: '15px' }}
                >
                  Remember me
                </label>
              </div>
            </div>

            {/* Error Message - iOS Style */}
              {error && (
              <div className="px-4 py-3 bg-red-50 rounded-2xl">
                <p className="text-sm text-red-600" style={{ fontSize: '15px' }}>{error}</p>
                </div>
              )}

            {/* Sign In Button - iOS Blue */}
              <button
                type="submit"
                disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3.5 sm:py-4 px-4 rounded-2xl font-semibold hover:bg-blue-600 active:bg-blue-700 focus:outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-4"
              style={{ 
                fontSize: '16px',
                letterSpacing: '-0.3px',
                fontWeight: '600',
                minHeight: '52px'
              }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Signing in...
                  </div>
                ) : (
                'Sign In'
              )}
            </button>

            {/* Forgot Password Link - iOS Style */}
            <div className="text-center pt-2">
              <button
                type="button"
                className="text-blue-500 hover:text-blue-600 active:text-blue-700 font-medium transition-colors"
                style={{ fontSize: '15px' }}
                onClick={() => alert('Contact your administrator to reset your password')}
              >
                Forgot password?
              </button>
            </div>
            </form>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 pb-safe">
            <p className="text-center text-gray-500 text-xs leading-relaxed">
              Complete business management solution
            </p>
          </div>
        </div>
      </div>

      {/* Loading handled by unified spinner in top-right */}
    </PageErrorWrapper>
  );
};

export default LoginPage;