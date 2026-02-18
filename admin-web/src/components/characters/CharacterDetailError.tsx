import { Card, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface CharacterDetailErrorProps {
  message: string;
  onBack: () => void;
}

export function CharacterDetailError({ message, onBack }: CharacterDetailErrorProps) {
  return (
    <div className="p-6 space-y-6">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{message}</CardTitle>
        </CardHeader>
      </Card>
      <Button
        onClick={onBack}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Back
      </Button>
    </div>
  );
}
