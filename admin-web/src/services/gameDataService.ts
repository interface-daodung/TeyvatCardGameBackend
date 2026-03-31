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
  /** Ảnh thẻ (path web). */
  image?: string;
  /** Spritesheet Phaser; rỗng/undefined = mặc định theo nameId. */
  spritesheetImage?: string;
  /** Ảnh unlock (`assets/images/cards/unlock`). Rỗng → empty.webp. */
  imageUnlock?: string;
  element?: string; // anemo | cryo | dendro | electro | geo | hydro | pyro | none
  HP: number;
  maxLevel: number;
  /** Giá unlock level 1 (số nguyên > 1, mặc định 100). */
  unlockPrice?: number;
  status: 'enabled' | 'disabled';
  levelStats: CharacterLevelStat[];
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
  countdown?: number;
  durabilityMin?: number;
  durabilityMax?: number;
  foodMin?: number;
  foodMax?: number;
  hp?: number;
  resonanceDescription?: string;
  /** DB lưu mảng ID. API trả về có thể populated (object[]) hoặc IDs (string[]). Form edit lưu string[]. */
  contents?: string[] | AdventureCard[];
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
  /** Web path to background image, e.g. `/assets/images/ui/background/Fankang.webp` */
  map_background?: string;
  typeRatios: MapTypeRatios;
  deck: AdventureCard[];
  status: 'enabled' | 'disabled' | 'hidden';
}

export type MapCreatePayload = {
  nameId: string;
  name: string;
  description?: string;
  map_background?: string;
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
  /** Đường dẫn web đầy đủ `/assets/images/...` — có thể rỗng nếu DB chưa sửa */
  image?: string;
  /** File .ts tương đối trong `TeyvatCard/src/models/items` (legacy). */
  className?: string;
  /** Link class đã chọn (DB `nameClass`), ưu tiên khi hiển thị. */
  nameClass?: string;
  basePower: number;
  baseCooldown: number;
  maxLevel: number;
  /** Giá mở khóa (mặc định 0). */
  unlockPrice?: number;
  levelStats: LevelStat[];
  status?: 'enabled' | 'disabled';
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

  createItem: async (data: {
    nameId: string;
    image: string;
    basePower: number;
    baseCooldown: number;
    maxLevel?: number;
    unlockPrice?: number;
    levelStats?: LevelStat[];
    className?: string;
    status?: 'enabled' | 'disabled';
  }): Promise<Item> => {
    const response = await api.post<Item>('/items', data);
    return response.data;
  },

  updateItem: async (id: string, data: Partial<Item>): Promise<Item> => {
    const response = await api.patch<Item>(`/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/items/${id}`);
  },
};
