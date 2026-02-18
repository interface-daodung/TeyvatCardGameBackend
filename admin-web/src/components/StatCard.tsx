import { Card, CardContent } from './ui/card';

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  gradient?: string;
  textColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  gradient = 'from-slate-100 to-blue-100',
  textColor = 'text-slate-700',
}: StatCardProps) {
  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className={`bg-gradient-to-br ${gradient} p-0`}>
        <CardContent className="bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
            </div>
            <div className="text-4xl opacity-80">{icon}</div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
