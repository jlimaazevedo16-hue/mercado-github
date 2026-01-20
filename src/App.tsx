import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UserRoleProvider } from "@/hooks/useUserRole";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Almoxarifado from "./pages/Almoxarifado";
import PlantaBaixa from "./pages/PlantaBaixa";
import BoxFicha from "./pages/BoxFicha";
import ResponsavelFicha from "./pages/ResponsavelFicha";
import Responsaveis from "./pages/Responsaveis";
import ObservatorioComerciazacao from "./pages/ObservatorioComerciazacao";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import Notificacoes from "./pages/Notificacoes";
import Pendencias from "./pages/Pendencias";
import Configuracoes from "./pages/Configuracoes";
import Frequencia from "./pages/Frequencia";
import DashboardFinanceiro from "./pages/DashboardFinanceiro";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserRoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/almoxarifado" element={<ProtectedRoute requiredPermission="almoxarifado"><Almoxarifado /></ProtectedRoute>} />
              <Route path="/planta-baixa" element={<ProtectedRoute requiredPermission="planta_baixa"><PlantaBaixa /></ProtectedRoute>} />
              <Route path="/boxes/:id" element={<ProtectedRoute requiredPermission="boxes"><BoxFicha /></ProtectedRoute>} />
              <Route path="/responsaveis" element={<ProtectedRoute requiredPermission="responsaveis"><Responsaveis /></ProtectedRoute>} />
              <Route path="/responsaveis/:id" element={<ProtectedRoute requiredPermission="responsaveis"><ResponsavelFicha /></ProtectedRoute>} />
              <Route path="/observatorio" element={<ProtectedRoute requiredPermission="observatorio"><ObservatorioComerciazacao /></ProtectedRoute>} />
              <Route path="/gestao-usuarios" element={<ProtectedRoute requiredPermission="gestao_usuarios"><GestaoUsuarios /></ProtectedRoute>} />
              <Route path="/notificacoes" element={<ProtectedRoute requiredPermission="notificacoes"><Notificacoes /></ProtectedRoute>} />
              <Route path="/pendencias" element={<ProtectedRoute requiredPermission="pendencias"><Pendencias /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute requiredPermission="configuracoes"><Configuracoes /></ProtectedRoute>} />
              <Route path="/frequencia" element={<ProtectedRoute requiredPermission="frequencia"><Frequencia /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute requiredPermission="configuracoes"><DashboardFinanceiro /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserRoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;