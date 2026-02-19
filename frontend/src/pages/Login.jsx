import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Moon, Sun, Lock, User, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { theme, toggleTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef(null);

  // Background video source based on theme
  const videoSrc = theme === 'light' ? '/videos/light.mp4' : '/videos/dark.mp4';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [theme]);

  const handleAuth = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate a small delay for premium feel
    setTimeout(() => {
      if (isSignUp) {
        // Register logic
        const newUser = { displayName, username, password };
        localStorage.setItem('userSettings', JSON.stringify(newUser));
        localStorage.setItem('isAuthenticated', 'true');
        toast.success(`Conta criada! Bem-vinda(o), ${displayName || username}!`);
        navigate('/');
      } else {
        // Login logic
        const savedSettings = localStorage.getItem('userSettings');
        const user = savedSettings ? JSON.parse(savedSettings) : { username: 'admin', password: 'password' };

        if (username === user.username && password === user.password) {
          localStorage.setItem('isAuthenticated', 'true');
          toast.success(`Bem-vindo de volta, ${user.displayName || user.username}!`);
          navigate('/');
        } else {
          toast.error('Credenciais inválidas. Tente novamente.');
        }
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-hidden font-sans">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          key={videoSrc}
          className="w-full h-full object-cover grayscale-[20%] brightness-[0.9] dark:brightness-[0.6]"
          autoPlay
          muted
          playsInline
          onEnded={(e) => e.target.pause()}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        {/* Overlay to ensure readability */}
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20" />
      </div>

      {/* Theme Toggle - Top Right */}
      <div className="absolute top-8 right-8 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full bg-background/20 backdrop-blur-md border-white/20 hover:bg-white/30 text-white transition-all duration-300"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </Button>
      </div>

      {/* Branding - Top Center */}
      <div className="relative z-10 pt-16 animate-in fade-in slide-in-from-top-8 duration-1000">
        <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-2xl">
          FinancIAls
        </h1>
        <p className="text-white/70 text-center mt-2 font-medium tracking-widest uppercase text-[10px]">
          Inteligência Financeira Premium
        </p>
      </div>

      {/* Auth Form - Positioned lower (~60% of viewport) */}
      <div className="relative z-10 w-full max-w-md px-6 mt-auto mb-[10vh] animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
        <Card className="border-none shadow-2xl bg-background/40 backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold text-center">
              {isSignUp ? 'Criar sua conta' : 'Acesse sua conta'}
            </CardTitle>
            <CardDescription className="text-center font-medium">
              {isSignUp ? 'Cadastre-se para começar sua gestão' : 'Entre para gerenciar seu patrimônio'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome de exibição"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10 h-12 bg-background/50 border-none rounded-2xl focus-visible:ring-primary/30"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-background/50 border-none rounded-2xl focus-visible:ring-primary/30"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-background/50 border-none rounded-2xl focus-visible:ring-primary/30"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Processando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{isSignUp ? 'Criar Conta' : 'Acessar Dashboard'}</span>
                    <ArrowRight size={18} />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2">
               <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-semibold text-primary hover:underline underline-offset-4 transition-all"
               >
                 {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Crie uma agora'}
               </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-8 text-white/50 text-xs font-medium">
          &copy; {new Date().getFullYear()} FinancIAls. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
