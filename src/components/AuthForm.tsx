import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AuthForm: React.FC = () => {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle user registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Silakan lengkapi semua field");
      return;
    }

    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }

    setLoading(true);
    
    try {
      // Get the current URL for email redirect
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim()
          },
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;
      
      if (data.user && !data.session) {
        toast.success("Akun berhasil dibuat! Silakan periksa email Anda untuk konfirmasi sebelum masuk.");
        // Clear form
        setName('');
        setEmail('');
        setPassword('');
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
      
      if (error.message?.includes('User already registered')) {
        toast.error("Email sudah terdaftar. Silakan gunakan email lain atau masuk dengan akun yang ada.");
      } else if (error.message?.includes('Invalid email')) {
        toast.error("Format email tidak valid");
      } else {
        toast.error(error.message || "Gagal membuat akun. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle user login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!email.trim() || !password.trim()) {
      toast.error("Silakan masukkan email dan kata sandi");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;
      
      if (data.user) {
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          toast.error("Silakan konfirmasi email Anda terlebih dahulu sebelum masuk.");
          await supabase.auth.signOut();
          return;
        }
        
        // Clear form and let React handle the state change naturally
        setEmail('');
        setPassword('');
        // No forced redirect - let useAuth handle the state change
      }
    } catch (error: any) {
      console.error('Error signing in:', error);
      
      if (error.message?.includes('Invalid login credentials')) {
        toast.error("Email atau kata sandi salah");
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error("Silakan konfirmasi email Anda terlebih dahulu");
      } else {
        toast.error(error.message || "Gagal masuk. Silakan periksa kredensial Anda.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signin" className="text-indigo-600">
          Masuk
        </TabsTrigger>
        <TabsTrigger value="signup" className="text-indigo-600">
          Daftar
        </TabsTrigger>
      </TabsList>
      
      {/* Sign In Tab */}
      <TabsContent value="signin">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email" className="text-indigo-600">
              Email
            </Label>
            <Input 
              id="signin-email"
              type="email" 
              placeholder="email@anda.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-indigo-600 focus:border-indigo-600 focus:ring-indigo-600"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signin-password" className="text-indigo-600">
              Kata Sandi
            </Label>
            <Input 
              id="signin-password"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-indigo-600 focus:border-indigo-600 focus:ring-indigo-600"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
            disabled={loading}
          >
            {loading ? "Sedang Masuk..." : "Masuk"}
          </Button>
        </form>
      </TabsContent>
      
      {/* Sign Up Tab */}
      <TabsContent value="signup">
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name" className="text-indigo-600">
              Nama
            </Label>
            <Input 
              id="signup-name"
              type="text" 
              placeholder="Bagaimana kami harus memanggil Anda?" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-indigo-600 focus:border-indigo-600 focus:ring-indigo-600"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-indigo-600">
              Email
            </Label>
            <Input 
              id="signup-email"
              type="email" 
              placeholder="email@anda.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-indigo-600 focus:border-indigo-600 focus:ring-indigo-600"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-indigo-600">
              Kata Sandi (minimal 6 karakter)
            </Label>
            <Input 
              id="signup-password"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="text-indigo-600 focus:border-indigo-600 focus:ring-indigo-600"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
            disabled={loading}
          >
            {loading ? "Membuat Akun..." : "Buat Akun"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
};

export default AuthForm;
