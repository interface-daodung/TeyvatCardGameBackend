import { useParams, useNavigate } from 'react-router-dom';
import { CharacterDetailView } from '../components/characters/CharacterDetailView';

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <CharacterDetailView
      nameId={id}
      variant="page"
      onNavigateBack={() => navigate('/characters')}
    />
  );
}
