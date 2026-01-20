import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Upload, X, User, Building2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  onPhotoChange: (url: string | null) => void;
  isEditing: boolean;
  entityType: 'responsavel' | 'box';
  entityId?: string;
  entityName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32'
};

export const PhotoUpload = ({
  currentPhotoUrl,
  onPhotoChange,
  isEditing,
  entityType,
  entityId,
  entityName,
  size = 'lg'
}: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name?: string) => {
    if (!name) return entityType === 'responsavel' ? 'R' : 'B';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityType}/${entityId || 'temp'}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      onPhotoChange(publicUrl);
      toast.success("Foto atualizada com sucesso!");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null);
  };

  const IconComponent = entityType === 'responsavel' ? User : Building2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} border-2 border-muted`}>
          {currentPhotoUrl ? (
            <AvatarImage src={currentPhotoUrl} alt={entityName || entityType} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-muted text-muted-foreground text-lg">
            {currentPhotoUrl ? getInitials(entityName) : <IconComponent className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      {isEditing && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {currentPhotoUrl ? 'Alterar' : 'Upload'}
          </Button>
          {currentPhotoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePhoto}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Remover
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
