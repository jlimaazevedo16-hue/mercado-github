import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/almoxarifado" element={<Almoxarifado />} />
            <Route path="/planta-baixa" element={<PlantaBaixa />} />
            <Route path="/boxes/:id" element={<BoxFicha />} />
            <Route path="/responsaveis" element={<Responsaveis />} />
            <Route path="/responsaveis/:id" element={<ResponsavelFicha />} />
            <Route path="/observatorio" element={<ObservatorioComerciazacao />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;