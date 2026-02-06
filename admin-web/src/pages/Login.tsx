import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';
import { authService } from '../services/authService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    });
  }, []);

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      try {
        await authService.login(data);
        const role = authService.getUserRole();
        if (role === 'user') {
          const userId = authService.getUserId();
          navigate(`/user/${userId}/Payments`, { replace: true });
        } else {
          navigate('/');
        }
      } catch (adminErr: any) {
        if (adminErr.response?.status === 403) {
          await authService.loginUser(data);
          const userId = authService.getUserId();
          navigate(`/user/${userId}/Payments`, { replace: true });
        } else {
          throw adminErr;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 via-pink-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <Particles
        id="tsparticles"
        className="absolute inset-0 z-0"
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 120,
          particles: {
            color: {
              value: ["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981"],
            },
            links: {
              enable: false,
            },
            move: {
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: true,
              speed: 1,
              straight: false,
            },
            number: {
              density: {
                enable: true,
              },
              value: 80,
            },
            opacity: {
              value: 0.5,
              animation: {
                enable: true,
                speed: 0.5,
                sync: false,
              },
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 3, max: 8 },
              animation: {
                enable: true,
                speed: 3,
                sync: false,
              },
            },
          },
          detectRetina: true,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 z-[1]"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl z-[1]"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl z-[1]"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 animate-pulse">
            Teyvat Admin
          </h1>
          <p className="text-purple-600/80 font-medium">Sign in to your admin account</p>
        </div>
        
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 backdrop-blur-sm">
          {/* <CardHeader className="space-y-1 pb-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">Welcome Back</CardTitle>
            <CardDescription className="text-center text-purple-600/70">
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader> */}
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300/50 text-red-700 px-4 py-3 rounded-md text-sm shadow-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-blue-700">
                  Email
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  className="flex h-11 w-full rounded-lg border-2 border-blue-200 bg-white/80 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-purple-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:border-blue-400 focus-visible:bg-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="admin@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 font-medium">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-purple-700">
                  Password
                </label>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  className="flex h-11 w-full rounded-lg border-2 border-purple-200 bg-white/80 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-pink-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:border-purple-400 focus-visible:bg-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 rounded-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-purple-600/70 font-medium bg-purple-50/50 px-4 py-2 rounded-lg border border-purple-200/50">
          Default: admin@example.com / admin123
        </p>
      </div>
    </div>
  );
}
