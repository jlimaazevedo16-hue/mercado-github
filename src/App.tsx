import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UserRoleProvider } from "@/hooks/useUserRole";
import { UFMSProvider } from "@/contexts/UFMSContext";
import { SetupStatusProvider } from "@/hooks/useSetupStatus";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerificacaoCadastral from "./pages/VerificacaoCadastral";
import Almoxarifado from "./pages/Almoxarifado";
import PlantaBaixa from "./pages/PlantaBaixa";
import BoxFicha from "./pages/BoxFicha";
import ResponsavelFicha from "./pages/ResponsavelFicha";
import Responsaveis from "./pages/Responsaveis";
import ObservatorioComerciazacao from "./pages/ObservatorioComerciazacao";
import Notificacoes from "./pages/Notificacoes";
import Pendencias from "./pages/Pendencias";
import Configuracoes from "./pages/Configuracoes";
import Frequencia from "./pages/Frequencia";
import DashboardFinanceiro from "./pages/DashboardFinanceiro";
import WhatsApp from "./pages/WhatsApp";
import Documentos from "./pages/Documentos";
import Importacao from "./pages/Importacao";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserRoleProvider>
        <SetupStatusProvider>
          <UFMSProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/boxes" element={<ProtectedRoute requiredPermission="boxes"><Index /></ProtectedRoute>} />
                  <Route path="/almoxarifado" element={<ProtectedRoute requiredPermission="almoxarifado"><Almoxarifado /></ProtectedRoute>} />
                  <Route path="/planta-baixa" element={<ProtectedRoute requiredPermission="planta_baixa"><PlantaBaixa /></ProtectedRoute>} />
                  <Route path="/boxes/:id" element={<ProtectedRoute requiredPermission="boxes"><BoxFicha /></ProtectedRoute>} />
                  <Route path="/responsaveis" element={<ProtectedRoute requiredPermission="responsaveis"><Responsaveis /></ProtectedRoute>} />
                  <Route path="/responsaveis/:id" element={<ProtectedRoute requiredPermission="responsaveis"><ResponsavelFicha /></ProtectedRoute>} />
                  <Route path="/documentos" element={<ProtectedRoute requiredPermission="documentos"><Documentos /></ProtectedRoute>} />
                  <Route path="/observatorio" element={<ProtectedRoute requiredPermission="observatorio"><ObservatorioComerciazacao /></ProtectedRoute>} />
                  <Route path="/notificacoes" element={<ProtectedRoute requiredPermission="notificacoes"><Notificacoes /></ProtectedRoute>} />
                  <Route path="/pendencias" element={<ProtectedRoute requiredPermission="pendencias"><Pendencias /></ProtectedRoute>} />
                  <Route path="/configuracoes" element={<ProtectedRoute requiredPermission="configuracoes"><Configuracoes /></ProtectedRoute>} />
                  <Route path="/frequencia" element={<ProtectedRoute requiredPermission="frequencia"><Frequencia /></ProtectedRoute>} />
                  <Route path="/financeiro" element={<ProtectedRoute requiredPermission="configuracoes"><DashboardFinanceiro /></ProtectedRoute>} />
                  <Route path="/whatsapp" element={<ProtectedRoute requiredPermission="whatsapp"><WhatsApp /></ProtectedRoute>} />
                  <Route path="/importacao" element={<ProtectedRoute requiredPermission="configuracoes"><Importacao /></ProtectedRoute>} />
                  <Route path="/verificacao/:token" element={<VerificacaoCadastral />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </UFMSProvider>
        </SetupStatusProvider>
      </UserRoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;