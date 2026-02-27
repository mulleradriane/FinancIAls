import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  User,
  Settings as SettingsIcon,
  Save,
  LogOut,
  Palette,
  Shield,
  LayoutDashboard,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { authApi } from '@/api/api';
import { useTheme } from '@/context/ThemeContext';
import { useBudget } from '@/context/BudgetContext';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { showBudget, setShowBudget } = useBudget();
  const [activeTab, setActiveTab] = useState('geral');

  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    createdAt: ''
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authApi.me();
        const user = response.data;
        setProfile({
          displayName: user.display_name || '',
          username: user.username,
          createdAt: user.created_at
        });

        localStorage.setItem('username', user.username);
        localStorage.setItem('display_name', user.display_name || user.username);
      } catch (error) {
        console.error("Erro ao carregar perfil", error);
        toast.error("Não foi possível carregar os dados do perfil.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        username: profile.username,
        display_name: profile.displayName
      };

      if (password) {
        payload.password = password;
      }

      const response = await authApi.updateMe(payload);
      const updatedUser = response.data;

      localStorage.setItem('username', updatedUser.username);
      localStorage.setItem('display_name', updatedUser.display_name || updatedUser.username);

      toast.success('Perfil atualizado com sucesso!');
      setPassword(''); // Clear password field after success
    } catch (error) {
      console.error("Erro ao atualizar perfil", error);
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : "Não foi possível atualizar o perfil.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('display_name');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'geral', label: 'Geral', icon: SettingsIcon },
    { id: 'conta', label: 'Conta', icon: User },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Personalize sua experiência no sistema.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Navegação */}
        <aside className="w-full md:w-[200px] flex flex-row md:flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 max-w-2xl">
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <Card className="border-none shadow-md rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    <CardTitle>Aparência</CardTitle>
                  </div>
                  <CardDescription>Escolha como o sistema deve parecer para você.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Tema do Sistema</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        className={cn("rounded-xl h-20 flex-col gap-2", theme === 'light' && "shadow-lg shadow-primary/20")}
                        onClick={() => setTheme('light')}
                      >
                        <Sun size={20} />
                        <span className="text-xs">Claro</span>
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        className={cn("rounded-xl h-20 flex-col gap-2", theme === 'system' && "shadow-lg shadow-primary/20")}
                        onClick={() => setTheme('system')}
                      >
                        <Monitor size={20} />
                        <span className="text-xs">Sistema</span>
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        className={cn("rounded-xl h-20 flex-col gap-2", theme === 'dark' && "shadow-lg shadow-primary/20")}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon size={20} />
                        <span className="text-xs">Escuro</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    <CardTitle>Funcionalidades</CardTitle>
                  </div>
                  <CardDescription>Ative ou desative recursos visuais.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3 p-4 rounded-xl bg-secondary/20">
                    <Checkbox
                      id="showBudget"
                      checked={showBudget}
                      onCheckedChange={(checked) => setShowBudget(!!checked)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="showBudget"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Mostrar Orçamento em Categorias
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Exibe barras de progresso de gastos na página de categorias.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'conta' && (
            <div className="space-y-6">
              <Card className="border-none shadow-md rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <CardTitle>Perfil</CardTitle>
                  </div>
                  <CardDescription>Suas informações de identificação.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Nome de exibição</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      placeholder="Como você quer ser chamado?"
                      value={profile.displayName}
                      onChange={handleProfileChange}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="Seu nome de usuário"
                      value={profile.username}
                      onChange={handleProfileChange}
                      className="rounded-xl"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Segurança</CardTitle>
                  </div>
                  <CardDescription>Mantenha sua conta protegida.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Deixe em branco para manter a atual"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-between pt-2">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="rounded-xl px-6 order-2 sm:order-1"
                >
                  <LogOut size={18} className="mr-2" />
                  Sair da Conta
                </Button>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-xl px-8 shadow-lg shadow-primary/20 gap-2 order-1 sm:order-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Salvar Alterações
                </Button>
              </div>

              <p className="text-center text-[10px] text-muted-foreground pt-4">
                Membro desde: {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;
