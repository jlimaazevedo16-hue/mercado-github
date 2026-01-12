interface StatCardProps {
  label: string;
  value: number;
  variant: "active" | "available" | "reform" | "blocked";
}

const StatCard = ({ label, value, variant }: StatCardProps) => {
  const variantClasses = {
    active: "stat-card-active",
    available: "stat-card-available",
    reform: "stat-card-reform",
    blocked: "stat-card-blocked",
  };

  return (
    <div className={`stat-card ${variantClasses[variant]}`}>
      <div>
        <p className="text-sm font-medium opacity-90">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-white/30" />
      </div>
    </div>
  );
};

export const StatCards = () => {
  const stats = [
    { label: "Ativos", value: 125, variant: "active" as const },
    { label: "Disponíveis", value: 36, variant: "available" as const },
    { label: "Em Reforma", value: 8, variant: "reform" as const },
    { label: "Interditados", value: 5, variant: "blocked" as const },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
};
