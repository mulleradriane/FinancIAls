import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Lock, Settings as SettingsIcon, Save } from 'lucide-react';
import { authApi } from '@/api/api';

const Settings = () => {
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    createdAt: ''
  });
  const [loading, setLoading] = useState(true);

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

        // Update localStorage as well
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // In a real app, we would call an update endpoint here.
    // For now, since we only have /auth/me for reading,
    // and the prompt didn't strictly require a profile update endpoint,
    // I'll just show a success message or implement it if I have time.
    // Actually, I'll just keep it simple as requested.
    toast.info('A edição de perfil será implementada em breve.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e dados de perfil.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Perfil</CardTitle>
            </div>
            <CardDescription>Informações públicas e de exibição.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="Como você quer ser chamado?"
                value={profile.displayName}
                onChange={handleChange}
                className="rounded-xl"
                disabled
              />
              <p className="text-[10px] text-muted-foreground px-1">
                Nome exibido no sistema.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="Seu nome de usuário"
                value={profile.username}
                onChange={handleChange}
                className="rounded-xl"
                disabled
              />
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Membro desde: {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>Gerencie sua senha de acesso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Sua senha secreta"
                value="********"
                readOnly
                className="rounded-xl bg-muted"
              />
              <p className="text-[10px] text-muted-foreground px-1">
                A alteração de senha deve ser solicitada ao administrador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="rounded-xl px-8 shadow-lg shadow-primary/20 gap-2" disabled>
          <Save size={18} />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
};

export default Settings;
