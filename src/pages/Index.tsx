
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import TaskManager from "@/components/TaskManager";
import AuthForm from "@/components/AuthForm";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  // Use custom hook for cleaner authentication management
  const { user, loading, isLoggedIn, handleLogout } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-indigo-600 font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with app title and logout button */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-indigo-600">Tugasku</h1>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Halo, {user?.user_metadata?.name}
              </span>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
              >
                Keluar
              </Button>
            </div>
          )}
        </div>
        
        {/* Main content - either login form or task manager */}
        {!isLoggedIn ? (
          <Card className="p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-600">
              Selamat Datang di Tugasku
            </h2>
            <p className="mb-6 text-center text-gray-600">
              Kelola Deadline Anda dengan Mudah
            </p>
            <AuthForm />
          </Card>
        ) : user?.email_confirmed_at ? (
          <TaskManager user={user} />
        ) : (
          <Card className="p-6 max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4 text-orange-600">
              Email Belum Dikonfirmasi
            </h2>
            <p className="text-gray-600 mb-4">
              Silakan periksa email Anda dan klik link konfirmasi untuk mengaktifkan akun.
            </p>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
            >
              Keluar dan Masuk Kembali
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
