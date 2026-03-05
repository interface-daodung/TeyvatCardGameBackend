# TeyvatCard Backend – RAG data snapshot

Generated at: 2026-03-05T14:06:11.654Z
Based on ServerConfigurationVersion v1.6.2.

This file contains a Markdown + JSON snapshot of the current game configuration data from the database, for use as RAG context.

## Summary counts

- Maps: 1
- Adventure cards: 43
- Characters: 7
- Themes: 2
- Items: 12
- Localization keys (en/vi/ja merged object): 3

## MapsData (Maps)

```json
[
  {
    "_id": "698cc02513af330ca30b2635",
    "nameId": "dungeon_abyss_chamber",
    "name": "Abyss Chamber",
    "description": "demo test",
    "typeRatios": {
      "enemies": 9,
      "food": 19,
      "weapons": 22,
      "coins": 8,
      "traps": 18,
      "treasures": 20,
      "bombs": 4
    },
    "deck": [
      "698a14e59f1659f17147dce2",
      "698a14e59f1659f17147dcdd",
      "698a14e59f1659f17147dcfe",
      "698a14e59f1659f17147dcf1",
      "698a14e59f1659f17147dcfd",
      "698a14e59f1659f17147dcfb",
      "698a14e59f1659f17147dcf9",
      "698a14e59f1659f17147dcf0",
      "698a14e59f1659f17147dd00",
      "698a14e59f1659f17147dcf4",
      "698a14e59f1659f17147dcf5",
      "698a14e59f1659f17147dcdf",
      "698a14e59f1659f17147dcf7",
      "698a14e59f1659f17147dcfc",
      "698a14e59f1659f17147dcf8"
    ],
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-11T17:45:09.500Z",
    "updatedAt": "2026-03-01T16:01:32.671Z"
  }
]
```

## CardsData (Adventure cards)

```json
[
  {
    "_id": "698a14e59f1659f17147dcdc",
    "nameId": "sword-steampunk",
    "name": "Sword Steampunk",
    "description": "Sword Steampunk - A glorious and precious sword that increases power and luck.",
    "type": "weapon",
    "category": "sword",
    "rarity": 3,
    "className": "SwordSteampunk",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:13.385Z",
    "image": "/assets/images/cards/weapon/sword/steampunk.webp",
    "durabilityMax": 18,
    "durabilityMin": 4
  },
  {
    "_id": "698a14e59f1659f17147dcdd",
    "nameId": "sword-forest",
    "name": "Sword Forest",
    "description": "Sword Forest - Natural forest swords increase strength and defense.",
    "type": "weapon",
    "category": "sword",
    "rarity": 3,
    "className": "SwordForest",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-03-01T17:55:57.229Z",
    "image": "/assets/images/cards/weapon/sword/forest.webp",
    "durabilityMax": 6,
    "durabilityMin": 1,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcde",
    "nameId": "sword-skyward",
    "name": "Sword Skyward",
    "description": "Sword Skyward - The Sacred Sky Sword increases strength and speed.",
    "type": "weapon",
    "category": "sword",
    "rarity": 4,
    "className": "SwordSkyward",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T19:40:18.721Z",
    "image": "/assets/images/cards/weapon/sword/skyward.webp",
    "durabilityMax": 16,
    "durabilityMin": 7,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcdf",
    "nameId": "sword-splendor",
    "name": "Sword Splendor",
    "description": "Sword Splendor - A precious, glorious sword that increases power and luck.",
    "type": "weapon",
    "category": "sword",
    "rarity": 4,
    "className": "SwordSplendor",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-22T10:43:45.554Z",
    "image": "/assets/images/cards/weapon/sword/splendor.webp",
    "durabilityMax": 17,
    "durabilityMin": 6
  },
  {
    "_id": "698a14e59f1659f17147dce0",
    "nameId": "sword-traveler",
    "name": "Sword Traveler",
    "description": "Sword Traveler - Sword Traveler enhances strength and adaptability.",
    "type": "weapon",
    "category": "sword",
    "rarity": 4,
    "className": "SwordTraveler",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:11.587Z",
    "image": "/assets/images/cards/weapon/sword/traveler.webp",
    "durabilityMax": 10,
    "durabilityMin": 4
  },
  {
    "_id": "698a14e59f1659f17147dce1",
    "nameId": "sword-sacrificial",
    "name": "Sword Sacrificial",
    "description": "Sword Sacrificial - A powerful sacrificial sword, but with low durability.",
    "type": "weapon",
    "category": "sword",
    "rarity": 4,
    "className": "SwordSacrificial",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-22T10:43:47.804Z",
    "image": "/assets/images/cards/weapon/sword/sacrificial.webp",
    "durabilityMax": 14,
    "durabilityMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dce2",
    "nameId": "anemo-samachurl",
    "name": "Anemo Samachurl",
    "description": "Anemo Samachurl - A wind caster enemy who can create wind and slow down players.",
    "type": "enemy",
    "element": "anemo",
    "clan": "hilichurl",
    "rarity": 3,
    "className": "AnemoSamachurl",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:10.360Z",
    "image": "/assets/images/cards/enemy/hilichurl/anemo-samachurl.webp",
    "healthMax": 15,
    "healthMin": 1,
    "scoreMax": 10,
    "scoreMin": 4
  },
  {
    "_id": "698a14e59f1659f17147dce3",
    "nameId": "electro-samachurl",
    "name": "Electro Samachurl",
    "description": "Electro Samachurl - Kẻ địch caster điện có thể gây shock và làm chậm người chơi.",
    "type": "enemy",
    "element": "electro",
    "clan": "hilichurl",
    "rarity": 2,
    "className": "ElectroSamachurl",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:19.406Z",
    "image": "/assets/images/cards/enemy/hilichurl/electro-samachurl.webp",
    "healthMax": 11,
    "healthMin": 1,
    "scoreMax": 13,
    "scoreMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dce4",
    "nameId": "dendro-samachurl",
    "name": "Dendro Samachurl",
    "description": "Dendro Samachurl - A grass-casting enemy that can create plants and inflict poison.",
    "type": "enemy",
    "element": "dendro",
    "clan": "hilichurl",
    "rarity": 2,
    "className": "DendroSamachurl",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:04.171Z",
    "image": "/assets/images/cards/enemy/hilichurl/dendro-samachurl.webp",
    "healthMax": 13,
    "healthMin": 4,
    "scoreMax": 10,
    "scoreMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dce5",
    "nameId": "geo-samachurl",
    "name": "Geo Samachurl",
    "description": "Geo Samachurl - Local caster enemies can create walls and stun enemies.",
    "type": "enemy",
    "element": "geo",
    "clan": "hilichurl",
    "rarity": 4,
    "className": "GeoSamachurl",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-03-01T17:43:01.544Z",
    "image": "/assets/images/cards/enemy/hilichurl/geo-samachurl.webp",
    "healthMax": 15,
    "healthMin": 5,
    "scoreMax": 11,
    "scoreMin": 5,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dce6",
    "nameId": "hydro-samachurl",
    "name": "Hydro Samachurl",
    "description": "Hydro Samachurl - A hydraulic caster enemy that can create water and cause wet effects.",
    "type": "enemy",
    "element": "hydro",
    "clan": "hilichurl",
    "rarity": 2,
    "className": "HydroSamachurl",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:26.221Z",
    "image": "/assets/images/cards/enemy/hilichurl/hydro-samachurl.webp",
    "healthMax": 10,
    "healthMin": 2,
    "scoreMax": 10,
    "scoreMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dce7",
    "nameId": "fighter",
    "name": "Hilichurl Fighter",
    "description": "Hilichurl Fighter - A basic enemy that can attack the player.",
    "type": "enemy",
    "element": "physical",
    "clan": "hilichurl",
    "rarity": 1,
    "className": "HilichurlFighter",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:16.880Z",
    "image": "/assets/images/cards/enemy/hilichurl/fighter.webp",
    "scoreMax": 10,
    "scoreMin": 5,
    "healthMax": 10,
    "healthMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dce8",
    "nameId": "hilistray-water",
    "name": "Hilistray Water",
    "description": "Hilistray Water - A water-based enemy with healing and wetness-inducing abilities.",
    "type": "enemy",
    "element": "hydro",
    "clan": "hilichurl",
    "rarity": 5,
    "className": "HilistrayWater",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-03-01T16:04:43.466Z",
    "image": "/assets/images/cards/enemy/hilichurl/hilistray-water.webp",
    "scoreMax": 12,
    "scoreMin": 1,
    "contents": [],
    "healthMax": 11,
    "healthMin": 2
  },
  {
    "_id": "698a14e59f1659f17147dce9",
    "nameId": "wooden-shieldwall",
    "name": "Wooden Shieldwall",
    "description": "Wooden Shieldwall - Kẻ địch tường gỗ, có khả năng phòng thủ trung bình và dễ bị cháy.",
    "type": "enemy",
    "element": "dendro",
    "clan": "hilichurl",
    "rarity": 4,
    "className": "WoodenShieldwall",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:53:16.187Z",
    "image": "/assets/images/cards/enemy/hilichurl/wooden-shieldwall.webp",
    "healthMax": 22,
    "healthMin": 8,
    "scoreMax": 14,
    "scoreMin": 5,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcea",
    "nameId": "lawachurl",
    "name": "Lawachurl",
    "description": "Lawachurl - Boss Hilichurl mạnh mẽ, có khả năng tấn công và phòng thủ cao.",
    "type": "enemy",
    "element": "geo",
    "clan": "hilichurl",
    "rarity": 1,
    "className": "Lawachurl",
    "appearanceRate": 5,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:23.155Z",
    "image": "/assets/images/cards/enemy/hilichurl/lawachurl.webp",
    "healthMax": 30,
    "healthMin": 10,
    "scoreMax": 15,
    "scoreMin": 5
  },
  {
    "_id": "698a14e59f1659f17147dceb",
    "nameId": "rock-shieldwall",
    "name": "Rock Shieldwall",
    "description": "Rock Shieldwall - A rock wall enemy with very high defensive capabilities and excellent resistance.",
    "type": "enemy",
    "element": "geo",
    "clan": "hilichurl",
    "rarity": 4,
    "className": "RockShieldwall",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:53:21.464Z",
    "image": "/assets/images/cards/enemy/hilichurl/rock-shieldwall.webp",
    "healthMax": 18,
    "healthMin": 5,
    "scoreMax": 14,
    "scoreMin": 4,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcec",
    "nameId": "berserker",
    "name": "Berserker",
    "description": "Berserker - A berserk enemy who attacks more fiercely when their health is low.",
    "type": "enemy",
    "element": "pyro",
    "clan": "hilichurl",
    "rarity": 5,
    "className": "Berserker",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:09.241Z",
    "image": "/assets/images/cards/enemy/hilichurl/berserker.webp",
    "healthMax": 15,
    "healthMin": 5,
    "scoreMax": 12,
    "scoreMin": 5
  },
  {
    "_id": "698a14e59f1659f17147dced",
    "nameId": "blazing",
    "name": "Blazing",
    "description": "Blazing - Enemies burn continuously, dealing damage over time to nearby players.",
    "type": "enemy",
    "element": "pyro",
    "clan": "hilichurl",
    "rarity": 3,
    "className": "Blazing",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:07.361Z",
    "image": "/assets/images/cards/enemy/hilichurl/blazing.webp",
    "healthMax": 17,
    "healthMin": 7,
    "scoreMax": 13,
    "scoreMin": 3
  },
  {
    "_id": "698a14e59f1659f17147dcee",
    "nameId": "ice-shieldwall",
    "name": "Ice Shieldwall",
    "description": "Ice Shieldwall - An enemy wall of ice, with high defense and the ability to slow down the player.",
    "type": "enemy",
    "element": "cryo",
    "clan": "hilichurl",
    "rarity": 4,
    "className": "IceShieldwall",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:53:10.686Z",
    "image": "/assets/images/cards/enemy/hilichurl/ice-shieldwall.webp",
    "healthMax": 20,
    "healthMin": 7,
    "scoreMax": 10,
    "scoreMin": 1,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcef",
    "nameId": "shooter",
    "name": "Shooter",
    "description": "Shooter - An enemy who shoots arrows from a distance, basic attack.",
    "type": "enemy",
    "element": "physical",
    "clan": "hilichurl",
    "rarity": 5,
    "className": "Shooter",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:29.388Z",
    "image": "/assets/images/cards/enemy/hilichurl/shooter.webp",
    "healthMax": 12,
    "healthMin": 2,
    "scoreMax": 10,
    "scoreMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dcf0",
    "nameId": "crackling",
    "name": "Crackling",
    "description": "Crackling - Enemies explode upon death, dealing damage to nearby players.",
    "type": "enemy",
    "element": "electro",
    "clan": "hilichurl",
    "rarity": 3,
    "className": "Crackling",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:05.803Z",
    "image": "/assets/images/cards/enemy/hilichurl/crackling.webp",
    "healthMax": 17,
    "healthMin": 7,
    "scoreMax": 10,
    "scoreMin": 3
  },
  {
    "_id": "698a14e59f1659f17147dcf1",
    "nameId": "cryo-shooter",
    "name": "Cryo Shooter",
    "description": "Cryo Shooter - An enemy that shoots ice from a distance, capable of slowing down and freezing the player.",
    "type": "enemy",
    "element": "cryo",
    "clan": "hilichurl",
    "rarity": 5,
    "className": "CryoShooter",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:51:44.269Z",
    "image": "/assets/images/cards/enemy/hilichurl/cryo-shooter.webp",
    "scoreMax": 10,
    "scoreMin": 1,
    "healthMax": 12,
    "healthMin": 1,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcf2",
    "nameId": "electro-shooter",
    "name": "Electro Shooter",
    "description": "Electro Shooter - An enemy that shoots electricity from a distance, capable of shocking and slowing the player.",
    "type": "enemy",
    "element": "electro",
    "clan": "hilichurl",
    "rarity": 4,
    "className": "ElectroShooter",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:52:26.080Z",
    "image": "/assets/images/cards/enemy/hilichurl/electro-shooter.webp",
    "healthMax": 13,
    "healthMin": 1,
    "scoreMax": 16,
    "scoreMin": 3,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcf3",
    "nameId": "life-essence",
    "name": "Life Essence",
    "description": "Life Essence - The essence of life for maximum health recovery and enhancement of all indicators.",
    "type": "food",
    "className": "LifeEssence",
    "appearanceRate": 15,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:31:40.264Z",
    "image": "/assets/images/cards/food/life-essence.webp",
    "foodMax": 10,
    "foodMin": 6,
    "rarity": 5
  },
  {
    "_id": "698a14e59f1659f17147dcf4",
    "nameId": "mystique-soup",
    "name": "Mystique Soup",
    "description": "Mystique Soup - Súp bí ẩn hồi phục sức khỏe và tăng sức mạnh tạm thời.",
    "type": "food",
    "rarity": 1,
    "className": "MystiqueSoup",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T10:52:04.917Z",
    "image": "/assets/images/cards/food/mystique-soup.webp",
    "foodMax": 3,
    "foodMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dcf5",
    "nameId": "pizza",
    "name": "Pizza",
    "description": "Pizza - Italian pizza restores health and boosts attacking power.",
    "type": "food",
    "rarity": 2,
    "className": "Pizza",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-25T09:32:30.493Z",
    "image": "/assets/images/cards/food/pizza.webp",
    "foodMax": 6,
    "foodMin": 3
  },
  {
    "_id": "698a14e59f1659f17147dcf6",
    "nameId": "roast-chicken",
    "name": "Roast Chicken",
    "description": "Roast Chicken - Gà nướng thơm ngon hồi phục sức khỏe và tăng khả năng phòng thủ.",
    "type": "food",
    "rarity": 3,
    "className": "RoastChicken",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-22T10:41:46.648Z",
    "image": "/assets/images/cards/food/roast-chicken.webp",
    "foodMax": 16,
    "foodMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dcf7",
    "nameId": "macarons",
    "name": "Macarons",
    "description": "Macarons - Bánh ngọt Pháp hồi phục sức khỏe và tăng tinh thần.",
    "type": "food",
    "rarity": 3,
    "className": "Macarons",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-22T10:41:50.341Z",
    "image": "/assets/images/cards/food/macarons.webp",
    "foodMax": 9,
    "foodMin": 6
  },
  {
    "_id": "698a14e59f1659f17147dcf8",
    "nameId": "abyss-call",
    "name": "AbyssCall",
    "description": "AbyssCall - A trap that summons additional enemies into the battle when activated.",
    "type": "trap",
    "className": "AbyssCall",
    "appearanceRate": 15,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:53:47.234Z",
    "image": "/assets/images/cards/trap/abyss-call.webp",
    "damageMax": 10,
    "damageMin": 1,
    "rarity": 2,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcf9",
    "nameId": "quicksand",
    "name": "Quicksand",
    "description": "Quicksand - Bẫy cát lún gây damage và làm chậm người chơi khi kích hoạt.",
    "type": "trap",
    "rarity": 2,
    "className": "Quicksand",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-22T10:39:56.919Z",
    "image": "/assets/images/cards/trap/quicksand.webp",
    "damageMax": 10,
    "damageMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dcfa",
    "nameId": "breathe-fire",
    "name": "Breathe Fire",
    "description": "Breathe Fire - A fire trap that deals damage to the player when activated.",
    "type": "trap",
    "rarity": 2,
    "className": "BreatheFire",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-22T10:39:07.054Z",
    "image": "/assets/images/cards/trap/breathe-fire.webp",
    "damageMax": 10,
    "damageMin": 1
  },
  {
    "_id": "698a14e59f1659f17147dcfb",
    "nameId": "chest",
    "name": "Chest",
    "description": "Chest - The main treasure chest containing various valuable rewards.",
    "type": "treasure",
    "rarity": 4,
    "className": "Chest",
    "appearanceRate": 9,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:31:06.745Z",
    "image": "/assets/images/cards/treasure/chest.webp",
    "durabilityMax": 6,
    "durabilityMin": 1,
    "contents": [
      "GeoFragment",
      "HydroFragment",
      "AnemoFragment",
      "ElectroFragment",
      "CryoFragment",
      "DendroFragment",
      "SwordSplendor",
      "SwordSkyward",
      "SwordTraveler",
      "SwordForest",
      "SwordSteampunk",
      "RoastChicken",
      "Pizza",
      "Macarons",
      "SwordSacrificial"
    ]
  },
  {
    "_id": "698a14e59f1659f17147dcfc",
    "nameId": "bribery",
    "name": "Bribery",
    "description": "Bribery - Bribery to receive rewards greater than the cost.",
    "type": "treasure",
    "rarity": 3,
    "className": "Bribery",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-03-01T16:03:53.702Z",
    "image": "/assets/images/cards/treasure/bribery.webp",
    "durabilityMax": 11,
    "durabilityMin": 3,
    "contents": [
      "MystiqueSoup",
      "Explosive",
      "Quicksand"
    ]
  },
  {
    "_id": "698a14e59f1659f17147dcfd",
    "nameId": "gold-mine",
    "name": "GoldMine",
    "description": "GoldMine - A mine to extract resources.",
    "type": "treasure",
    "rarity": 3,
    "className": "GoldMine",
    "appearanceRate": 17,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-28T18:29:42.775Z",
    "image": "/assets/images/cards/treasure/gold-mine.webp",
    "durabilityMax": 10,
    "durabilityMin": 1,
    "contents": [
      "GeoFragment",
      "HydroFragment",
      "AnemoFragment",
      "ElectroFragment",
      "CryoFragment",
      "DendroFragment"
    ]
  },
  {
    "_id": "698a14e59f1659f17147dcfe",
    "nameId": "explosive",
    "name": "Explosive",
    "description": "Explosive - A bomb that explodes and damages everything within a radius.",
    "type": "bomb",
    "rarity": 3,
    "className": "Explosive",
    "appearanceRate": 13,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-03-01T05:35:11.405Z",
    "image": "/assets/images/cards/bomb/explosive.webp",
    "countdown": 3,
    "damageMax": 8,
    "damageMin": 3,
    "contents": []
  },
  {
    "_id": "698a14e59f1659f17147dcff",
    "nameId": "pyro-fragment",
    "name": "Mảnh Vỡ Nguyên Tố Hỏa",
    "description": "Mảnh Vỡ Nguyên Tố Hỏa nhặt có thể đổi Xu và hồi chút năng lượng.",
    "type": "coin",
    "element": "pyro",
    "rarity": 1,
    "className": "PyroFragment",
    "appearanceRate": 20,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.283Z",
    "updatedAt": "2026-02-22T10:40:51.383Z",
    "image": "/assets/images/cards/coin/pyro-fragment.webp"
  },
  {
    "_id": "698a14e59f1659f17147dd00",
    "nameId": "hydro-fragment",
    "name": "Water Element Fragment",
    "description": "Collected Water Elemental Fragments can be exchanged for Coins and restore a small amount of energy.",
    "type": "coin",
    "element": "hydro",
    "rarity": 1,
    "className": "HydroFragment",
    "appearanceRate": 20,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.284Z",
    "updatedAt": "2026-02-22T10:41:00.077Z",
    "image": "/assets/images/cards/coin/hydro-fragment.webp"
  },
  {
    "_id": "698a14e59f1659f17147dd01",
    "nameId": "geo-fragment",
    "name": "Mảnh Vỡ Nguyên Tố Nham",
    "description": "Mảnh Vỡ Nguyên Tố Nham nhặt có thể đổi Xu và hồi chút năng lượng.",
    "type": "coin",
    "element": "geo",
    "rarity": 1,
    "className": "GeoFragment",
    "appearanceRate": 20,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.284Z",
    "updatedAt": "2026-02-22T10:40:52.860Z",
    "image": "/assets/images/cards/coin/geo-fragment.webp"
  },
  {
    "_id": "698a14e59f1659f17147dd02",
    "nameId": "anemo-fragment",
    "name": "Wind Element Fragment",
    "description": "Wind Elemental Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "type": "coin",
    "element": "anemo",
    "rarity": 1,
    "className": "AnemoFragment",
    "appearanceRate": 20,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.284Z",
    "updatedAt": "2026-02-22T10:40:58.680Z",
    "image": "/assets/images/cards/coin/anemo-fragment.webp"
  },
  {
    "_id": "698a14e59f1659f17147dd03",
    "nameId": "electro-fragment",
    "name": "Lightning Element Fragment",
    "description": "Lightning Elemental Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "type": "coin",
    "element": "electro",
    "rarity": 1,
    "className": "ElectroFragment",
    "appearanceRate": 20,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.284Z",
    "updatedAt": "2026-02-22T10:40:55.854Z",
    "image": "/assets/images/cards/coin/electro-fragment.webp"
  },
  {
    "_id": "698a14e59f1659f17147dd04",
    "nameId": "cryo-fragment",
    "name": "Ice Element Fragment",
    "description": "Ice Elemental Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "type": "coin",
    "element": "cryo",
    "rarity": 1,
    "className": "CryoFragment",
    "appearanceRate": 20,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.284Z",
    "updatedAt": "2026-02-22T10:40:54.451Z",
    "image": "/assets/images/cards/coin/cryo-fragment.webp"
  },
  {
    "_id": "698a14e59f1659f17147dd05",
    "nameId": "dendro-fragment",
    "name": "Fragment of the Elemental Herb",
    "description": "The Elemental Herb Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "type": "coin",
    "element": "dendro",
    "rarity": 1,
    "className": "DendroFragment",
    "appearanceRate": 20,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.284Z",
    "updatedAt": "2026-02-22T10:40:49.713Z",
    "image": "/assets/images/cards/coin/dendro-fragment.webp"
  },
  {
    "_id": "698a14e59f1659f17147dd06",
    "nameId": "empty",
    "name": "Empty",
    "description": "Empty - An empty card has no effect.",
    "type": "empty",
    "className": "Empty",
    "appearanceRate": 10,
    "status": "enabled",
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.284Z",
    "updatedAt": "2026-02-22T10:40:57.087Z",
    "image": "/assets/images/cards/empty/empty.webp"
  }
]
```

## CharacterData (Characters)

```json
[
  {
    "_id": "698a14e59f1659f17147dcc3",
    "nameId": "eula",
    "name": "Eula",
    "description": "character.eula.description",
    "element": "cryo",
    "HP": 10,
    "maxLevel": 10,
    "status": "enabled",
    "levelStats": [
      {
        "level": 1,
        "price": 100
      },
      {
        "level": 2,
        "price": 200
      },
      {
        "level": 3,
        "price": 300
      },
      {
        "level": 4,
        "price": 400
      },
      {
        "level": 5,
        "price": 500
      },
      {
        "level": 6,
        "price": 600
      },
      {
        "level": 7,
        "price": 700
      },
      {
        "level": 8,
        "price": 800
      },
      {
        "level": 9,
        "price": 900
      },
      {
        "level": 10,
        "price": 0
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.223Z",
    "updatedAt": "2026-02-22T10:44:59.633Z"
  },
  {
    "_id": "698a14e59f1659f17147dcc4",
    "nameId": "furina",
    "name": "Furina",
    "description": "character.furina.description",
    "element": "hydro",
    "HP": 12,
    "maxLevel": 10,
    "status": "enabled",
    "levelStats": [
      {
        "level": 1,
        "price": 100
      },
      {
        "level": 2,
        "price": 200
      },
      {
        "level": 3,
        "price": 300
      },
      {
        "level": 4,
        "price": 400
      },
      {
        "level": 5,
        "price": 500
      },
      {
        "level": 6,
        "price": 600
      },
      {
        "level": 7,
        "price": 700
      },
      {
        "level": 8,
        "price": 800
      },
      {
        "level": 9,
        "price": 900
      },
      {
        "level": 10,
        "price": 0
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.224Z",
    "updatedAt": "2026-02-22T10:44:35.763Z"
  },
  {
    "_id": "698a14e59f1659f17147dcc5",
    "nameId": "mavuika",
    "name": "Mavuika",
    "description": "character.mavuika.description",
    "element": "pyro",
    "HP": 8,
    "maxLevel": 10,
    "status": "enabled",
    "levelStats": [
      {
        "level": 1,
        "price": 100
      },
      {
        "level": 2,
        "price": 200
      },
      {
        "level": 3,
        "price": 300
      },
      {
        "level": 4,
        "price": 400
      },
      {
        "level": 5,
        "price": 500
      },
      {
        "level": 6,
        "price": 600
      },
      {
        "level": 7,
        "price": 700
      },
      {
        "level": 8,
        "price": 800
      },
      {
        "level": 9,
        "price": 900
      },
      {
        "level": 10,
        "price": 0
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.224Z",
    "updatedAt": "2026-02-22T10:45:23.224Z"
  },
  {
    "_id": "698a14e59f1659f17147dcc6",
    "nameId": "nahida",
    "name": "Nahida",
    "description": "character.nahida.description",
    "element": "dendro",
    "HP": 8,
    "maxLevel": 10,
    "status": "enabled",
    "levelStats": [
      {
        "level": 1,
        "price": 100
      },
      {
        "level": 2,
        "price": 200
      },
      {
        "level": 3,
        "price": 300
      },
      {
        "level": 4,
        "price": 400
      },
      {
        "level": 5,
        "price": 500
      },
      {
        "level": 6,
        "price": 600
      },
      {
        "level": 7,
        "price": 700
      },
      {
        "level": 8,
        "price": 800
      },
      {
        "level": 9,
        "price": 900
      },
      {
        "level": 10,
        "price": 0
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.224Z",
    "updatedAt": "2026-02-22T10:45:12.578Z"
  },
  {
    "_id": "698a14e59f1659f17147dcc7",
    "nameId": "raiden",
    "name": "Raiden",
    "description": "character.raiden.description",
    "element": "electro",
    "HP": 8,
    "maxLevel": 10,
    "status": "enabled",
    "levelStats": [
      {
        "level": 1,
        "price": 100
      },
      {
        "level": 2,
        "price": 200
      },
      {
        "level": 3,
        "price": 300
      },
      {
        "level": 4,
        "price": 400
      },
      {
        "level": 5,
        "price": 500
      },
      {
        "level": 6,
        "price": 600
      },
      {
        "level": 7,
        "price": 700
      },
      {
        "level": 8,
        "price": 800
      },
      {
        "level": 9,
        "price": 900
      },
      {
        "level": 10,
        "price": 0
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.224Z",
    "updatedAt": "2026-02-22T10:45:17.498Z"
  },
  {
    "_id": "698a14e59f1659f17147dcc8",
    "nameId": "venti",
    "name": "Venti",
    "description": "character.venti.description",
    "element": "anemo",
    "HP": 8,
    "maxLevel": 10,
    "status": "enabled",
    "levelStats": [
      {
        "level": 1,
        "price": 100
      },
      {
        "level": 2,
        "price": 200
      },
      {
        "level": 3,
        "price": 300
      },
      {
        "level": 4,
        "price": 400
      },
      {
        "level": 5,
        "price": 500
      },
      {
        "level": 6,
        "price": 600
      },
      {
        "level": 7,
        "price": 700
      },
      {
        "level": 8,
        "price": 800
      },
      {
        "level": 9,
        "price": 900
      },
      {
        "level": 10,
        "price": 0
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.224Z",
    "updatedAt": "2026-02-22T10:45:06.236Z"
  },
  {
    "_id": "698a14e59f1659f17147dcc9",
    "nameId": "zhongli",
    "name": "Zhongli",
    "description": "character.zhongli.description",
    "element": "geo",
    "HP": 6,
    "maxLevel": 10,
    "status": "enabled",
    "levelStats": [
      {
        "level": 1,
        "price": 100
      },
      {
        "level": 2,
        "price": 200
      },
      {
        "level": 3,
        "price": 300
      },
      {
        "level": 4,
        "price": 400
      },
      {
        "level": 5,
        "price": 500
      },
      {
        "level": 6,
        "price": 600
      },
      {
        "level": 7,
        "price": 700
      },
      {
        "level": 8,
        "price": 800
      },
      {
        "level": 9,
        "price": 900
      },
      {
        "level": 10,
        "price": 0
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.225Z",
    "updatedAt": "2026-02-22T10:45:33.461Z"
  }
]
```

## ThemeData (Themes)

```json
[
  {
    "_id": "69949786f09875196a66e410",
    "name": "default",
    "colors": {
      "primary": "#95245b",
      "secondary": "#96576a",
      "accent": "#FFD700",
      "neutral": "#e0e0e0",
      "background": "#000000",
      "surface": "#1a1a2e",
      "text": "#ffffff"
    },
    "createdAt": "2026-02-17T16:29:58.462Z",
    "updatedAt": "2026-02-17T16:29:58.462Z",
    "__v": 0
  },
  {
    "_id": "69a73e9ddd6dd2d0db654f23",
    "name": "blue",
    "colors": {
      "primary": "#525dff",
      "secondary": "#1ccac7",
      "accent": "#fbdf41",
      "neutral": "#e0e0e0",
      "background": "#000000",
      "surface": "#4b4bd2",
      "text": "#ffffff"
    },
    "createdAt": "2026-03-03T20:03:41.797Z",
    "updatedAt": "2026-03-05T14:06:04.000Z",
    "__v": 0
  }
]
```

## ItemData (Items / consumables)

```json
[
  {
    "_id": "698a14e59f1659f17147dccf",
    "nameId": "black-hole",
    "basePower": 0,
    "baseCooldown": 20,
    "maxLevel": 10,
    "levelStats": [
      {
        "power": 0,
        "cooldown": 20,
        "price": 500
      },
      {
        "power": 0,
        "cooldown": 19,
        "price": 100
      },
      {
        "power": 0,
        "cooldown": 18,
        "price": 150
      },
      {
        "power": 0,
        "cooldown": 17,
        "price": 200
      },
      {
        "power": 0,
        "cooldown": 16,
        "price": 250
      },
      {
        "power": 0,
        "cooldown": 15,
        "price": 300
      },
      {
        "power": 0,
        "cooldown": 14,
        "price": 350
      },
      {
        "power": 0,
        "cooldown": 13,
        "price": 400
      },
      {
        "power": 0,
        "cooldown": 12,
        "price": 450
      },
      {
        "power": 0,
        "cooldown": 11,
        "price": 500
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.263Z",
    "updatedAt": "2026-02-26T14:29:07.579Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd0",
    "nameId": "catalyst",
    "basePower": 2,
    "baseCooldown": 20,
    "maxLevel": 10,
    "levelStats": [
      {
        "power": 2,
        "cooldown": 20,
        "price": 500
      },
      {
        "power": 3,
        "cooldown": 20,
        "price": 100
      },
      {
        "power": 4,
        "cooldown": 20,
        "price": 150
      },
      {
        "power": 5,
        "cooldown": 20,
        "price": 200
      },
      {
        "power": 6,
        "cooldown": 20,
        "price": 250
      },
      {
        "power": 7,
        "cooldown": 20,
        "price": 300
      },
      {
        "power": 8,
        "cooldown": 20,
        "price": 350
      },
      {
        "power": 9,
        "cooldown": 20,
        "price": 400
      },
      {
        "power": 10,
        "cooldown": 20,
        "price": 450
      },
      {
        "power": 12,
        "cooldown": 20,
        "price": 500
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T15:28:29.783Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd1",
    "nameId": "claw",
    "basePower": 3,
    "baseCooldown": 20,
    "maxLevel": 10,
    "levelStats": [
      {
        "power": 3,
        "cooldown": 20,
        "price": 50
      },
      {
        "power": 4,
        "cooldown": 20,
        "price": 100
      },
      {
        "power": 4,
        "cooldown": 19,
        "price": 150
      },
      {
        "power": 5,
        "cooldown": 19,
        "price": 200
      },
      {
        "power": 5,
        "cooldown": 18,
        "price": 250
      },
      {
        "power": 6,
        "cooldown": 18,
        "price": 300
      },
      {
        "power": 6,
        "cooldown": 17,
        "price": 350
      },
      {
        "power": 7,
        "cooldown": 17,
        "price": 400
      },
      {
        "power": 7,
        "cooldown": 16,
        "price": 450
      },
      {
        "power": 9,
        "cooldown": 16,
        "price": 500
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T14:46:45.480Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd2",
    "nameId": "cooldown",
    "basePower": 5,
    "baseCooldown": 30,
    "maxLevel": 11,
    "levelStats": [
      {
        "power": 5,
        "cooldown": 30,
        "price": 50
      },
      {
        "power": 5,
        "cooldown": 29,
        "price": 100
      },
      {
        "power": 6,
        "cooldown": 28,
        "price": 150
      },
      {
        "power": 6,
        "cooldown": 27,
        "price": 200
      },
      {
        "power": 7,
        "cooldown": 26,
        "price": 250
      },
      {
        "power": 7,
        "cooldown": 25,
        "price": 300
      },
      {
        "power": 8,
        "cooldown": 24,
        "price": 350
      },
      {
        "power": 8,
        "cooldown": 23,
        "price": 400
      },
      {
        "power": 9,
        "cooldown": 22,
        "price": 450
      },
      {
        "power": 9,
        "cooldown": 21,
        "price": 500
      },
      {
        "power": 10,
        "cooldown": 20,
        "price": 1000
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T14:57:18.543Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd3",
    "nameId": "corruption",
    "basePower": 1,
    "baseCooldown": 0,
    "maxLevel": 3,
    "levelStats": [
      {
        "power": 1,
        "cooldown": 0,
        "price": 5000
      },
      {
        "power": 2,
        "cooldown": 0,
        "price": 1000
      },
      {
        "power": 3,
        "cooldown": 0,
        "price": 2000
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T15:01:57.759Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd4",
    "nameId": "healing-potion",
    "basePower": 5,
    "baseCooldown": 20,
    "maxLevel": 9,
    "levelStats": [
      {
        "power": 5,
        "cooldown": 20,
        "price": 500
      },
      {
        "power": 6,
        "cooldown": 19,
        "price": 200
      },
      {
        "power": 7,
        "cooldown": 18,
        "price": 300
      },
      {
        "power": 8,
        "cooldown": 17,
        "price": 400
      },
      {
        "power": 9,
        "cooldown": 16,
        "price": 500
      },
      {
        "power": 10,
        "cooldown": 15,
        "price": 600
      },
      {
        "power": 10,
        "cooldown": 14,
        "price": 700
      },
      {
        "power": 11,
        "cooldown": 13,
        "price": 800
      },
      {
        "power": 12,
        "cooldown": 12,
        "price": 900
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T15:04:58.638Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd5",
    "nameId": "refinement",
    "basePower": 5,
    "baseCooldown": 20,
    "maxLevel": 10,
    "levelStats": [
      {
        "power": 5,
        "cooldown": 20,
        "price": 50
      },
      {
        "power": 6,
        "cooldown": 20,
        "price": 100
      },
      {
        "power": 6,
        "cooldown": 19,
        "price": 150
      },
      {
        "power": 7,
        "cooldown": 19,
        "price": 200
      },
      {
        "power": 7,
        "cooldown": 18,
        "price": 250
      },
      {
        "power": 8,
        "cooldown": 18,
        "price": 300
      },
      {
        "power": 8,
        "cooldown": 16,
        "price": 350
      },
      {
        "power": 9,
        "cooldown": 16,
        "price": 400
      },
      {
        "power": 9,
        "cooldown": 15,
        "price": 450
      },
      {
        "power": 10,
        "cooldown": 15,
        "price": 500
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T15:11:05.655Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd6",
    "nameId": "repair",
    "basePower": 8,
    "baseCooldown": 20,
    "maxLevel": 9,
    "levelStats": [
      {
        "power": 8,
        "cooldown": 20,
        "price": 50
      },
      {
        "power": 9,
        "cooldown": 20,
        "price": 100
      },
      {
        "power": 9,
        "cooldown": 19,
        "price": 150
      },
      {
        "power": 10,
        "cooldown": 19,
        "price": 200
      },
      {
        "power": 10,
        "cooldown": 18,
        "price": 250
      },
      {
        "power": 11,
        "cooldown": 18,
        "price": 300
      },
      {
        "power": 11,
        "cooldown": 17,
        "price": 350
      },
      {
        "power": 12,
        "cooldown": 17,
        "price": 400
      },
      {
        "power": 12,
        "cooldown": 16,
        "price": 450
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T15:13:59.563Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd7",
    "nameId": "seasoning",
    "basePower": 5,
    "baseCooldown": 20,
    "maxLevel": 10,
    "levelStats": [
      {
        "power": 5,
        "cooldown": 20,
        "price": 50
      },
      {
        "power": 6,
        "cooldown": 20,
        "price": 100
      },
      {
        "power": 6,
        "cooldown": 19,
        "price": 150
      },
      {
        "power": 7,
        "cooldown": 19,
        "price": 200
      },
      {
        "power": 7,
        "cooldown": 18,
        "price": 250
      },
      {
        "power": 8,
        "cooldown": 18,
        "price": 300
      },
      {
        "power": 8,
        "cooldown": 17,
        "price": 350
      },
      {
        "power": 9,
        "cooldown": 17,
        "price": 400
      },
      {
        "power": 9,
        "cooldown": 16,
        "price": 450
      },
      {
        "power": 10,
        "cooldown": 16,
        "price": 500
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T15:25:43.586Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd8",
    "nameId": "sword",
    "basePower": 2,
    "baseCooldown": 20,
    "maxLevel": 10,
    "levelStats": [
      {
        "power": 2,
        "cooldown": 1,
        "price": 50
      },
      {
        "power": 3,
        "cooldown": 20,
        "price": 100
      },
      {
        "power": 4,
        "cooldown": 20,
        "price": 150
      },
      {
        "power": 5,
        "cooldown": 20,
        "price": 200
      },
      {
        "power": 6,
        "cooldown": 20,
        "price": 250
      },
      {
        "power": 7,
        "cooldown": 20,
        "price": 300
      },
      {
        "power": 8,
        "cooldown": 20,
        "price": 350
      },
      {
        "power": 9,
        "cooldown": 20,
        "price": 400
      },
      {
        "power": 10,
        "cooldown": 20,
        "price": 450
      },
      {
        "power": 12,
        "cooldown": 20,
        "price": 500
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-03-01T08:19:56.540Z"
  },
  {
    "_id": "698a14e59f1659f17147dcd9",
    "nameId": "tax-waiver",
    "basePower": 1,
    "baseCooldown": 50,
    "maxLevel": 3,
    "levelStats": [
      {
        "power": 1,
        "cooldown": 50,
        "price": 20000
      },
      {
        "power": 2,
        "cooldown": 50,
        "price": 30000
      },
      {
        "power": 3,
        "cooldown": 50,
        "price": 50000
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-03-01T08:20:12.100Z"
  },
  {
    "_id": "698a14e59f1659f17147dcda",
    "nameId": "toxic",
    "basePower": 1,
    "baseCooldown": 20,
    "maxLevel": 9,
    "levelStats": [
      {
        "power": 1,
        "cooldown": 20,
        "price": 50
      },
      {
        "power": 1,
        "cooldown": 19,
        "price": 100
      },
      {
        "power": 1,
        "cooldown": 18,
        "price": 150
      },
      {
        "power": 1,
        "cooldown": 17,
        "price": 200
      },
      {
        "power": 1,
        "cooldown": 16,
        "price": 250
      },
      {
        "power": 1,
        "cooldown": 15,
        "price": 300
      },
      {
        "power": 1,
        "cooldown": 14,
        "price": 350
      },
      {
        "power": 1,
        "cooldown": 13,
        "price": 400
      },
      {
        "power": 1,
        "cooldown": 12,
        "price": 450
      }
    ],
    "__v": 0,
    "createdAt": "2026-02-09T17:09:57.264Z",
    "updatedAt": "2026-02-26T15:43:27.666Z"
  }
]
```

## Localizations (merged snapshot)

> Note: This is the merged localization object (typically with `en`, `vi`, `ja` nested inside, depending on schema).

```json
{
  "en": {
    "menu": "☰",
    "menu_button": "Menu",
    "settings": "Settings",
    "settings_icon": "⚙️",
    "payment": "Add Coins",
    "coin": "🪙",
    "high_score": "High Score",
    "stage": "Stage",
    "upgrade": "UPGRADE",
    "sell": "SELL",
    "buy": "BUY",
    "start": "START",
    "continue": "CONTINUE",
    "back": "Back",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "game_over": "GAME OVER",
    "victory": "Victory",
    "paused": "Paused",
    "loading": "Loading",
    "raiden": "Raiden Shogun",
    "zhongli": "Zhongli",
    "venti": "Venti",
    "nahida": "Nahida",
    "furina": "Furina",
    "eula": "Eula",
    "mavuika": "Mavuika",
    "electro": "Electro",
    "pyro": "Pyro",
    "hydro": "Hydro",
    "cryo": "Cryo",
    "anemo": "Anemo",
    "geo": "Geo",
    "dendro": "Dendro",
    "character": "Character",
    "weapon": "Weapon",
    "enemy": "Enemy",
    "trap": "Trap",
    "treasure": "Treasure",
    "food": "Food",
    "bomb": "Bomb",
    "language": "Language",
    "theme": "Theme",
    "sound": "Sound",
    "music": "Music",
    "volume": "Volume",
    "welcomeMessage": "Welcome to the Phaser World!",
    "gameTitle": "International Adventure",
    "instructionText": "Click the buttons below to see magic happen!",
    "changeLanguage": "Change Language",
    "currentLanguage": "Current: English",
    "game_title": "TEYVAT CARD",
    "library": "Library",
    "library_title": "Library Cards",
    "explore": "Explore",
    "dungeon_map": "DUNGEON MAP",
    "equip": "Equip",
    "equip_title": "EQUIP",
    "character_title": "CHARACTER",
    "level_text": "level {level}",
    "test_dev": "Test dev",
    "restart": "Restart",
    "select": "Select",
    "close": "X",
    "back_short": "BACK",
    "level_max": "MAX LEVEL",
    "level": "Level {level}",
    "power": "Power",
    "power_label": "Power⚔️: {power}",
    "cooldown": "Cooldown",
    "cooldown_label": "Cooldown⏱️: {cooldown}",
    "level_label": "Level: {level}",
    "unlock": "UNLOCK",
    "deselect": "DESELECT",
    "item_not_ready": "Item conditions not met",
    "type_label": "Type: {type}",
    "prev": "Prev",
    "next": "Next",
    "coin_amount": "🪙 {amount}",
    "coin_header": "🪙 : {amount}",
    "high_score_label": "High Score: {score}",
    "hp_label": "❤️ {hp}",
    "loading_dots": "Loading{dots}",
    "package_starter": "Starter Pack",
    "package_starter_desc": "$0.08 → 20,000 coins",
    "package_10k": "$0.39",
    "package_10k_coins": "10,000 coins",
    "package_20k": "$0.78",
    "package_20k_coins": "25,000 coins",
    "package_50k": "$1.93",
    "package_50k_coins": "75,000 coins",
    "package_sold_out": "Purchased",
    "login": "Login",
    "register": "Register",
    "email": "Email",
    "password": "Password",
    "password_confirm": "Confirm password",
    "register_link": "No account? Register",
    "login_link": "Have an account? Login",
    "login_with_google": "Sign in with Google",
    "or": "or",
    "character.eula.description": "The captain of the West Wind scout in the world of Genshin Impact, Eula is an ice swordsman of noble blood who is shunned, strong but very upright inwardly.",
    "character.furina.description": "Fontaine's Water God, Focalors' human form. A brilliant actor, living for 500 years with a secret. He loves theater and always attracts attention.",
    "character.mavuika.description": "Natlan's Fire Goddess, the newest deity. A powerful warrior, she leads her tribe through challenges, ready to sacrifice herself for the future.",
    "character.nahida.description": "Sumeru's Grass God, known as the \"King of Generosity,\" possesses a childlike appearance but a profound wisdom, silently guiding the people to liberation from their shackles.",
    "character.raiden.description": "The Thunder God of Inazuma, the pioneering ruler. Steadfastly pursuing \"eternity,\" he lives in the Pure Land of One Mind. Outwardly cold, but inwardly profound.",
    "character.venti.description": "Calling himself a wandering poet, he is in fact the Wind God of Mondstadt. He takes the form of a wandering youth, fond of drinking and singing, using the sound of his instrument to guide his freedom.",
    "character.zhongli.description": "Liyue's god, used to be Nham Emperor Quan. Is a long-lived, knowledgeable god of wisdom. Now secluded as a receptionist for the funeral service restaurant.",
    "adventureCard.sword-sacrificial.name": "Sword Sacrificial",
    "about": "About",
    "gameSetting": "Game Settings",
    "menu_title": "TEYVAT CARD",
    "package_small": "$0.39",
    "package_small_coins": "10,000 coins",
    "package_medium": "$0.78",
    "package_medium_coins": "25,000 coins",
    "package_large": "$1.93",
    "package_large_coins": "75,000 coins",
    "developer.title": "Developer",
    "developer.name": "Dao Manh Dung",
    "developer.roleTitle": "Role",
    "developer.role": "Game Developer with AI",
    "project.title": "Teyvat Card (Game)",
    "project.description": "Turn-based card combat game",
    "tech.coreTitle": "Core",
    "tech.coreList": "TypeScript\nPhaser 3.87.0\nVite 6.2.0\nRexUI\nES6 Modules",
    "tech.toolsTitle": "Additional Tools",
    "tech.toolsList": "Sharp\nHTML5 Canvas\nCSS3\nGitHub Actions",
    "load": "Load",
    "save": "Save",
    "show_card_name": "Show card name",
    "show_guide": "Show guide",
    "tutorial_tap_next": "Tap screen to continue",
    "tutorial_guide_1": "Welcome to the dungeon! Here you'll fight with your deck.",
    "tutorial_guide_2": "Use the menu (☰) to pause or return to the main menu.",
    "tutorial_guide_3": "Your items are at the top. Tap them when ready to use their effects.",
    "tutorial_guide_4": "Defeat enemies and collect coins. You can sell your weapon for extra coins.",
    "tutorial_guide_5": "Good luck! Tap to start playing.",
    "item.black-hole.name": "Black Hole",
    "item.black-hole.description": "Reposition all cards",
    "item.catalyst.name": "Catalyst Blank",
    "item.catalyst.description": "Received a Catalyst with {basePower} durability.",
    "item.claw.name": "Claw Ancient Beasts",
    "item.claw.description": "Attack deals {basePower} damage.",
    "item.cooldown.name": "Time Spirit",
    "item.cooldown.description": "Reduces skill cooldown {basePower} unit",
    "item.corruption.name": "Corruption",
    "item.corruption.description": "Deals {basePower} damage to pursuers.",
    "item.healing-potion.name": "Healing Potion",
    "item.healing-potion.description": "Restore {basePower} HP",
    "item.refinement.name": "Refinement",
    "item.refinement.description": "Increases durability by {basePower} points for all weapons.",
    "item.repair.name": "Repair",
    "item.repair.description": "Revise durability by {basePower}",
    "item.seasoning.name": "Seasoning",
    "item.seasoning.description": "Spices enhance the flavor of food.",
    "item.sword.name": "Sword Blank",
    "item.sword.description": "Receive a sword with {basePower} durability",
    "item.tax-waiver.name": "Tax Waiver",
    "item.tax-waiver.description": "Increase the number of coins received by {basePower}00%.",
    "item.toxic.name": "Toxic",
    "item.toxic.description": "Poison all enemies.",
    "adventureCard.sword-forest.name": "Sword Forest",
    "adventureCard.sword-forest.description": "Sword Forest - Natural forest swords increase strength and defense.",
    "adventureCard.sword-sacrificial.description": "Sword Sacrificial - A powerful sacrificial sword, but with low durability.",
    "adventureCard.sword-skyward.name": "Sword Skyward",
    "adventureCard.sword-skyward.description": "Sword Skyward - The Sacred Sky Sword increases strength and speed.",
    "adventureCard.sword-splendor.name": "Sword Splendor",
    "adventureCard.sword-splendor.description": "Sword Splendor - A precious, glorious sword that increases power and luck.",
    "adventureCard.sword-steampunk.name": "Sword Steampunk",
    "adventureCard.sword-steampunk.description": "Sword Steampunk - A glorious and precious sword that increases power and luck.",
    "adventureCard.sword-traveler.name": "Sword Traveler",
    "adventureCard.sword-traveler.description": "Sword Traveler - Sword Traveler enhances strength and adaptability.",
    "adventureCard.anemo-samachurl.name": "Anemo Samachurl",
    "adventureCard.anemo-samachurl.description": "Anemo Samachurl - A wind caster enemy who can create wind and slow down players.",
    "adventureCard.berserker.name": "Berserker",
    "adventureCard.berserker.description": "Berserker - A berserk enemy who attacks more fiercely when their health is low.",
    "adventureCard.blazing.name": "Blazing",
    "adventureCard.blazing.description": "Blazing - Enemies burn continuously, dealing damage over time to nearby players.",
    "adventureCard.crackling.name": "Crackling",
    "adventureCard.crackling.description": "Crackling - Enemies explode upon death, dealing damage to nearby players.",
    "adventureCard.cryo-shooter.name": "Cryo Shooter",
    "adventureCard.cryo-shooter.description": "Cryo Shooter - An enemy that shoots ice from a distance, capable of slowing down and freezing the player.",
    "adventureCard.dendro-samachurl.name": "Dendro Samachurl",
    "adventureCard.dendro-samachurl.description": "Dendro Samachurl - A grass-casting enemy that can create plants and inflict poison.",
    "adventureCard.electro-samachurl.name": "Electro Samachurl",
    "adventureCard.electro-samachurl.description": "Electro Samachurl - An electric caster enemy that can shock and slow down the player.",
    "adventureCard.electro-shooter.name": "Electro Shooter",
    "adventureCard.electro-shooter.description": "Electro Shooter - An enemy that shoots electricity from a distance, capable of shocking and slowing the player.",
    "adventureCard.geo-samachurl.name": "Geo Samachurl",
    "adventureCard.geo-samachurl.description": "Geo Samachurl - Local caster enemies can create walls and stun enemies.",
    "adventureCard.fighter.name": "Hilichurl Fighter",
    "adventureCard.fighter.description": "Hilichurl Fighter - A basic enemy that can attack the player.",
    "adventureCard.hilistray-water.name": "Hilistray Water",
    "adventureCard.hilistray-water.description": "Hilistray Water - A water-based enemy with healing and wetness-inducing abilities.",
    "adventureCard.hydro-samachurl.name": "Hydro Samachurl",
    "adventureCard.hydro-samachurl.description": "Hydro Samachurl - A hydraulic caster enemy that can create water and cause wet effects.",
    "adventureCard.ice-shieldwall.name": "Ice Shieldwall",
    "adventureCard.ice-shieldwall.description": "Ice Shieldwall - An enemy wall of ice, with high defense and the ability to slow down the player.",
    "adventureCard.lawachurl.description": "Lawachurl - A powerful boss with high offensive and defensive capabilities.",
    "adventureCard.lawachurl.name": "Lawachurl",
    "adventureCard.rock-shieldwall.name": "Rock Shieldwall",
    "adventureCard.rock-shieldwall.description": "Rock Shieldwall - A rock wall enemy with very high defensive capabilities and excellent resistance.",
    "adventureCard.shooter.name": "Shooter",
    "adventureCard.shooter.description": "Shooter - An enemy who shoots arrows from a distance, basic attack.",
    "adventureCard.wooden-shieldwall.name": "Wooden Shieldwall",
    "adventureCard.wooden-shieldwall.description": "Wooden Shieldwall - An enemy with a wooden wall, possessing average defense and susceptible to fire.",
    "adventureCard.life-essence.name": "Life Essence",
    "adventureCard.life-essence.description": "Life Essence - The essence of life for maximum health recovery and enhancement of all indicators.",
    "adventureCard.macarons.name": "Macarons",
    "adventureCard.macarons.description": "Macarons - French pastries that restore health and boost spirits.",
    "adventureCard.mystique-soup.name": "Mystique Soup",
    "adventureCard.mystique-soup.description": "Mystique Soup - A mysterious soup that restores health and provides a temporary boost of strength.",
    "adventureCard.pizza.name": "Pizza",
    "adventureCard.pizza.description": "Pizza - Italian pizza restores health and boosts attacking power.",
    "adventureCard.roast-chicken.description": "Grilled chicken - Delicious grilled chicken helps restore health and boost immunity.",
    "adventureCard.roast-chicken.name": "Roast Chicken",
    "adventureCard.abyss-call.name": "AbyssCall",
    "adventureCard.abyss-call.description": "AbyssCall - A trap that summons additional enemies into the battle when activated.",
    "adventureCard.breathe-fire.name": "Breathe Fire",
    "adventureCard.breathe-fire.description": "Breathe Fire - A fire trap that deals damage to the player when activated.",
    "adventureCard.quicksand.description": "Quicksand - Quicksand traps that deal damage and slow the player when activated.",
    "adventureCard.quicksand.name": "Quicksand",
    "adventureCard.bribery.name": "Bribery",
    "adventureCard.bribery.description": "Bribery - Bribery to receive rewards greater than the cost.",
    "adventureCard.chest.name": "Chest",
    "adventureCard.chest.description": "Chest - The main treasure chest containing various valuable rewards.",
    "adventureCard.gold-mine.name": "GoldMine",
    "adventureCard.gold-mine.description": "GoldMine - A mine to extract resources.",
    "adventureCard.explosive.name": "Explosive",
    "adventureCard.explosive.description": "Explosive - A bomb that explodes and damages everything within a radius.",
    "adventureCard.cryo-fragment.name": "Ice Element Fragment",
    "adventureCard.cryo-fragment.description": "Ice Elemental Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "adventureCard.empty.name": "Empty",
    "adventureCard.empty.description": "Empty - An empty card has no effect.",
    "adventureCard.hydro-fragment.name": "Water Element Fragment",
    "adventureCard.hydro-fragment.description": "Collected Water Elemental Fragments can be exchanged for Coins and restore a small amount of energy.",
    "adventureCard.dendro-fragment.name": "Fragment of the Elemental Herb",
    "adventureCard.dendro-fragment.description": "The Elemental Herb Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "adventureCard.geo-fragment.name": "Fragment of the Rock Element",
    "adventureCard.geo-fragment.description": "The Elemental Rock Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "adventureCard.pyro-fragment.name": "Fragment of the Fire Element",
    "adventureCard.pyro-fragment.description": "Fire Elemental Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "adventureCard.electro-fragment.description": "Lightning Elemental Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "adventureCard.electro-fragment.name": "Lightning Element Fragment",
    "adventureCard.anemo-fragment.name": "Wind Element Fragment",
    "adventureCard.anemo-fragment.description": "Wind Elemental Fragments that are collected can be exchanged for Coins and restore a small amount of energy.",
    "character.eula.name": "Eula",
    "character.zhongli.name": "Zhongli",
    "character.furina.name": "Furina",
    "character.mavuika.name": "Mavuika",
    "character.nahida.name": "Nahida",
    "character.raiden.name": "Raiden Shōgun",
    "character.venti.name": "Venti",
    "map.dungeon_abyss_chamber.name": "Abyss Chamber",
    "load_success": "Data loaded.",
    "save_success": "Saved.",
    "load_error": "Unable to load data.",
    "save_error": "Unable to save."
  },
  "vi": {
    "menu": "☰",
    "menu_button": "Menu",
    "settings": "Cài đặt",
    "settings_icon": "⚙️",
    "payment": "Nạp xu",
    "coin": "🪙",
    "high_score": "Điểm cao",
    "stage": "Màn chơi",
    "upgrade": "NÂNG CẤP",
    "sell": "BÁN",
    "buy": "MUA",
    "start": "BẮT ĐẦU",
    "continue": "TIẾP TỤC",
    "back": "Quay lại",
    "confirm": "Xác nhận",
    "cancel": "Hủy",
    "game_over": "GAME OVER",
    "victory": "Chiến thắng",
    "paused": "Tạm dừng",
    "loading": "Đang tải",
    "raiden": "Raiden Shogun",
    "zhongli": "Zhongli",
    "venti": "Venti",
    "nahida": "Nahida",
    "furina": "Furina",
    "eula": "Eula",
    "mavuika": "Mavuika",
    "electro": "Lôi",
    "pyro": "Hỏa",
    "hydro": "Thủy",
    "cryo": "Băng",
    "anemo": "Phong",
    "geo": "Nham",
    "dendro": "Thảo",
    "character": "Nhân vật",
    "weapon": "Vũ khí",
    "enemy": "Địch",
    "trap": "Bẫy",
    "treasure": "Kho báu",
    "food": "Thức ăn",
    "bomb": "Bom",
    "language": "Ngôn ngữ",
    "theme": "Giao diện",
    "sound": "Âm thanh",
    "music": "Nhạc",
    "volume": "Âm lượng",
    "welcomeMessage": "Chào mừng bạn đến với Thế giới Phaser!",
    "gameTitle": "Cuộc phiêu lưu đa ngôn ngữ",
    "instructionText": "Nhấn các nút bên dưới để thấy điều kỳ diệu!",
    "changeLanguage": "Đổi ngôn ngữ",
    "currentLanguage": "Hiện tại: Tiếng Việt",
    "game_title": "TEYVAT CARD",
    "library": "Thư viện",
    "library_title": "Thư viện thẻ",
    "explore": "Thám hiểm",
    "dungeon_map": "BẢN ĐỒ HẦM NGỤC",
    "equip": "Trang bị",
    "equip_title": "TRANG BỊ",
    "character_title": "NHÂN VẬT",
    "level_text": "cấp {level}",
    "test_dev": "Test dev",
    "restart": "Chơi lại",
    "select": "Chọn",
    "close": "X",
    "back_short": "QUAY LẠI",
    "level_max": "ĐẠT CẤP TỐI ĐA",
    "level": "Cấp {level}",
    "power": "Sức mạnh",
    "power_label": "Sức mạnh⚔️: {power}",
    "cooldown": "Hồi chiêu",
    "cooldown_label": "Hồi chiêu⏱️: {cooldown}",
    "level_label": "Cấp: {level}",
    "unlock": "MỞ KHÓA",
    "deselect": "BỎ CHỌN",
    "item_not_ready": "Item chưa đủ điều kiện để sử dụng",
    "type_label": "Loại: {type}",
    "prev": "Trước",
    "next": "Sau",
    "coin_amount": "🪙 {amount}",
    "coin_header": "🪙 : {amount}",
    "high_score_label": "Điểm cao: {score}",
    "hp_label": "❤️ {hp}",
    "loading_dots": "Đang tải{dots}",
    "package_starter": "Gói tân thủ",
    "package_starter_desc": "2.000₫ → 20.000 xu",
    "package_10k": "10.000₫",
    "package_10k_coins": "10.000 xu",
    "package_20k": "20.000₫",
    "package_20k_coins": "25.000 xu",
    "package_50k": "50.000₫",
    "package_50k_coins": "75.000 xu",
    "package_sold_out": "Đã mua",
    "login": "Đăng nhập",
    "register": "Đăng ký",
    "email": "Email",
    "password": "Mật khẩu",
    "password_confirm": "Xác nhận mật khẩu",
    "register_link": "Chưa có tài khoản? Đăng ký",
    "login_link": "Đã có tài khoản? Đăng nhập",
    "login_with_google": "Đăng nhập với Google",
    "or": "hoặc",
    "character.eula.description": "Đội trưởng trinh sát Tây Phong trong thế giới Genshin Impact, Eula là kiếm sĩ băng mang huyết thống quý tộc bị xa lánh, mạnh mẽ nhưng nội tâm rất chính trực.",
    "character.furina.description": "Thủy Thần của Fontaine, bản thể con người của Focalors . Diễn xuất tài tình, sống 500 năm với bí mật. Thích kịch nghệ, luôn thu hút mọi ánh nhìn.",
    "character.mavuika.description": "Hỏa Thần của Natlan, vị thần mới nhất. Là nữ chiến binh mạnh mẽ, lãnh đạo bộ tộc vượt qua thử thách, sẵn sàng hy sinh vì tương lai.",
    "character.nahida.description": "Thảo Thần của Sumeru, mệnh danh \"Vua Độ Lượng\". Dù mang dáng vẻ trẻ thơ nhưng sở hữu trí tuệ sâu rộng, âm thầm dẫn dắt người dân thoát khỏi xiềng xích.",
    "character.raiden.description": "Lôi Thần của Inazuma, tiên phong chấp chính. Kiên định theo đuổi \"vĩnh hằng\", sống trong Nhất Tâm Tịnh Thổ. Bên ngoài lạnh lùng nhưng nội tâm sâu sắc.",
    "character.venti.description": "Tự xưng nhà thơ phiêu du, thực chất là Phong Thần của Mondstadt. Mang hình hài thiếu niên lang thang, thích uống rượu và ca hát, dùng tiếng đàn dẫn dắt tự do.",
    "character.zhongli.description": "Nham Thần của Liyue, từng là Nham Vương Đế Quân. Là vị thần trí tuệ sống lâu, am hiểu lễ nghi. Nay ẩn cư làm lễ tân cho nhà hàng dịch vụ tang lễ.",
    "adventureCard.sword-sacrificial.name": "Sword Sacrificial",
    "about": "Thông tin",
    "gameSetting": "Cài đặt game",
    "menu_title": "TEYVAT CARD",
    "package_small": "10.000₫",
    "package_small_coins": "10.000 xu",
    "package_medium": "20.000₫",
    "package_medium_coins": "25.000 xu",
    "package_large": "50.000₫",
    "package_large_coins": "75.000 xu",
    "developer.title": "Người phát triển",
    "developer.name": "Đào Mạnh Dũng",
    "developer.roleTitle": "Vai trò",
    "developer.role": "Làm game với AI",
    "project.title": "Teyvat Card (Game)",
    "project.description": "Game chiến đấu thẻ bài theo lượt",
    "tech.coreTitle": "Core",
    "tech.coreList": "TypeScript\nPhaser 3.87.0\nVite 6.2.0\nRexUI\nES6 Modules",
    "tech.toolsTitle": "Công cụ bổ sung",
    "tech.toolsList": "Sharp\nHTML5 Canvas\nCSS3\nGitHub Actions",
    "load": "Tải",
    "save": "Lưu",
    "show_card_name": "Hiển thị tên thẻ bài",
    "show_guide": "Hiển thị hướng dẫn",
    "tutorial_tap_next": "Chạm màn hình để tiếp tục",
    "tutorial_guide_1": "Chào mừng đến hầm ngục! Bạn sẽ chiến đấu bằng bộ bài của mình.",
    "tutorial_guide_2": "Dùng menu (☰) để tạm dừng hoặc quay về màn hình chính.",
    "tutorial_guide_3": "Vật phẩm nằm ở phía trên. Chạm khi sẵn sàng để dùng hiệu ứng.",
    "tutorial_guide_4": "Đánh bại kẻ địch và thu thập xu. Bạn có thể bán vũ khí để đổi thêm xu.",
    "tutorial_guide_5": "Chúc may mắn! Chạm để bắt đầu chơi.",
    "item.black-hole.name": "Hố Đen",
    "item.black-hole.description": "Đổi vị trí tất cả các thẻ",
    "item.catalyst.name": "Phôi Pháp Khí",
    "item.catalyst.description": "nhận một Pháp Khí độ bền {basePower}",
    "item.claw.name": "Vuốt Hung thú",
    "item.claw.description": "Tấn công với {basePower} damage",
    "item.cooldown.name": "Tinh linh thời gian",
    "item.cooldown.description": "Giảm cooldown của skill {basePower} đơn vị",
    "item.corruption.name": "Băng Hoại",
    "item.corruption.description": "gây {basePower} sát thương cho kẻ theo sau",
    "item.healing-potion.name": "Thuốc Hồi Máu",
    "item.healing-potion.description": "Hồi phục {basePower} HP",
    "item.refinement.name": "Tinh Chế",
    "item.refinement.description": "Tăng {basePower} điểm độ bền cho mọi vũ khí",
    "item.repair.name": "Sửa Chữa",
    "item.repair.description": "sửa lại {basePower} độ bền",
    "item.seasoning.name": "Gia Vị",
    "item.seasoning.description": "Gia vị tăng hương vị cho món ăn",
    "item.sword.name": "Phôi Kiếm",
    "item.sword.description": "nhận một kiếm độ bền {basePower}",
    "item.tax-waiver.name": "Miễn Thuế",
    "item.tax-waiver.description": "tăng {basePower}00% số xu nhận dc",
    "item.toxic.name": "Độc",
    "item.toxic.description": "Đầu độc toàn bộ kẻ thù",
    "adventureCard.sword-forest.name": "Kiếm Gỗ",
    "adventureCard.sword-forest.description": "Sword Forest - Kiếm rừng tự nhiên tăng sức mạnh và khả năng phòng thủ.",
    "adventureCard.sword-sacrificial.description": "Sword Sacrificial - Kiếm hy sinh mạnh mẽ nhưng độ bền thấp.",
    "adventureCard.sword-skyward.name": "Sword Skyward",
    "adventureCard.sword-skyward.description": "Sword Skyward - Kiếm bầu trời thiêng liêng tăng sức mạnh và tốc độ.",
    "adventureCard.sword-splendor.name": "kiếm Splendor",
    "adventureCard.sword-splendor.description": "Sword Splendor - Kiếm huy hoàng quý giá tăng sức mạnh và may mắn.",
    "adventureCard.sword-steampunk.name": "Sword Steampunk",
    "adventureCard.sword-steampunk.description": "Sword Steampunk - Kiếm huy hoàng quý giá tăng sức mạnh và may mắn.",
    "adventureCard.sword-traveler.name": "Kiếm khách",
    "adventureCard.sword-traveler.description": "Sword Traveler - Kiếm lữ khách tăng sức mạnh và khả năng thích ứng.",
    "adventureCard.anemo-samachurl.name": "Anemo Samachurl",
    "adventureCard.anemo-samachurl.description": "Anemo Samachurl - Kẻ địch caster gió có thể tạo gió và làm chậm người chơi.",
    "adventureCard.berserker.name": "Chiến binh điên",
    "adventureCard.berserker.description": "Berserker - Kẻ địch điên cuồng, tấn công mạnh hơn khi máu thấp.",
    "adventureCard.blazing.name": "Blazing",
    "adventureCard.blazing.description": "Blazing - Kẻ địch cháy liên tục, gây thiệt hại theo thời gian cho người chơi gần đó.",
    "adventureCard.crackling.name": "Crackling",
    "adventureCard.crackling.description": "Crackling - Kẻ địch nổ khi chết, gây sát thương cho người chơi gần đó.",
    "adventureCard.cryo-shooter.name": "Cryo Xạ thủ",
    "adventureCard.cryo-shooter.description": "Cryo Shooter - Kẻ địch bắn băng từ xa, có thể làm chậm và đóng băng người chơi.",
    "adventureCard.dendro-samachurl.name": "Dendro Samachurl",
    "adventureCard.dendro-samachurl.description": "Dendro Samachurl - Kẻ địch caster thảo có thể tạo cây và gây poison.",
    "adventureCard.electro-samachurl.name": "Electro Samachurl",
    "adventureCard.electro-samachurl.description": "Electro Samachurl - Kẻ địch caster điện có thể gây sốc và làm chậm người chơi.",
    "adventureCard.electro-shooter.name": "Electro Xạ thủ",
    "adventureCard.electro-shooter.description": "Electro Shooter - Kẻ địch bắn điện từ xa, có thể gây sốc và làm chậm người chơi.",
    "adventureCard.geo-samachurl.name": "Geo Samachurl",
    "adventureCard.geo-samachurl.description": "Geo Samachurl - Kẻ địch caster địa phương có thể tạo ra tường và gây choáng váng.",
    "adventureCard.fighter.name": "chiến đấu Hilichurl",
    "adventureCard.fighter.description": "Hilichurl Fighter - Kẻ địch cơ bản có thể tấn công người chơi.",
    "adventureCard.hilistray-water.name": "Nước Hilistray",
    "adventureCard.hilistray-water.description": "Hilistray Water - Kẻ địch nước, có khả năng chữa lành và tạo hiệu ứng ẩm ướt.",
    "adventureCard.hydro-samachurl.name": "Hydro Samachurl",
    "adventureCard.hydro-samachurl.description": "Hydro Samachurl - Kẻ địch caster thủy lực có thể tạo ra nước và gây ra hiệu ứng ướt.",
    "adventureCard.ice-shieldwall.name": "Tường chắn Băng",
    "adventureCard.ice-shieldwall.description": "Ice Shieldwall - Kẻ địch tường băng, có khả năng phòng thủ cao và làm chậm người chơi.",
    "adventureCard.lawachurl.description": "Lawachurl - Boss Hilichurl mạnh mẽ, có khả năng tấn công công và phòng thủ cao.",
    "adventureCard.lawachurl.name": "Lawachurl",
    "adventureCard.rock-shieldwall.name": "Tường chắn Đá",
    "adventureCard.rock-shieldwall.description": "Rock Shieldwall - Kẻ địch tường đá, có khả năng phòng thủ rất cao và chống đỡ tốt.",
    "adventureCard.shooter.name": "Xạ thủ",
    "adventureCard.shooter.description": "Shooter - Kẻ địch bắn cung từ xa, tấn công cơ bản.",
    "adventureCard.wooden-shieldwall.name": "Tường chắn gỗ",
    "adventureCard.wooden-shieldwall.description": "Wooden Shieldwall - Kẻ địch tường gỗ, có khả năng phòng thủ trung bình và dễ bị cháy.",
    "adventureCard.life-essence.name": "Tinh hoa cuộc sống",
    "adventureCard.life-essence.description": "Life Essence - Tinh hoa sự sống hồi phục sức khỏe tối đa và tăng tất cả chỉ số.",
    "adventureCard.macarons.name": "Macarons",
    "adventureCard.macarons.description": "Macarons - Bánh ngọt Pháp hồi phục sức khỏe và tăng tinh thần.",
    "adventureCard.mystique-soup.name": "Mystique Soup",
    "adventureCard.mystique-soup.description": "Mystique Soup - Súp bí ẩn hồi phục sức khỏe và tăng sức mạnh tạm thời.",
    "adventureCard.pizza.name": "Bánh pizza",
    "adventureCard.pizza.description": "Pizza - Bánh pizza Ý hồi phục sức khỏe và tăng sức mạnh mạnh tấn công công.",
    "adventureCard.roast-chicken.description": "Gà nướng - Gà nướng thơm ngon hồi phục sức khỏe và tăng khả năng phòng thủ.",
    "adventureCard.roast-chicken.name": "Gà Quay",
    "adventureCard.abyss-call.name": "Triệu hồi vực sâu",
    "adventureCard.abyss-call.description": "AbyssCall - Bẫy gọi thêm kẻ thù vào trận đấu khi kích hoạt.",
    "adventureCard.breathe-fire.name": "Hít lửa",
    "adventureCard.breathe-fire.description": "Breathe Fire - Bẫy thở lửa gây damage cho người chơi khi kích hoạt.",
    "adventureCard.quicksand.description": "Quicksand - Bẫy cát lún gây damage và làm chậm người chơi khi kích hoạt.",
    "adventureCard.quicksand.name": "Cát lún",
    "adventureCard.bribery.name": "Hối lộ",
    "adventureCard.bribery.description": "Bribery - Hối lộ để nhận phần thưởng lớn hơn chi phí.",
    "adventureCard.chest.name": "rương",
    "adventureCard.chest.description": "Chest - Kho báu chính chứa nhiều loại phần thưởng quý giá.",
    "adventureCard.gold-mine.name": "GoldMine",
    "adventureCard.gold-mine.description": "GoldMine - Mỏ khai thác để nhận tài nguyên.",
    "adventureCard.explosive.name": "Chất nổ",
    "adventureCard.explosive.description": "Explosive - Bom nổ gây damage cho tất cả trong bán kính.",
    "adventureCard.cryo-fragment.name": "Mảnh Vỡ Nguyên Tố Băng",
    "adventureCard.cryo-fragment.description": "Mảnh Vỡ Nguyên Tố Băng nhặt có thể đổi Xu và hồi chút năng lượng.",
    "adventureCard.empty.name": "Trống",
    "adventureCard.empty.description": "Empty - Thẻ trống không có tác dụng.",
    "adventureCard.hydro-fragment.name": "Mảnh Vỡ Nguyên Tố Thủy",
    "adventureCard.hydro-fragment.description": "Mảnh Vỡ Nguyên Tố Thủy nhặt có thể đổi Xu và hồi chút năng lượng.",
    "adventureCard.dendro-fragment.name": "Mảnh Vỡ Nguyên Tố Thảo",
    "adventureCard.dendro-fragment.description": "Mảnh Vỡ Nguyên Tố Thảo nhặt có thể đổi Xu và hồi chút năng lượng.",
    "adventureCard.geo-fragment.name": "Mảnh Vỡ Nguyên Tố Nham",
    "adventureCard.geo-fragment.description": "Mảnh Vỡ Nguyên Tố Nham nhặt có thể đổi Xu và hồi chút năng lượng.",
    "adventureCard.pyro-fragment.name": "Mảnh Vỡ Nguyên Tố Hỏa",
    "adventureCard.pyro-fragment.description": "Mảnh Vỡ Nguyên Tố Hỏa nhặt có thể đổi Xu và hồi chút năng lượng.",
    "adventureCard.electro-fragment.description": "Mảnh Vỡ Nguyên Tố Lôi nhặt có thể đổi Xu và hồi chút năng lượng.",
    "adventureCard.electro-fragment.name": "Mảnh Vỡ Nguyên Tố Lôi",
    "adventureCard.anemo-fragment.name": "Mảnh Vỡ Nguyên Tố Phong",
    "adventureCard.anemo-fragment.description": "Mảnh Vỡ Nguyên Tố Phong nhặt có thể đổi Xu và hồi chút năng lượng.",
    "character.eula.name": "Eula",
    "character.zhongli.name": "Zhongli",
    "character.furina.name": "Furina",
    "character.mavuika.name": "Mavuika",
    "character.nahida.name": "Nahida",
    "character.raiden.name": "Raiden Ei",
    "character.venti.name": "Venti",
    "map.dungeon_abyss_chamber.name": "Hang ổ sâu thẳm",
    "load_success": "Đã tải dữ liệu.",
    "save_success": "Đã lưu.",
    "load_error": "Không thể tải dữ liệu.",
    "save_error": "Không thể lưu."
  },
  "ja": {
    "menu": "☰",
    "menu_button": "メニュー",
    "settings": "設定",
    "settings_icon": "⚙️",
    "payment": "コイン追加",
    "coin": "🪙",
    "high_score": "ハイスコア",
    "stage": "ステージ",
    "upgrade": "アップグレード",
    "sell": "売却",
    "buy": "購入",
    "start": "開始",
    "continue": "続行",
    "back": "戻る",
    "confirm": "確認",
    "cancel": "キャンセル",
    "game_over": "ゲームオーバー",
    "victory": "勝利",
    "paused": "一時停止",
    "loading": "読み込み中",
    "raiden": "雷電将軍",
    "zhongli": "鍾離",
    "venti": "ヴェンティ",
    "nahida": "ナヒーダ",
    "furina": "フリーナ",
    "eula": "エウルア",
    "mavuika": "マヴィカ",
    "electro": "雷",
    "pyro": "炎",
    "hydro": "水",
    "cryo": "氷",
    "anemo": "風",
    "geo": "岩",
    "dendro": "草",
    "character": "キャラクター",
    "weapon": "武器",
    "enemy": "敵",
    "trap": "罠",
    "treasure": "宝箱",
    "food": "食べ物",
    "bomb": "爆弾",
    "language": "言語",
    "theme": "テーマ",
    "sound": "サウンド",
    "music": "音楽",
    "volume": "音量",
    "welcomeMessage": "Phaserの世界へようこそ！",
    "gameTitle": "多言語アドベンチャー",
    "instructionText": "下のボタンをクリックして魔法を見てください！",
    "changeLanguage": "言語を変更",
    "currentLanguage": "現在: 日本語",
    "game_title": "TEYVAT CARD",
    "library": "図書館",
    "library_title": "カード図書館",
    "explore": "探検",
    "dungeon_map": "ダンジョンマップ",
    "equip": "装備",
    "equip_title": "装備",
    "character_title": "キャラクター",
    "level_text": "レベル {level}",
    "test_dev": "Test dev",
    "restart": "再開",
    "select": "選択",
    "close": "×",
    "back_short": "戻る",
    "level_max": "最大レベル",
    "level": "レベル {level}",
    "power": "攻撃力",
    "power_label": "攻撃力⚔️: {power}",
    "cooldown": "クールダウン",
    "cooldown_label": "クールダウン⏱️: {cooldown}",
    "level_label": "レベル: {level}",
    "unlock": "アンロック",
    "deselect": "選択解除",
    "item_not_ready": "アイテムの条件を満たしていません",
    "type_label": "タイプ: {type}",
    "prev": "前",
    "next": "次",
    "coin_amount": "🪙 {amount}",
    "coin_header": "🪙 : {amount}",
    "high_score_label": "ハイスコア: {score}",
    "hp_label": "❤️ {hp}",
    "loading_dots": "読み込み中{dots}",
    "package_starter": "初心者パック",
    "package_starter_desc": "¥12 → 20,000コイン",
    "package_10k": "¥60.40",
    "package_10k_coins": "10,000コイン",
    "package_20k": "¥120.80",
    "package_20k_coins": "25,000コイン",
    "package_50k": "¥302",
    "package_50k_coins": "75,000コイン",
    "package_sold_out": "購入済み",
    "login": "ログイン",
    "register": "新規登録",
    "email": "メール",
    "password": "パスワード",
    "password_confirm": "パスワード確認",
    "register_link": "アカウントをお持ちでない？登録",
    "login_link": "アカウントをお持ち？ログイン",
    "login_with_google": "Googleでログイン",
    "or": "または",
    "character.eula.description": "源信インパクトの世界で西風偵察隊の隊長を務めるユーラは、高貴な血の氷剣士であり、避けられていますが、内面は非常に直立しています。",
    "character.furina.description": "フォンテーヌの水の神、フォーカラーの人間の姿。秘密を秘めて500年生きる優秀な俳優。彼は演劇が大好きで、常に注目を集めています。",
    "character.mavuika.description": "ナトランの火の女神、最新の神。強力な戦士である彼女は、未来のために自分自身を犠牲にする準備ができているため、部族を率いてチャレンジを進めています。",
    "character.nahida.description": "「寛大さの王」として知られるシュメルの草神は、子供っぽい外見でありながら深遠な知恵を持ち、静かに人々を束縛からの解放へと導いています。",
    "character.raiden.description": "先駆者である稲妻の雷神。彼は「永遠」を徹底的に追求し、一つの心の浄土に住んでいます。外見は冷たく、内面は奥深い。",
    "character.venti.description": "自分自身をさまよう詩人と呼んでいる彼は、実はモンシュタットの風の神です。彼は飲んだり歌ったりするのが好きなさまよう若者の形をとり、楽器の音を使って自由を導きます。",
    "character.zhongli.description": "リユエの神は、かつてはニャムの泉帝であった。長寿で、知識豊富な知恵の神です。現在は葬儀店の受付係として隠れています。",
    "adventureCard.sword-sacrificial.name": "剣の生贄",
    "about": "アバウト",
    "gameSetting": "ゲーム設定",
    "menu_title": "TEYVAT CARD",
    "package_small": "¥60.40",
    "package_small_coins": "10,000コイン",
    "package_medium": "¥120.80",
    "package_medium_coins": "25,000コイン",
    "package_large": "¥302",
    "package_large_coins": "75,000コイン",
    "developer.title": "開発者",
    "developer.name": "ダオ・マン・ズン",
    "developer.roleTitle": "役割",
    "developer.role": "AIを活用したゲーム開発者",
    "project.title": "Teyvat Card（ゲーム）",
    "project.description": "ターン制カードバトルゲーム",
    "tech.coreTitle": "コア技術",
    "tech.coreList": "TypeScript\nPhaser 3.87.0\nVite 6.2.0\nRexUI\nES6 Modules",
    "tech.toolsTitle": "追加ツール",
    "tech.toolsList": "Sharp\nHTML5 Canvas\nCSS3\nGitHub Actions",
    "load": "読み込み",
    "save": "保存",
    "show_card_name": "カード名を表示",
    "show_guide": "ガイドを表示",
    "tutorial_tap_next": "画面をタップして続行",
    "tutorial_guide_1": "ダンジョンへようこそ！デッキで戦います。",
    "tutorial_guide_2": "メニュー(☰)で一時停止またはメインに戻れます。",
    "tutorial_guide_3": "アイテムは上部にあります。タップで効果を発動します。",
    "tutorial_guide_4": "敵を倒してコインを集めましょう。武器を売ってコインにできます。",
    "tutorial_guide_5": "頑張って！タップしてプレイを開始します。",
    "item.black-hole.name": "ブラックホール",
    "item.black-hole.description": "すべてのカードの位置を変更する",
    "item.catalyst.name": "触媒ブランク",
    "item.catalyst.description": "耐久力{basePower}の触媒を受け取りました。",
    "item.claw.name": "古代獣の爪",
    "item.claw.description": "攻撃は{basePower}ダメージを与える。",
    "item.cooldown.name": "タイムスピリット",
    "item.cooldown.description": "スキルのクールダウンを{basePower}単位短縮します。",
    "item.corruption.name": "腐敗",
    "item.corruption.description": "追跡者に{basePower}点のダメージを与える。",
    "item.healing-potion.name": "回復ポーション",
    "item.healing-potion.description": "HPを{basePower}回復",
    "item.refinement.name": "精錬",
    "item.refinement.description": "全武器の耐久力が{basePower}ポイントアップ。",
    "item.repair.name": "修理",
    "item.repair.description": "耐久力を{basePower}修正",
    "item.seasoning.name": "調味料",
    "item.seasoning.description": "スパイスは食品の風味を高めます。",
    "item.sword.name": "空白の剣",
    "item.sword.description": "耐久力{basePower}の剣を受け取る",
    "item.tax-waiver.name": "免税",
    "item.tax-waiver.description": "受け取るコインの数を{basePower}00%増加します。",
    "item.toxic.name": "毒",
    "item.toxic.description": "敵全員に毒を与える。",
    "adventureCard.sword-forest.name": "剣の森",
    "adventureCard.sword-forest.description": "剣の森-天然の森の剣は強さと防御力を高めます。",
    "adventureCard.sword-sacrificial.description": "剣の犠牲-強くても強度の低い犠牲の剣。",
    "adventureCard.sword-skyward.name": "スカイワード剣",
    "adventureCard.sword-skyward.description": "剣スカイワード-神聖な空の剣は強さとスピードを上げます。",
    "adventureCard.sword-splendor.name": "輝く剣",
    "adventureCard.sword-splendor.description": "輝く剣-力と幸運を高める貴重で栄光の剣。",
    "adventureCard.sword-steampunk.name": "スチームパンク剣",
    "adventureCard.sword-steampunk.description": "剣スチームパンク-力と運を高める栄光と貴重な剣。",
    "adventureCard.sword-traveler.name": "剣の旅人",
    "adventureCard.sword-traveler.description": "剣の旅人-剣の旅人は強さと適応力を高めます。",
    "adventureCard.anemo-samachurl.name": "Anemo Samachurl",
    "adventureCard.anemo-samachurl.description": "Anemo Samachurl -クリュドゥチ・キャスター・ジョー・コー・トー・チョー・ジョー・ヴァ・ラム・チャム・ヌギュイ・チョイ。",
    "adventureCard.berserker.name": "ベルセルク",
    "adventureCard.berserker.description": "Berserker （バーサーカー） -クー・ドゥチ・ドゥイェン・クー、タン・コン・ムン・ハン・キ・マウ・トー。",
    "adventureCard.blazing.name": "ブレイジング",
    "adventureCard.blazing.description": "ブレイジング-クー・ドゥー・チャイ・リエン・トゥー、ギャイ・ダム・テオ・トゥーイ・ジャン・チョー・ヌグーイ・チョイ・ギャン・ドー。",
    "adventureCard.crackling.name": "「パキパキ」",
    "adventureCard.crackling.description": "クラックリング- K.キチェト、ギャイ・ダメージ・チョ・ニュイ・チョイ・ジョン・ジョー。",
    "adventureCard.cryo-shooter.name": "クライオシューター",
    "adventureCard.cryo-shooter.description": "クライオシューター-クライオ・シューター、クライオ・シューター、クライオ・シューター、クライオ・シューター、クライオ・シューター",
    "adventureCard.dendro-samachurl.name": "Dendro Samachurl",
    "adventureCard.dendro-samachurl.description": "DENDRO SAMACHURL （デンドロ・サマチャール） -クリュドチュキャスター・ト・コ・ト・ト・カ・ヴァ・ガイ・ポイズン。",
    "adventureCard.electro-samachurl.name": "エレクトロ・サマチャール",
    "adventureCard.electro-samachurl.description": "ELECTRO SAMACHURL （エレクトロ・サマチャール）-クーダッチ・キャスター・ジエン・コー・ザ・ガイ・ショック・ヴァ・ラム・チャム・ナグジャイ・チャイ。",
    "adventureCard.electro-shooter.name": "エレクトロ・シューター",
    "adventureCard.electro-shooter.description": "エレクトロシューター-クー・ドゥチ・ブ・ジャン・トゥ・シャ、コー・トゥイ・ショック・ヴァ・ラム・チャム・ナギュイ・チョイ。",
    "adventureCard.geo-samachurl.name": "Geo Samachurl",
    "adventureCard.geo-samachurl.description": "Geo Samachurl -クリュドゥチキャスタージュア・コ・ト・トゥ・トゥ・トゥ・ヴァ・ガイ・スタン。",
    "adventureCard.fighter.name": "ヒリチュール戦闘機",
    "adventureCard.fighter.description": "ヒリチュール・ファイター-クー・ドゥー・クー・ブー・コー・トー・タン・コー・ヌー・イ・チュイ。",
    "adventureCard.hilistray-water.name": "ヒリストレー・ウォーター",
    "adventureCard.hilistray-water.description": "ヒリストレー・ウォーター（ Hilistray Water ） -クー・ドゥチ・ナチ、コー・クー・ナン・チャー・ラーン・バ・タ・ト・ヒエトゥー・ナム・ジャット。",
    "adventureCard.hydro-samachurl.name": "Hydro Samachurl",
    "adventureCard.hydro-samachurl.description": "HYDRO SAMACHURL -クーダッチキャスター、THOY COTHO NUAC VA GAYウェットエフェクト。",
    "adventureCard.ice-shieldwall.name": "アイスシールドウォール",
    "adventureCard.ice-shieldwall.description": "アイスシールドウォール-キョードルヒ・トゥアング・バング、コ・ク・ナン・フォン・トゥ・カオ・ヴァ・ラム・チョム・ヌギ・チョイ。",
    "adventureCard.lawachurl.description": "Lawachurl -高い攻撃力と防御力を持つ強力なボス。",
    "adventureCard.lawachurl.name": "Lawachurl",
    "adventureCard.rock-shieldwall.name": "ロック・シールドウォール",
    "adventureCard.rock-shieldwall.description": "ロック・シールドウォール-クー・ドゥチ・トゥー・ドゥー、コー・クー・ナン・フォー・トゥー・ラット・カオ・ヴァ・チャン・ドゥ・トー。",
    "adventureCard.shooter.name": "シューティング",
    "adventureCard.shooter.description": "シューター-遠隔のアーチェリー敵、基本攻撃。",
    "adventureCard.wooden-shieldwall.name": "木製シールドウォール",
    "adventureCard.wooden-shieldwall.description": "木製シールドウォール-クードチェ・テュング・ギュ、コ・クン・ナン・フォン・トゥ・トゥン・トゥング・ビン・ヴァ・ダ・ブ・チャイ。",
    "adventureCard.life-essence.name": "ライフエッセンス",
    "adventureCard.life-essence.description": "ライフエッセンス-ティン・ホア・サン・ハイ・ファッチ・サ・ク・カエ・タイ・ダ・ヴァ・タング・タット・チョ・サ。",
    "adventureCard.macarons.name": "マカロン",
    "adventureCard.macarons.description": "マカロン-バンナット・パップ・ハイ・ファチ・サチ・カエ・バンティン・ティン・タン。",
    "adventureCard.mystique-soup.name": "ミスティークスープ",
    "adventureCard.mystique-soup.description": "ミスティークスープ-体力を回復し、一時的に体力を高める神秘的なスープ。",
    "adventureCard.pizza.name": "ピザ",
    "adventureCard.pizza.description": "PIZZA - Bánh PIZZA (バン・ピッツァ) ”h” i ”ph” c ”s” c ”kh” e ”và tăng s” c ”m” nh ”t” n ”c” n ”.",
    "adventureCard.roast-chicken.description": "グリルチキン-おいしいグリルチキンは健康を回復し、免疫力を高めるのに役立ちます。",
    "adventureCard.roast-chicken.name": "ローストチキン",
    "adventureCard.abyss-call.name": "AbyssCall",
    "adventureCard.abyss-call.description": "AbyssCall -発動時に追加の敵をバトルに召喚するトラップ。",
    "adventureCard.breathe-fire.name": "Breathe Fire",
    "adventureCard.breathe-fire.description": "ブレスファイア-発動時にプレイヤーにダメージを与えるファイアトラップ。",
    "adventureCard.quicksand.description": "流砂-発動時にダメージを与え、プレイヤーを減速させる流砂トラップ。",
    "adventureCard.quicksand.name": "Quicksand",
    "adventureCard.bribery.name": "賄賂",
    "adventureCard.bribery.description": "贈収賄-コストよりも大きな報酬を受け取るための贈収賄。",
    "adventureCard.chest.name": "胸",
    "adventureCard.chest.description": "宝箱-さまざまな貴重な報酬が入ったメインの宝箱。",
    "adventureCard.gold-mine.name": "ドル箱！",
    "adventureCard.gold-mine.description": "GoldMine -資源を抽出するための鉱山。",
    "adventureCard.explosive.name": "爆発",
    "adventureCard.explosive.description": "爆発物-爆発して半径内のすべてのものにダメージを与える爆弾。",
    "adventureCard.cryo-fragment.name": "氷のエレメントのかけら",
    "adventureCard.cryo-fragment.description": "集めた氷のエレメントの破片はコインと交換して少量のエネルギーを回復することができます。",
    "adventureCard.empty.name": "空",
    "adventureCard.empty.description": "空-空のカードは効果がありません。",
    "adventureCard.hydro-fragment.name": "水のエレメントフラグメント",
    "adventureCard.hydro-fragment.description": "集めた水のエレメントの破片はコインと交換して少量のエネルギーを回復することができます。",
    "adventureCard.dendro-fragment.name": "エレメント・ハーブの欠片",
    "adventureCard.dendro-fragment.description": "集めたエレメンタルハーブの破片はコインと交換して少量のエネルギーを回復することができます。",
    "adventureCard.geo-fragment.name": "ロックエレメントの欠片",
    "adventureCard.geo-fragment.description": "集められた元素の岩の破片はコインと交換して少量のエネルギーを回復することができます。",
    "adventureCard.pyro-fragment.name": "火の要素のかけら",
    "adventureCard.pyro-fragment.description": "集めた炎のエレメントの破片はコインと交換して少量のエネルギーを回復することができます。",
    "adventureCard.electro-fragment.description": "集められたライトニング・エレメントの破片はコインと交換して少量のエネルギーを回復することができます。",
    "adventureCard.electro-fragment.name": "ライトニング・エレメントの断片",
    "adventureCard.anemo-fragment.name": "風の要素の破片",
    "adventureCard.anemo-fragment.description": "集められた風のエレメントの破片はコインと交換して少量のエネルギーを回復することができます。",
    "character.eula.name": "エウルア",
    "character.zhongli.name": "鍾離",
    "character.furina.name": "フリーナ",
    "character.mavuika.name": "マーヴイカ",
    "character.nahida.name": "ナヒーダ",
    "character.raiden.name": "雷電影",
    "character.venti.name": "ウェンティ",
    "map.dungeon_abyss_chamber.name": "深淵の部屋",
    "load_success": "データを読み込みました。",
    "save_success": "保存しました。",
    "load_error": "データを読み込めませんでした。",
    "save_error": "保存できませんでした。"
  }
}
```

