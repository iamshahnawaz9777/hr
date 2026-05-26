import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

export default function LoginPage() {
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '', fullName: '', agreed: false });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password) {
      toast.error('Please enter username and password');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(loginForm.username)) {
      toast.error('Username can only contain letters, digits, and underscores');
      return;
    }
    setLoading(true);
    const { error } = await signInWithUsername(loginForm.username.trim(), loginForm.password);
    setLoading(false);
    if (error) {
      toast.error('Invalid username or password');
    } else {
      toast.success('Logged in successfully');
      navigate('/');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.agreed) {
      toast.error('Please accept the User Agreement and Privacy Policy');
      return;
    }
    if (!registerForm.username.trim() || !registerForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
      toast.error('Username can only contain letters, digits, and underscores');
      return;
    }
    if (registerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await signUpWithUsername(registerForm.username.trim(), registerForm.password, registerForm.fullName);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Registration failed');
    } else {
      toast.success('Account created. Please wait for admin activation.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">GlassERP</h1>
          <p className="text-muted-foreground text-sm mt-1">Glass Company Management System</p>
        </div>

        <Card className="max-w-[calc(100%-0rem)] shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-balance">Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username" className="text-sm font-normal">Username</Label>
                    <Input
                      id="login-username"
                      placeholder="Enter your username"
                      value={loginForm.username}
                      onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-normal">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full h-10" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-fullname" className="text-sm font-normal">Full Name</Label>
                    <Input
                      id="reg-fullname"
                      placeholder="Your full name"
                      value={registerForm.fullName}
                      onChange={e => setRegisterForm(f => ({ ...f, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-username" className="text-sm font-normal">Username <span className="text-destructive">*</span></Label>
                    <Input
                      id="reg-username"
                      placeholder="Letters, digits, underscore only"
                      value={registerForm.username}
                      onChange={e => setRegisterForm(f => ({ ...f, username: e.target.value }))}
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-normal">Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={registerForm.password}
                      onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm" className="text-sm font-normal">Confirm Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Repeat your password"
                      value={registerForm.confirmPassword}
                      onChange={e => setRegisterForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="agree"
                      checked={registerForm.agreed}
                      onCheckedChange={v => setRegisterForm(f => ({ ...f, agreed: !!v }))}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree" className="text-sm text-muted-foreground cursor-pointer">
                      I agree to the{' '}
                      <span className="text-primary underline cursor-pointer">User Agreement</span>{' '}
                      and{' '}
                      <span className="text-primary underline cursor-pointer">Privacy Policy</span>
                    </label>
                  </div>
                  <Button type="submit" className="w-full h-10" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          New accounts require admin approval before access is granted.
        </p>
      </div>
    </div>
  );
}
