import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { AuthProvider } from "@/contexts/AuthContext";
import { UserRoleProvider } from "@/hooks/useUserRole";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <UserRoleProvider>
      <App />
    </UserRoleProvider>
  </AuthProvider>
);
