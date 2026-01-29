import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Setor {
  id: string;
  nome: string;
  mercado: string; // This is the prefix for code generation (ME, MI, MP, etc.)
}

export const useBoxCodeGenerator = () => {
  // Fetch all sectors
  const { data: setores } = useQuery({
    queryKey: ["setores-with-prefix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome, mercado")
        .order("nome");
      if (error) throw error;
      return data as Setor[];
    },
  });

  // Get the next available code for a sector
  const generateCode = async (setorId: string): Promise<string> => {
    if (!setorId || !setores) return "";

    const setor = setores.find((s) => s.id === setorId);
    if (!setor) return "";

    const prefix = setor.mercado || "XX"; // Use mercado as prefix

    // Get all existing boxes with this sector to find the next number
    const { data: existingBoxes, error } = await supabase
      .from("boxes")
      .select("codigo")
      .eq("setor_id", setorId)
      .order("codigo", { ascending: false });

    if (error) {
      console.error("Error fetching existing boxes:", error);
      return `${prefix}-001`;
    }

    // Find the highest number for this prefix
    let maxNumber = 0;
    
    existingBoxes?.forEach((box) => {
      // Try to extract number from code (e.g., ME-001 -> 001)
      const match = box.codigo?.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = maxNumber + 1;
    return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  };

  return {
    setores,
    generateCode,
  };
};
