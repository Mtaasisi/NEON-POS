import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Shield, Eye, EyeOff, Moon, Sun, Lock, Mail, TrendingUp, Users, CheckCircle, Zap, ArrowRight,
  Package, ShoppingCart, DollarSign, BarChart3, Calendar, Bell, Clock, Wrench, FileText, 
  CreditCard, Truck, Settings, Database, MessageSquare, Camera
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import GlassButton from '../components/ui/GlassButton';
import GlassCard from '../components/ui/GlassCard';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import { useErrorHandler } from '../../../hooks/useErrorHandler';


const LoginPage: React.FC = () => {
  // Add state for email, default to recent email from localStorage
  const [email, setEmail] = useState(() => localStorage.getItem('recent_login_email') || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') === 'true');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('loginTheme') === 'dark');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login, error, clearError, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

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

  // Theme toggle effect
  useEffect(() => {
    localStorage.setItem('loginTheme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen h-screen w-screen flex items-center justify-center p-4 overflow-hidden" style={{ backgroundColor: 'transparent' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm md:text-base">Checking authentication...</p>
        </div>
      </div>
    );
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
        
        // On successful login, save email to localStorage
        localStorage.setItem('recent_login_email', email);
        
        const redirectPath = getLastVisitedPage();
        navigate(redirectPath);
      } else {
        throw new Error('Login failed. Please check your credentials.');
      }
    }, 'Login process');
    
    setIsLoading(false);
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

  const togglePasswordVisibility = () => {
    try {
      setShowPassword(!showPassword);
    } catch (error) {
      handleError(error as Error, 'Password visibility toggle');
    }
  };

  const features = [
    { 
      icon: ShoppingCart, 
      title: 'Advanced POS', 
      description: 'Multi-currency sales & variants', 
      details: 'Process sales in multiple currencies, track serial/IMEI numbers, manage product variants, and handle complex transactions with ease.',
      color: 'from-blue-400 to-cyan-400', 
      delay: 0 
    },
    { 
      icon: Package, 
      title: 'Inventory', 
      description: 'Real-time stock tracking', 
      details: 'Monitor stock levels in real-time, create purchase orders, manage suppliers, and get low-stock alerts automatically.',
      color: 'from-purple-400 to-pink-400', 
      delay: 0.05 
    },
    { 
      icon: Smartphone, 
      title: 'Device Repairs', 
      description: 'Complete repair tracking', 
      details: 'Track device repairs from start to finish, manage diagnostics, spare parts, technician assignments, and customer communications.',
      color: 'from-green-400 to-emerald-400', 
      delay: 0.1 
    },
    { 
      icon: Users, 
      title: 'Customer CRM', 
      description: 'Loyalty & history', 
      details: 'Build customer profiles, track purchase history, manage loyalty points, and increase customer retention with smart insights.',
      color: 'from-orange-400 to-red-400', 
      delay: 0.15 
    },
    { 
      icon: DollarSign, 
      title: 'Financial', 
      description: 'Payments & expenses', 
      details: 'Accept multiple payment methods, track expenses, manage installments, generate financial reports, and monitor cash flow.',
      color: 'from-yellow-400 to-orange-400', 
      delay: 0.2 
    },
    { 
      icon: BarChart3, 
      title: 'Analytics', 
      description: 'Sales insights', 
      details: 'Get powerful insights into sales trends, inventory performance, customer behavior, and business growth metrics.',
      color: 'from-indigo-400 to-purple-400', 
      delay: 0.25 
    },
    { 
      icon: Calendar, 
      title: 'Appointments', 
      description: 'Smart scheduling', 
      details: 'Schedule repair appointments, customer meetings, send automatic reminders, and manage your team\'s calendar efficiently.',
      color: 'from-pink-400 to-rose-400', 
      delay: 0.3 
    },
    { 
      icon: Bell, 
      title: 'Reminders', 
      description: 'Smart alerts', 
      details: 'Never miss important follow-ups, payment deadlines, or stock alerts with intelligent automated reminders.',
      color: 'from-cyan-400 to-blue-400', 
      delay: 0.35 
    },
    { 
      icon: MessageSquare, 
      title: 'WhatsApp Integration', 
      description: 'Direct customer messaging', 
      details: 'Send order updates, repair status, payment reminders, and promotional messages directly via WhatsApp.',
      color: 'from-green-400 to-teal-400', 
      delay: 0.4 
    },
    { 
      icon: Truck, 
      title: 'Supplier Management', 
      description: 'Purchase orders & tracking', 
      details: 'Manage supplier relationships, create purchase orders, track deliveries, and maintain optimal stock levels.',
      color: 'from-amber-400 to-yellow-400', 
      delay: 0.45 
    },
    { 
      icon: Clock, 
      title: 'Staff Attendance', 
      description: 'Employee time tracking', 
      details: 'Track employee attendance, working hours, shifts, and generate payroll reports with automatic calculations.',
      color: 'from-blue-400 to-indigo-400', 
      delay: 0.5 
    },
    { 
      icon: FileText, 
      title: 'Receipts & Invoices', 
      description: 'Professional documents', 
      details: 'Generate professional receipts, invoices, and quotations with your branding. Print or send via email/WhatsApp.',
      color: 'from-gray-400 to-slate-400', 
      delay: 0.55 
    },
    { 
      icon: Camera, 
      title: 'Product Images', 
      description: 'Visual inventory', 
      details: 'Upload and manage product photos with thumbnail support. Create attractive product catalogs and ads.',
      color: 'from-pink-400 to-purple-400', 
      delay: 0.6 
    },
    { 
      icon: Settings, 
      title: 'Multi-Branch', 
      description: 'Multiple locations', 
      details: 'Manage multiple store locations, transfer stock between branches, and get consolidated reports across all branches.',
      color: 'from-violet-400 to-purple-400', 
      delay: 0.65 
    },
    { 
      icon: CreditCard, 
      title: 'Payment Methods', 
      description: 'Cash, card & mobile money', 
      details: 'Accept cash, credit/debit cards, mobile money, and installment payments. Track all payment methods in one place.',
      color: 'from-emerald-400 to-green-400', 
      delay: 0.7 
    },
    { 
      icon: Database, 
      title: 'Cloud Database', 
      description: 'Secure & reliable', 
      details: 'Your data is stored securely in Neon serverless PostgreSQL database with automatic backups and 99.9% uptime.',
      color: 'from-cyan-400 to-blue-400', 
      delay: 0.75 
    }
  ];

  return (
    <PageErrorWrapper pageName="Login" showDetails={false}>
      <div 
        className={`min-h-screen h-screen w-screen flex items-center justify-center p-4 relative overflow-hidden ${
          isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
        }`}
        style={{
          backgroundImage: isDarkMode 
            ? 'none' 
            : 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)'
        }}
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Theme Toggle */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-xl transition-all duration-200 shadow-lg backdrop-blur-sm ${
              isDarkMode 
                ? 'bg-gray-800/90 text-yellow-400 hover:bg-gray-700 border border-gray-700' 
                : 'bg-white/90 text-gray-700 hover:bg-white border border-gray-200'
            }`}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Glassmorphism Login Card */}
        <div className="relative w-full max-w-md">
          {/* Glassmorphism Card */}
          <div className="relative bg-white/20 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src="/logo.svg" alt="Dukani Pro Logo" className="h-16 w-16 object-contain" />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign in with email</h1>
              <p className="text-gray-600 text-sm">
                Complete business management solution for repair shops and retail stores
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Email"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => alert('Forgot password functionality - Contact your administrator')}
                >
                  Forgot password?
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Get Started'
                )}
              </button>
            </form>

          </div>
        </div>
      </div>
    </PageErrorWrapper>
  );
};

export default LoginPage;