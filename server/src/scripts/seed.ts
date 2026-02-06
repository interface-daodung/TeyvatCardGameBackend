import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Character } from '../models/Character.js';
import { Equipment } from '../models/Equipment.js';
import { AdventureCard } from '../models/AdventureCard.js';
import { Map } from '../models/Map.js';
import { Payment } from '../models/Payment.js';
import { Localization } from '../models/Localization.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Character.deleteMany({});
    await Equipment.deleteMany({});
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

    // Create characters
    const characters = await Character.insertMany([
      {
        name: 'Traveler',
        description: 'The main character',
        stats: { attack: 100, defense: 80, health: 500 },
        status: 'enabled',
      },
      {
        name: 'Paimon',
        description: 'Emergency food',
        stats: { attack: 50, defense: 30, health: 200 },
        status: 'enabled',
      },
      {
        name: 'Unreleased Hero',
        description: 'Coming soon',
        stats: { attack: 120, defense: 100, health: 600 },
        status: 'unreleased',
      },
    ]);
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

    // Create localizations
    await Localization.insertMany([
      {
        key: 'welcome',
        values: {
          en: 'Welcome',
          vi: 'Chào mừng',
        },
      },
      {
        key: 'play',
        values: {
          en: 'Play',
          vi: 'Chơi',
        },
      },
    ]);
    console.log('Created localizations');

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
