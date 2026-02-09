import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Character } from '../models/Character.js';
import { Equipment } from '../models/Equipment.js';
import { AdventureCard } from '../models/AdventureCard.js';
import { Map } from '../models/Map.js';
import { Payment } from '../models/Payment.js';
import { Localization } from '../models/Localization.js';
import { Item } from '../models/Item.js';

dotenv.config();

/** Generate levelStats for an item (levels 1..maxLevel) */
function buildLevelStats(basePower: number, baseCooldown: number, maxLevel: number) {
  const stats: { power: number; cooldown: number; price: number }[] = [];
  for (let l = 1; l <= maxLevel; l++) {
    stats.push({
      power: Math.round(basePower * (1 + l * 0.15)),
      cooldown: Math.max(0, baseCooldown - l * 0.5),
      price: l * 50,
    });
  }
  return stats;
}

/** Generate character levelStats (level 1..maxLevel, price = level * 100, level 10 = 0) */
function buildCharacterLevelStats(maxLevel: number) {
  const stats: { level: number; price: number }[] = [];
  for (let l = 1; l <= maxLevel; l++) {
    stats.push({
      level: l,
      price: l === maxLevel ? 0 : l * 100,
    });
  }
  return stats;
}

/** Capitalize first letter: eula -> Eula */
function capitalize(nameId: string) {
  return nameId.charAt(0).toUpperCase() + nameId.slice(1).toLowerCase();
}

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Character.deleteMany({});
    await Equipment.deleteMany({});
    await Item.deleteMany({});
    await AdventureCard.deleteMany({});
    await Map.deleteMany({});
    await Payment.deleteMany({});
    await Localization.deleteMany({});

    // Create admin user
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'admin123',
      10
    );
    const admin = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      xu: 10000,
    });
    console.log('Created admin user:', admin.email);

    // Create sample users with varied creation dates for testing
    const passwordHash = await bcrypt.hash('password123', 10);
    const usersData = [];
    const now = new Date();

    for (let i = 1; i <= 25; i++) {
      const daysAgo = Math.floor(Math.random() * 90) + 1; // 1–90 days ago
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);

      usersData.push({
        email: `user${i}@example.com`,
        password: passwordHash,
        role: i === 2 ? 'moderator' : 'user',
        xu: Math.floor(Math.random() * 9500) + 500,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const users = await User.insertMany(usersData);
    console.log(`Created ${users.length} sample users`);

    // Create characters from admin-web/public/assets/images/cards/character (exclude -sprite, unlock)
    const characterImagesPath = path.join(__dirname, '../../../admin-web/public/assets/images/cards/character');
    const characterFiles = fs.existsSync(characterImagesPath)
      ? fs.readdirSync(characterImagesPath)
      : [];
    const characterNameIds = [...new Set(
      characterFiles
        .filter((f) => f.endsWith('.webp') && !f.includes('-sprite') && !f.startsWith('unlock'))
        .map((f) => f.replace('.webp', ''))
    )];

    const nameIdToElement: Record<string, string> = {
      eula: 'cryo',
      furina: 'hydro',
      mavuika: 'pyro',
      nahida: 'dendro',
      raiden: 'electro',
      venti: 'anemo',
      zhongli: 'geo',
    };

    const charactersData = characterNameIds.map((nameId) => ({
      nameId,
      name: capitalize(nameId),
      description: `character.${nameId}.description`,
      element: nameIdToElement[nameId] ?? 'cryo',
      HP: 10,
      maxLevel: 10,
      status: 'enabled' as const,
      levelStats: buildCharacterLevelStats(10),
    }));
    const characters = await Character.insertMany(charactersData);
    console.log(`Created ${characters.length} characters`);

    // Create equipment
    const equipment = await Equipment.insertMany([
      {
        name: 'Iron Sword',
        description: 'Basic weapon',
        slot: 'weapon',
        stats: { attack: 50 },
        status: 'enabled',
      },
      {
        name: 'Leather Armor',
        description: 'Basic armor',
        slot: 'armor',
        stats: { defense: 30, health: 100 },
        status: 'enabled',
      },
      {
        name: 'Power Ring',
        description: 'Increases attack',
        slot: 'accessory',
        stats: { attack: 20 },
        status: 'enabled',
      },
    ]);
    console.log(`Created ${equipment.length} equipment`);

    // Create items from admin-web/public/assets/images/item
    const itemImagesPath = path.join(__dirname, '../../../admin-web/public/assets/images/item');
    const imageFiles = fs.existsSync(itemImagesPath)
      ? fs.readdirSync(itemImagesPath)
      : [];
    const nameIds = imageFiles
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace('.webp', ''));

    const itemsData = nameIds.map((nameId, i) => {
      const basePower = (i % 20) + 1;
      const baseCooldown = (i % 16) + 4;
      const maxLevel = 10;
      return {
        nameId,
        basePower,
        baseCooldown,
        maxLevel,
        levelStats: buildLevelStats(basePower, baseCooldown, maxLevel),
      };
    });
    const items = await Item.insertMany(itemsData);
    console.log(`Created ${items.length} items`);

    // Create adventure cards
    const adventureCards = await AdventureCard.insertMany([
      {
        name: 'Treasure Chest',
        description: 'Find a treasure chest',
        type: 'situation',
        appearanceRate: 15,
        status: 'enabled',
      },
      {
        name: 'Healing Potion',
        description: 'Restore 100 HP',
        type: 'food',
        stats: { health: 100 },
        appearanceRate: 20,
        status: 'enabled',
      },
      {
        name: 'Slime',
        description: 'A weak monster',
        type: 'monster',
        stats: { attack: 30, defense: 20, health: 150 },
        appearanceRate: 30,
        status: 'enabled',
      },
      {
        name: 'Rusty Sword',
        description: 'Temporary weapon',
        type: 'temporary_weapon',
        stats: { attack: 25 },
        appearanceRate: 10,
        status: 'enabled',
      },
    ]);
    console.log(`Created ${adventureCards.length} adventure cards`);

    // Create maps
    const maps = await Map.insertMany([
      {
        name: 'Mondstadt Forest',
        description: 'A peaceful forest',
        deck: [adventureCards[0]._id, adventureCards[1]._id, adventureCards[2]._id],
        status: 'enabled',
      },
      {
        name: 'Liyue Mountains',
        description: 'Dangerous mountain paths',
        deck: [adventureCards[1]._id, adventureCards[2]._id, adventureCards[3]._id],
        status: 'enabled',
      },
    ]);
    console.log(`Created ${maps.length} maps`);

    // Create sample payments with varied dates for testing
    const paymentTemplates = [
      { amount: 9.99, xuReceived: 1000, status: 'success' as const },
      { amount: 19.99, xuReceived: 2000, status: 'success' as const },
      { amount: 4.99, xuReceived: 500, status: 'pending' as const },
      { amount: 49.99, xuReceived: 5500, status: 'success' as const },
      { amount: 29.99, xuReceived: 3200, status: 'success' as const },
      { amount: 99.99, xuReceived: 12000, status: 'success' as const },
      { amount: 14.99, xuReceived: 1500, status: 'success' as const },
    ];
    const paymentsData = [];
    for (let i = 0; i < 20; i++) {
      const tpl = paymentTemplates[i % paymentTemplates.length];
      const daysAgo = Math.floor(Math.random() * 60) + 1;
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);
      paymentsData.push({
        userId: users[i % users.length]._id,
        amount: tpl.amount,
        xuReceived: tpl.xuReceived,
        status: tpl.status,
        transactionId: `TXN${String(i + 1).padStart(3, '0')}`,
        createdAt,
        updatedAt: createdAt,
      });
    }
    const payments = await Payment.insertMany(paymentsData);
    console.log(`Created ${payments.length} payments`);

    // Create localizations from TeyvatCard i18n locales
    const localesPath = path.join(__dirname, '../../../../TeyvatCard/i18n/locales');
    const en = JSON.parse(fs.readFileSync(path.join(localesPath, 'en.json'), 'utf-8')) as Record<string, string>;
    const vi = JSON.parse(fs.readFileSync(path.join(localesPath, 'vi.json'), 'utf-8')) as Record<string, string>;
    const ja = JSON.parse(fs.readFileSync(path.join(localesPath, 'ja.json'), 'utf-8')) as Record<string, string>;
    const allKeys = new Set([...Object.keys(en), ...Object.keys(vi), ...Object.keys(ja)]);
    // Add item localization keys for each seeded item (merge; existing keys from TeyvatCard are not overwritten)
    for (const nameId of nameIds) {
      allKeys.add(`item.${nameId}.name`);
      allKeys.add(`item.${nameId}.description`);
    }
    // Add character localization keys for each seeded character
    for (const nameId of characterNameIds) {
      allKeys.add(`character.${nameId}.description`);
    }
    const localizationsData = Array.from(allKeys).map((key) => ({
      key,
      translations: {
        en: en[key] ?? '',
        vi: vi[key] ?? '',
        ja: ja[key] ?? '',
      },
    }));
    await Localization.insertMany(localizationsData);
    console.log(`Created ${localizationsData.length} localizations`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
