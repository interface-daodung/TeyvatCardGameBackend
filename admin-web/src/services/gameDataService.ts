import api from '../lib/api';

export interface CharacterLevelStat {
  level: number;
  price: number;
}

export interface Character {
  _id: string;
  nameId: string;
  name: string;
  description: string; // i18n key: character.{nameId}.description
  element?: string; // anemo | cryo | dendro | electro | geo | hydro | pyro | none
  HP: number;
  maxLevel: number;
  status: 'enabled' | 'disabled' | 'hidden' | 'unreleased';
  levelStats: CharacterLevelStat[];
}

export interface Equipment {
  _id: string;
  name: string;
  description: string;
  slot: string;
  stats: {
    attack?: number;
    defense?: number;
    health?: number;
  };
  status: 'enabled' | 'disabled' | 'hidden';
}

export interface AdventureCard {
  _id: string;
  nameId: string;
  name: string;
  description: string;
  type: 'weapon' | 'enemy' | 'food' | 'trap' | 'treasure' | 'bomb' | 'coin' | 'empty';
  category?: string;
  element?: string;
  clan?: string;
  rarity?: number;
  className?: string;
  image?: string;
  status: 'enabled' | 'disabled' | 'hidden';
  // Additional fields based on type
  healthMin?: number;
  healthMax?: number;
  scoreMin?: number;
  scoreMax?: number;
  damageMin?: number;
  damageMax?: number;
  damage?: number;
  countdown?: number;
  durabilityMin?: number;
  durabilityMax?: number;
  foodMin?: number;
  foodMax?: number;
  food?: number;
  hp?: number;
  resonanceDescription?: string;
}

export interface MapTypeRatios {
  enemies?: number;
  food?: number;
  weapons?: number;
  coins?: number;
  traps?: number;
  treasures?: number;
  bombs?: number;
}

export interface Map {
  _id: string;
  nameId: string;
  name: string;
  description: string;
  typeRatios: MapTypeRatios;
  deck: AdventureCard[];
  status: 'enabled' | 'disabled' | 'hidden';
}

export type MapCreatePayload = {
  nameId: string;
  name: string;
  description?: string;
  typeRatios?: MapTypeRatios;
  deck: string[];
  status?: 'enabled' | 'disabled' | 'hidden';
};

export type MapUpdatePayload = Partial<MapCreatePayload>;

export interface LevelStat {
  power: number;
  cooldown: number;
  price: number;
}

export interface Item {
  _id: string;
  nameId: string;
  basePower: number;
  baseCooldown: number;
  maxLevel: number;
  levelStats: LevelStat[];
}

export const gameDataService = {
  // Characters
  getCharacters: async (status?: string) => {
    const response = await api.get<{ characters: Character[] }>('/characters', {
      params: status ? { status } : {},
    });
    return response.data.characters;
  },

  getCharacterById: async (id: string): Promise<Character> => {
    const response = await api.get<Character>(`/characters/${id}`);
    return response.data;
  },

  createCharacter: async (data: Partial<Character>): Promise<Character> => {
    const response = await api.post<Character>('/characters', data);
    return response.data;
  },

  updateCharacter: async (id: string, data: Partial<Character>): Promise<Character> => {
    const response = await api.patch<Character>(`/characters/${id}`, data);
    return response.data;
  },

  deleteCharacter: async (id: string): Promise<void> => {
    await api.delete(`/characters/${id}`);
  },

  // Equipment
  getEquipment: async (status?: string) => {
    const response = await api.get<{ equipment: Equipment[] }>('/equipment', {
      params: status ? { status } : {},
    });
    return response.data.equipment;
  },

  getEquipmentById: async (id: string): Promise<Equipment> => {
    const response = await api.get<Equipment>(`/equipment/${id}`);
    return response.data;
  },

  createEquipment: async (data: Partial<Equipment>): Promise<Equipment> => {
    const response = await api.post<Equipment>('/equipment', data);
    return response.data;
  },

  updateEquipment: async (id: string, data: Partial<Equipment>): Promise<Equipment> => {
    const response = await api.patch<Equipment>(`/equipment/${id}`, data);
    return response.data;
  },

  deleteEquipment: async (id: string): Promise<void> => {
    await api.delete(`/equipment/${id}`);
  },

  // Adventure Cards
  getAdventureCards: async (status?: string, type?: string) => {
    const response = await api.get<{ cards: AdventureCard[] }>('/adventure-cards', {
      params: { status, type },
    });
    return response.data.cards;
  },

  getAdventureCardById: async (id: string): Promise<AdventureCard> => {
    const response = await api.get<AdventureCard>(`/adventure-cards/${id}`);
    return response.data;
  },

  createAdventureCard: async (data: Partial<AdventureCard>): Promise<AdventureCard> => {
    const response = await api.post<AdventureCard>('/adventure-cards', data);
    return response.data;
  },

  updateAdventureCard: async (id: string, data: Partial<AdventureCard>): Promise<AdventureCard> => {
    const response = await api.patch<AdventureCard>(`/adventure-cards/${id}`, data);
    return response.data;
  },

  deleteAdventureCard: async (id: string): Promise<void> => {
    await api.delete(`/adventure-cards/${id}`);
  },

  // Maps
  getMaps: async (status?: string) => {
    const response = await api.get<{ maps: Map[] }>('/maps', {
      params: status ? { status } : {},
    });
    return response.data.maps;
  },

  getMapById: async (id: string): Promise<Map> => {
    const response = await api.get<Map>(`/maps/${id}`);
    return response.data;
  },

  createMap: async (data: MapCreatePayload): Promise<Map> => {
    const response = await api.post<Map>('/maps', data);
    return response.data;
  },

  updateMap: async (id: string, data: MapUpdatePayload): Promise<Map> => {
    const response = await api.patch<Map>(`/maps/${id}`, data);
    return response.data;
  },

  deleteMap: async (id: string): Promise<void> => {
    await api.delete(`/maps/${id}`);
  },

  // Items (game consumables)
  getItems: async () => {
    const response = await api.get<{ items: Item[] }>('/items');
    return response.data.items;
  },

  getItemById: async (id: string): Promise<Item> => {
    const response = await api.get<Item>(`/items/${id}`);
    return response.data;
  },

  updateItem: async (id: string, data: Partial<Item>): Promise<Item> => {
    const response = await api.patch<Item>(`/items/${id}`, data);
    return response.data;
  },
};
