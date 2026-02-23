import React from 'react';
import { Target, Zap, BarChart3, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FuturePhaseItem = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl border border-dashed border-muted-foreground/20 bg-muted/5 group hover:bg-muted/10 transition-colors relative overflow-hidden">
    <div className="p-2 bg-muted rounded-lg shrink-0">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-bold text-muted-foreground">{title}</h4>
        <Badge variant="secondary" className="h-4 text-[9px] uppercase tracking-tighter px-1.5 font-bold bg-muted-foreground/10 text-muted-foreground/70">Em breve</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        {description}
      </p>
    </div>
    <Clock className="absolute top-2 right-2 h-3 w-3 text-muted-foreground/20" />
  </div>
);

const FuturePhasesCard = () => {
  return (
    <Card className="border-none shadow-md rounded-2xl h-full overflow-hidden">
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Recursos Inteligentes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FuturePhaseItem
            icon={Target}
            title="Metas"
            description="Defina objetivos financeiros e acompanhe seu progresso automaticamente."
          />
          <FuturePhaseItem
            icon={BarChart3}
            title="Projeção Futura"
            description="Simule o crescimento do seu patrimônio com base no seu perfil atual."
          />
          <FuturePhaseItem
            icon={Zap}
            title="Alertas Inteligentes"
            description="Insights proativos sobre gastos atípicos e oportunidades de economia."
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FuturePhasesCard;
