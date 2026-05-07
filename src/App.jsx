import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, Sparkles, Ghost, Flame, Droplet, Wind, Mountain, Moon, Sun, Star, 
  Crown, Shield, Zap, Swords, Skull, Heart, CircleDashed, LayoutDashboard,
  Layers, Store, ZapIcon, Crosshair, ShieldAlert, AlertCircle, Play, BookOpen, LogOut, Users, Check, X, Info, ArrowRightLeft, PackageOpen
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, getDocs, addDoc } from 'firebase/firestore';

// --- GAME DATA & CONFIGURATION ---

const RARITY_WEIGHTS = { Energy: 0, Common: 1, Rare: 2, Epic: 3, Legendary: 4, GX: 5 };

const RARITIES = {
  Energy: { label: 'Energy', color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'from-slate-700 to-slate-900', outerBg: 'bg-slate-950', foil: '' },
  Common: { label: 'Common', color: 'text-slate-300', border: 'border-slate-500/50', bg: 'from-slate-200 to-slate-400', outerBg: 'bg-slate-800', foil: '' },
  Rare: { label: 'Rare', color: 'text-blue-500', border: 'border-blue-400/50', bg: 'from-blue-100 to-blue-300', outerBg: 'bg-blue-950', foil: 'after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent' },
  Epic: { label: 'Epic', color: 'text-purple-500', border: 'border-purple-400/50', bg: 'from-purple-100 to-purple-300', outerBg: 'bg-purple-950', foil: 'after:bg-gradient-to-tr after:from-purple-400/30 after:via-white/60 after:to-purple-400/30' },
  Legendary: { label: 'Legendary', color: 'text-yellow-500', border: 'border-yellow-300/50', bg: 'from-yellow-100 to-amber-300', outerBg: 'bg-yellow-700', foil: 'after:bg-gradient-to-br after:from-yellow-300/50 after:via-white/70 after:to-pink-400/50 animate-pulse-slow' },
  GX: { label: 'GX', color: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400', border: 'border-cyan-300', bg: 'from-slate-900 via-fuchsia-950 to-slate-900', outerBg: 'bg-gradient-to-br from-cyan-400 via-purple-500 to-yellow-400 p-[3px]', foil: 'after:bg-gradient-to-bl after:from-cyan-300/40 after:via-white/60 after:to-yellow-300/40 animate-pulse' }
};

const ELEMENTS = {
  Water: { icon: Droplet, color: 'text-blue-600', artBg: 'from-blue-400 to-blue-800', imgFilter: 'sepia-[.5] hue-rotate-[190deg] saturate-200' },
  Earth: { icon: Mountain, color: 'text-amber-800', artBg: 'from-amber-700 to-slate-900', imgFilter: 'sepia-[.7] hue-rotate-[10deg] saturate-150' },
  Wind: { icon: Wind, color: 'text-teal-500', artBg: 'from-teal-300 to-cyan-700', imgFilter: 'sepia-[.3] hue-rotate-[130deg] saturate-150' },
  Steel: { icon: Shield, color: 'text-slate-600', artBg: 'from-slate-500 to-slate-800', imgFilter: 'grayscale contrast-125' },
  Fire: { icon: Flame, color: 'text-red-600', artBg: 'from-red-500 to-orange-700', imgFilter: 'sepia-[.8] hue-rotate-[-30deg] saturate-300' },
  Ghost: { icon: Ghost, color: 'text-indigo-500', artBg: 'from-indigo-500 to-purple-900', imgFilter: 'hue-rotate-[260deg] opacity-90 saturate-200 contrast-125' },
  Electric: { icon: Zap, color: 'text-yellow-500', artBg: 'from-yellow-500 to-amber-600', imgFilter: 'brightness-125 contrast-110 sepia-[.8] hue-rotate-[30deg]' },
  Dark: { icon: Skull, color: 'text-purple-950', artBg: 'from-slate-800 to-purple-950', imgFilter: 'invert-[.8] hue-rotate-[250deg] saturate-200' },
  Light: { icon: Sun, color: 'text-yellow-600', artBg: 'from-yellow-200 to-amber-600', imgFilter: 'brightness-125 contrast-110 sepia-[.5] hue-rotate-[10deg]' },
  Cosmic: { icon: Moon, color: 'text-fuchsia-600', artBg: 'from-fuchsia-700 to-indigo-950', imgFilter: 'hue-rotate-[290deg] contrast-150 saturate-200' }
};

const ENERGY_CARDS = Object.keys(ELEMENTS).map((el) => ({
  id: `en_${el.toLowerCase()}`,
  name: `${el} Energy`,
  rarity: 'Energy',
  element: el,
  isEnergy: true,
  hp: 0,
  dmg: 0,
  flavor: `Pure ${el} elemental energy. Equip to power up your attacks.`,
  imgSrc: '' 
}));

const COMBAT_CHARACTERS = [
  // --- SET 1: GENESIS ---
  { id: 'c1', set: 'genesis', name: 'Water Bubble', rarity: 'Common', element: 'Water', hp: 40, attack: 'Splash', dmg: 10, ability: 'Cleanse: Removes burn effects.', flavor: 'A cheerful droplet of sentient water.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=slime' },
  { id: 'c2', set: 'genesis', name: 'Desert Nomad', rarity: 'Common', element: 'Earth', hp: 50, attack: 'Sand Throw', dmg: 20, ability: 'Scavenge: Finds 5 coins if it survives.', flavor: 'Wanders the endless dunes seeking treasure.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=goblin' },
  { id: 'c3', set: 'genesis', name: 'Aero Prism', rarity: 'Common', element: 'Wind', hp: 30, attack: 'Sharp Gust', dmg: 15, ability: 'Evade: 10% chance to dodge attacks.', flavor: 'A floating crystal powered by the wind.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=wisp' },
  { id: 'c4', set: 'genesis', name: 'Scrap Drone', rarity: 'Common', element: 'Steel', hp: 70, attack: 'Wrench Toss', dmg: 20, ability: 'Plating: Reduces incoming damage by 5.', flavor: 'An outdated bot that still packs a punch.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=rusty' },
  { id: 'c5', set: 'genesis', name: 'Mud Sludge', rarity: 'Common', element: 'Earth', hp: 50, attack: 'Splat', dmg: 15, ability: 'Sticky: Lowers enemy speed.', flavor: 'A sentient puddle of thick mud.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=mud' },
  { id: 'c6', set: 'genesis', name: 'Static Spark', rarity: 'Common', element: 'Electric', hp: 30, attack: 'Jolt', dmg: 25, ability: 'Shock: May stun enemy for 1 turn.', flavor: 'A tiny burst of rogue energy.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=spark' },
  { id: 'c7', set: 'genesis', name: 'Ember Pup', rarity: 'Common', element: 'Fire', hp: 40, attack: 'Nip', dmg: 15, ability: 'Warmth: Heals adjacent allies by 5 HP.', flavor: 'Playful, but slightly too hot to pet.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=pup' },
  { id: 'c8', set: 'genesis', name: 'Dew Drop', rarity: 'Common', element: 'Water', hp: 30, attack: 'Drip', dmg: 10, ability: 'Refresh: Restores 10 HP to self.', flavor: 'Reflects the morning light beautifully.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=dew' },
  { id: 'c9', set: 'genesis', name: 'Shadow Imp', rarity: 'Common', element: 'Dark', hp: 45, attack: 'Scratch', dmg: 20, ability: 'Stealth: Cannot be targeted first turn.', flavor: 'Lurks just outside your peripheral vision.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=imp' },
  { id: 'c10', set: 'genesis', name: 'Scout Bot', rarity: 'Common', element: 'Steel', hp: 60, attack: 'Scan', dmg: 15, ability: 'Reveal: Exposes enemy traps.', flavor: 'Beeps reassuringly while surveying.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=scout' },
  { id: 'c11', set: 'genesis', name: 'Breeze Sprite', rarity: 'Common', element: 'Wind', hp: 35, attack: 'Puff', dmg: 10, ability: 'Tailwind: +10 Speed to team.', flavor: 'Guides lost travelers to safety.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=breeze' },
  { id: 'c12', set: 'genesis', name: 'Sun Mote', rarity: 'Common', element: 'Light', hp: 40, attack: 'Flash', dmg: 15, ability: 'Blind: Lowers enemy accuracy.', flavor: 'A concentrated beam of pure daylight.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=sun' },
  { id: 'c13', set: 'genesis', name: 'Stardust', rarity: 'Common', element: 'Cosmic', hp: 30, attack: 'Twinkle', dmg: 20, ability: 'Wish: Draw an extra card next turn.', flavor: 'Fell from a comet thousands of years ago.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=dust' },
  { id: 'c14', set: 'genesis', name: 'Pebble Pet', rarity: 'Common', element: 'Earth', hp: 70, attack: 'Roll', dmg: 10, ability: 'Hard Head: Immune to critical hits.', flavor: 'The lowest maintenance pet imaginable.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=pebble' },
  
  // --- SET 2: AWAKENING ---
  { id: 'a_c1', set: 'awakening', name: 'Spore Fiend', rarity: 'Common', element: 'Earth', hp: 45, attack: 'Leech', dmg: 15, ability: 'Heals self for 5 HP per hit.', flavor: 'Thrives in damp, dark caves.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=spore' },
  { id: 'a_c2', set: 'awakening', name: 'Aqua Pup', rarity: 'Common', element: 'Water', hp: 35, attack: 'Bite', dmg: 20, ability: 'Agile: Hard to hit.', flavor: 'A loyal companion of the sea.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=aquapup' },
  { id: 'a_c3', set: 'awakening', name: 'Ember Sprite', rarity: 'Common', element: 'Fire', hp: 30, attack: 'Cinder', dmg: 25, ability: 'Volatile: Explodes on death.', flavor: 'Leaves tiny scorch marks everywhere.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=ember' },
  { id: 'a_c4', set: 'awakening', name: 'Static Bug', rarity: 'Common', element: 'Electric', hp: 40, attack: 'Zap', dmg: 15, ability: 'Swarm: +5 DMG for each bug on bench.', flavor: 'Attracted to high-voltage lines.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=bug' },
  { id: 'a_c5', set: 'awakening', name: 'Alloy Drone', rarity: 'Common', element: 'Steel', hp: 60, attack: 'Ram', dmg: 10, ability: 'Sturdy: Cannot be 1-hit KO\'d.', flavor: 'Mass produced for heavy labor.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=alloy' },
  
  // --- SET 3: VOIDFALL ---
  { id: 'v_c1', set: 'voidfall', name: 'Void Slime', rarity: 'Common', element: 'Dark', hp: 50, attack: 'Absorb', dmg: 10, ability: 'Heals 10 HP every turn.', flavor: 'A puddle of pure dark matter.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=voidslime' },
  { id: 'v_c2', set: 'voidfall', name: 'Cosmic Dust', rarity: 'Common', element: 'Cosmic', hp: 30, attack: 'Sparkle', dmg: 20, ability: 'Confuse: 10% chance enemy misses.', flavor: 'Remnants of a dead star.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=cosmicdust' },
  { id: 'v_c3', set: 'voidfall', name: 'Ghost Lantern', rarity: 'Common', element: 'Ghost', hp: 40, attack: 'Flicker', dmg: 25, ability: 'Spook: Enemy cannot use abilities next turn.', flavor: 'Guides lost souls to the abyss.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=lantern' },
  { id: 'v_c4', set: 'voidfall', name: 'Meteor Hound', rarity: 'Common', element: 'Earth', hp: 60, attack: 'Crater Bite', dmg: 20, ability: 'Tough: Takes 5 less damage.', flavor: 'Forged in the heart of a falling meteor.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=meteorhound' },
  { id: 'v_c5', set: 'voidfall', name: 'Lunar Moth', rarity: 'Common', element: 'Wind', hp: 35, attack: 'Moon Gust', dmg: 15, ability: 'Evade: 20% dodge chance.', flavor: 'Only flies under a full moon.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=lunarmoth' },

  // --- SET 4: MYTHOS ---
  { id: 'm_c1', set: 'mythos', name: 'Minotaur Calf', rarity: 'Common', element: 'Earth', hp: 45, attack: 'Headbutt', dmg: 20, ability: 'Stubborn: Takes 5 less damage.', flavor: 'Small horns, big attitude.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=minotaur' },
  { id: 'm_c2', set: 'mythos', name: 'Harpy Hatchling', rarity: 'Common', element: 'Wind', hp: 35, attack: 'Screech', dmg: 15, ability: 'Annoy: Lowers enemy attack by 5.', flavor: 'Loud enough to wake the dead.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=harpy' },
  { id: 'm_c3', set: 'mythos', name: 'River Nymph', rarity: 'Common', element: 'Water', hp: 40, attack: 'Splash', dmg: 10, ability: 'Soothe: Heals 5 HP to active ally.', flavor: 'Protects the sacred streams.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=nymph' },
  { id: 'm_c4', set: 'mythos', name: 'Satyr Piper', rarity: 'Common', element: 'Earth', hp: 50, attack: 'Melody', dmg: 15, ability: 'Lullaby: 10% chance to sleep enemy.', flavor: 'Always ready for a woodland party.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=satyr' },
  { id: 'm_c5', set: 'mythos', name: 'Centaur Foal', rarity: 'Common', element: 'Wind', hp: 55, attack: 'Kick', dmg: 20, ability: 'Swift: Ignores retreat cost.', flavor: 'Faster than the plains wind.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=centaur' },
  { id: 'm_c6', set: 'mythos', name: 'Siren Song', rarity: 'Common', element: 'Water', hp: 40, attack: 'Echo', dmg: 15, ability: 'Lure: Prevents enemy retreat.', flavor: 'A beautiful voice with deadly intent.', imgSrc: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=siren' },
  { id: 'm_c7', set: 'mythos', name: 'Cyclops Runt', rarity: 'Common', element: 'Earth', hp: 60, attack: 'Stomp', dmg: 25, ability: 'Clumsy: 10% chance to hurt itself.', flavor: 'Only has one eye, still misses.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=cyclops' },
  { id: 'm_c8', set: 'mythos', name: 'Basilisk Scale', rarity: 'Common', element: 'Dark', hp: 30, attack: 'Glare', dmg: 15, ability: 'Petrify: 5% chance to stun.', flavor: 'Don\'t look directly at it.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=basilisk' },
  { id: 'm_c9', set: 'mythos', name: 'Gorgon Snake', rarity: 'Common', element: 'Dark', hp: 35, attack: 'Bite', dmg: 20, ability: 'Venom: Deals 5 damage end of turn.', flavor: 'Slipped away from Medusa\'s hair.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=snake' },
  { id: 'm_c10', set: 'mythos', name: 'Chimera Cub', rarity: 'Common', element: 'Fire', hp: 50, attack: 'Spark', dmg: 15, ability: 'Hybrid: Counts as Fire and Dark.', flavor: 'Three heads, triple the trouble.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=chimera' },
  { id: 'm_c11', set: 'mythos', name: 'Sphinx Riddle', rarity: 'Common', element: 'Light', hp: 45, attack: 'Confuse', dmg: 10, ability: 'Ponder: Opponent plays with hand revealed.', flavor: 'What walks on four legs in the morning?', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=sphinx' },
  { id: 'm_c12', set: 'mythos', name: 'Pegasus Feather', rarity: 'Common', element: 'Wind', hp: 30, attack: 'Glide', dmg: 20, ability: 'Aero: Immune to Earth attacks.', flavor: 'Lighter than air itself.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=pegasus' },
  { id: 'm_c13', set: 'mythos', name: 'Griffin Claw', rarity: 'Common', element: 'Wind', hp: 40, attack: 'Swipe', dmg: 25, ability: 'Fierce: +5 damage vs Rares.', flavor: 'Half lion, half eagle, all dangerous.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=griffin' },
  { id: 'm_c14', set: 'mythos', name: 'Kelpie Mane', rarity: 'Common', element: 'Water', hp: 50, attack: 'Drown', dmg: 20, ability: 'Tide: Water attacks do +5 damage.', flavor: 'A watery illusion of a horse.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=kelpie' },
  { id: 'm_c15', set: 'mythos', name: 'Manticore Barb', rarity: 'Common', element: 'Fire', hp: 45, attack: 'Sting', dmg: 25, ability: 'Poison: 5 damage between turns.', flavor: 'A deadly tail from a mythical beast.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=manticore' },

  // --- RARES, EPICS, LEGENDARIES, GX ---
  { id: 'r1', set: 'genesis', name: 'Pyromancer', rarity: 'Rare', element: 'Fire', hp: 80, attack: 'Fireball', dmg: 40, ability: 'Ignite: Deals 10 burn damage for 2 turns.', flavor: 'A mage obsessed with the dancing flames.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=flame' },
  { id: 'r2', set: 'genesis', name: 'Phantom Maiden', rarity: 'Rare', element: 'Ghost', hp: 70, attack: 'Eerie Chill', dmg: 45, ability: 'Intimidate: Lowers enemy attack by 10.', flavor: 'A lingering spirit from a forgotten era.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=aqua' },
  { id: 'r3', set: 'genesis', name: 'Voltage Mech', rarity: 'Rare', element: 'Electric', hp: 120, attack: 'Spark Plug', dmg: 30, ability: 'Overload: Double damage if below 30 HP.', flavor: 'A high-powered automaton running on raw electricity.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=golem' },
  { id: 'r4', set: 'genesis', name: 'Zephyr Fairy', rarity: 'Rare', element: 'Wind', hp: 60, attack: 'Tornado Sweep', dmg: 50, ability: 'Gale Force: Switches out the enemy active card.', flavor: 'Dances inside hurricanes for fun.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=sprite' },
  { id: 'r5', set: 'genesis', name: 'Aqua Knight', rarity: 'Rare', element: 'Water', hp: 90, attack: 'Wave Slash', dmg: 40, ability: 'Tide Shield: Blocks the next 20 damage.', flavor: 'Defends the sunken kingdoms with honor.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=aquaknight' },
  { id: 'r6', set: 'genesis', name: 'Inferno Bot', rarity: 'Rare', element: 'Fire', hp: 100, attack: 'Heat Ray', dmg: 50, ability: 'Meltdown: Deals 30 damage to self and enemy on death.', flavor: 'Overheats frequently, but deals massive damage.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=inferno' },
  { id: 'r7', set: 'genesis', name: 'Gale Glider', rarity: 'Rare', element: 'Wind', hp: 75, attack: 'Dive', dmg: 45, ability: 'First Strike: Always attacks first.', flavor: 'Never touches the ground if it can help it.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=glider' },
  { id: 'r8', set: 'genesis', name: 'Lunar Owl', rarity: 'Rare', element: 'Cosmic', hp: 80, attack: 'Moonbeam', dmg: 55, ability: 'Foresight: Look at the top card of your deck.', flavor: 'Its hoot can be heard across the vacuum of space.', imgSrc: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=owl' },
  { id: 'r9', set: 'genesis', name: 'Terra Golem', rarity: 'Rare', element: 'Earth', hp: 140, attack: 'Quake', dmg: 35, ability: 'Tremor: Deals 10 damage to benched enemies.', flavor: 'A moving mountain of raw strength.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=terra' },
  { id: 'r10', set: 'genesis', name: 'Plasma Core', rarity: 'Rare', element: 'Electric', hp: 90, attack: 'Shockwave', dmg: 60, ability: 'Chain Lightning: Hits a second enemy for half damage.', flavor: 'An unstable reactor just waiting to burst.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=plasma' },
  
  { id: 'a_r1', set: 'awakening', name: 'Forest Guardian', rarity: 'Rare', element: 'Earth', hp: 110, attack: 'Root Smash', dmg: 40, ability: 'Photosynthesis: Heals 10 HP every turn.', flavor: 'Ancient protector of the old woods.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=guardian' },
  { id: 'a_r2', set: 'awakening', name: 'Tidal Serpent', rarity: 'Rare', element: 'Water', hp: 95, attack: 'Aqua Tail', dmg: 55, ability: 'Slippery: Ignores enemy abilities.', flavor: 'Rules the treacherous coral reefs.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=serpent' },
  { id: 'a_r3', set: 'awakening', name: 'Flame Knight', rarity: 'Rare', element: 'Fire', hp: 100, attack: 'Blazing Sword', dmg: 60, ability: 'Honor: Does double DMG if you have fewer prizes.', flavor: 'Sworn to the order of the burning sun.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=flameknight' },
  
  { id: 'v_r1', set: 'voidfall', name: 'Astral Knight', rarity: 'Rare', element: 'Steel', hp: 100, attack: 'Star Slash', dmg: 50, ability: 'Armor: Blocks 10 damage per attack.', flavor: 'A guardian of the cosmic gates.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=astralknight' },
  { id: 'v_r2', set: 'voidfall', name: 'Poltergeist', rarity: 'Rare', element: 'Ghost', hp: 80, attack: 'Telekinesis', dmg: 60, ability: 'Haunt: Deals 10 damage to enemy bench.', flavor: 'Throws whatever it can find.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=poltergeist' },
  { id: 'v_r3', set: 'voidfall', name: 'Starfire Elemental', rarity: 'Rare', element: 'Fire', hp: 90, attack: 'Nova Blast', dmg: 70, ability: 'Overheat: Takes 10 damage after attacking.', flavor: 'Burns brighter than a supernova.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=starfire' },
  
  { id: 'm_r1', set: 'mythos', name: 'Cerberus', rarity: 'Rare', element: 'Dark', hp: 110, attack: 'Tri-Bite', dmg: 45, ability: 'Guard: Blocks retreat for opponent.', flavor: 'The three-headed hound of Hades.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=cerberus' },
  { id: 'm_r2', set: 'mythos', name: 'Hydra', rarity: 'Rare', element: 'Water', hp: 130, attack: 'Acid Spit', dmg: 40, ability: 'Regrow: Heals 10 HP when damaged.', flavor: 'Cut off one head, two more shall take its place.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=hydra' },
  { id: 'm_r3', set: 'mythos', name: 'Kraken', rarity: 'Rare', element: 'Water', hp: 140, attack: 'Tentacle Smash', dmg: 50, ability: 'Drag Down: Discards opponent active energy.', flavor: 'Release the beast of the depths.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=kraken' },
  { id: 'm_r4', set: 'mythos', name: 'Leviathan', rarity: 'Rare', element: 'Water', hp: 150, attack: 'Tidal Wave', dmg: 60, ability: 'Massive: Cannot be instantly KOd.', flavor: 'The undisputed king of the ocean.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=leviathan' },
  { id: 'm_r5', set: 'mythos', name: 'Fenrir', rarity: 'Rare', element: 'Dark', hp: 120, attack: 'Wolf Bite', dmg: 65, ability: 'Unbound: Breaks through all shields.', flavor: 'The wolf destined to swallow the sun.', imgSrc: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=fenrir' },
  { id: 'm_r6', set: 'mythos', name: 'Valkyrie', rarity: 'Rare', element: 'Light', hp: 90, attack: 'Spear Dive', dmg: 55, ability: 'Valhalla: Revives self once with 10 HP.', flavor: 'Chooser of the slain.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=valkyrie' },
  { id: 'm_r7', set: 'mythos', name: 'Wendigo', rarity: 'Rare', element: 'Ghost', hp: 100, attack: 'Frost Claw', dmg: 60, ability: 'Hunger: +10 damage for each prize card taken.', flavor: 'A spirit of winter and starvation.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=wendigo' },
  { id: 'm_r8', set: 'mythos', name: 'Thunderbird', rarity: 'Rare', element: 'Electric', hp: 110, attack: 'Lightning Strike', dmg: 70, ability: 'Storm: Deals 5 damage to all benched pokemon.', flavor: 'Lightning flashes with every flap of its wings.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=thunderbird' },
  { id: 'm_r9', set: 'mythos', name: 'Kitsune', rarity: 'Rare', element: 'Fire', hp: 95, attack: 'Fox Fire', dmg: 50, ability: 'Illusion: Avoids attacks 25% of the time.', flavor: 'A nine-tailed spirit of trickery.', imgSrc: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=kitsune' },

  { id: 'e1', set: 'genesis', name: 'Shadow Automaton', rarity: 'Epic', element: 'Dark', hp: 100, attack: 'Dark Beam', dmg: 80, ability: 'Siphon: Heals for 50% of damage dealt.', flavor: 'Constructed from forbidden, abyssal technology.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=void' },
  { id: 'e2', set: 'genesis', name: 'Dawn Paladin', rarity: 'Epic', element: 'Light', hp: 130, attack: 'Radiant Slash', dmg: 70, ability: 'Aura of Light: Allies take 10 less damage.', flavor: 'Draws power directly from the midday sun.', imgSrc: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=solar' },
  { id: 'e3', set: 'genesis', name: 'Iron Blademaster', rarity: 'Epic', element: 'Steel', hp: 90, attack: 'Omni-Slash', dmg: 90, ability: 'Pierce: Ignores enemy armor and shields.', flavor: 'Has mastered every weapon known to mankind.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=blade' },
  { id: 'e4', set: 'genesis', name: 'Storm Bringer', rarity: 'Epic', element: 'Wind', hp: 110, attack: 'Hurricane', dmg: 85, ability: 'Cyclone: Shuffles enemy hand.', flavor: 'Summons storms with a flick of the wrist.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=storm' },
  { id: 'e5', set: 'genesis', name: 'Abyssal Horror', rarity: 'Epic', element: 'Dark', hp: 140, attack: 'Void Crush', dmg: 95, ability: 'Terror: Enemies cannot heal while this is active.', flavor: 'Do not look into its eyes. Just don\'t.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=horror' },
  { id: 'e6', set: 'genesis', name: 'Luminous Seraph', rarity: 'Epic', element: 'Light', hp: 120, attack: 'Holy Strike', dmg: 80, ability: 'Resurrect: Revives the first fainted ally with 30 HP.', flavor: 'Descends from the heavens to smite evil.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=seraph' },
  
  { id: 'a_e1', set: 'awakening', name: 'Thunder Wyrm', rarity: 'Epic', element: 'Electric', hp: 130, attack: 'Lightning Breath', dmg: 90, ability: 'Paralyze: Enemy misses next turn 50% of the time.', flavor: 'Storm clouds gather where it flies.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=wyrm' },
  { id: 'a_e2', set: 'awakening', name: 'Abyssal Warden', rarity: 'Epic', element: 'Dark', hp: 150, attack: 'Soul Drain', dmg: 75, ability: 'Dark Aura: All non-Dark cards lose 10 Max HP.', flavor: 'Keeper of the deepest dungeon.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=warden' },
  
  { id: 'v_e1', set: 'voidfall', name: 'Event Horizon', rarity: 'Epic', element: 'Dark', hp: 140, attack: 'Gravity Crush', dmg: 85, ability: 'Pull: Forces enemy to swap active card.', flavor: 'Nothing escapes its grasp.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=eventhorizon' },
  { id: 'v_e2', set: 'voidfall', name: 'Supernova Spirit', rarity: 'Epic', element: 'Light', hp: 120, attack: 'Blinding Flash', dmg: 90, ability: 'Radiance: Heals all benched allies for 10.', flavor: 'The spectacular end of a massive star.', imgSrc: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=supernovaspirit' },

  { id: 'm_e1', set: 'mythos', name: 'Bahamut', rarity: 'Epic', element: 'Cosmic', hp: 160, attack: 'Mega Flare', dmg: 90, ability: 'Dragon King: Buffs all allied attacks by +10.', flavor: 'The platinum dragon of legend.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=bahamut' },
  { id: 'm_e2', set: 'mythos', name: 'Jormungandr', rarity: 'Epic', element: 'Water', hp: 170, attack: 'World Coil', dmg: 85, ability: 'Constrict: Enemy active cannot retreat.', flavor: 'The serpent that encircles the world.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=jormun' },
  { id: 'm_e3', set: 'mythos', name: 'Quetzalcoatl', rarity: 'Epic', element: 'Wind', hp: 150, attack: 'Hurricane Breath', dmg: 80, ability: 'Feathered Serpent: Heals team 10 HP per turn.', flavor: 'The majestic deity of wind and wisdom.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=quetzal' },
  { id: 'm_e4', set: 'mythos', name: 'Behemoth', rarity: 'Epic', element: 'Earth', hp: 180, attack: 'Earth Shatter', dmg: 95, ability: 'Unstoppable: Immune to all negative status effects.', flavor: 'The beast that shakes the earth.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=behemoth' },

  { id: 'l1', set: 'genesis', name: 'Nebula Construct', rarity: 'Legendary', element: 'Cosmic', hp: 180, attack: 'Supernova', dmg: 150, ability: 'Big Bang: Destroys all shields and buffs on the field.', flavor: 'An abstract entity born from a dying star.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=dragon' },
  { id: 'l2', set: 'genesis', name: 'Astral Weaver', rarity: 'Legendary', element: 'Light', hp: 150, attack: 'Solar Flare', dmg: 140, ability: 'Reality Warp: Swap HP percentage with enemy once per game.', flavor: 'Spins new galaxies from stardust.', imgSrc: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=star' },
  { id: 'l3', set: 'genesis', name: 'Titan of the Deep', rarity: 'Legendary', element: 'Water', hp: 200, attack: 'Tsunami', dmg: 160, ability: 'Flood: Washes away all bench cards, forcing a reset.', flavor: 'Sleeps at the bottom of the Mariana Trench.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=titan' },
  { id: 'a_l1', set: 'awakening', name: 'Solar Dragon', rarity: 'Legendary', element: 'Light', hp: 190, attack: 'Solar Beam', dmg: 140, ability: 'Purify: Clears all negative effects from your team.', flavor: 'Breathes life-giving warmth across the land.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=solardragon' },
  { id: 'v_l1', set: 'voidfall', name: 'Void Leviathan', rarity: 'Legendary', element: 'Water', hp: 200, attack: 'Abyssal Maw', dmg: 130, ability: 'Consume: Instantly destroys any card under 40 HP.', flavor: 'Swallows entire planets whole.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=voidleviathan' },
  { id: 'm_l1', set: 'mythos', name: 'Ouroboros', rarity: 'Legendary', element: 'Cosmic', hp: 220, attack: 'Eternal Cycle', dmg: 140, ability: 'Infinity: If knocked out, shuffles back into deck instead of discarding.', flavor: 'The snake eating its own tail. The infinite loop.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=ouroboros' },

  { id: 'gx1', set: 'genesis', name: 'Alpha Genesis GX', rarity: 'GX', element: 'Cosmic', hp: 280, attack: 'Omega Burst', dmg: 220, ability: 'GX Rule: When knocked out, opponent takes 2 Prize cards.', flavor: 'The primordial force that birthed the elements.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=alpha' },
  { id: 'a_gx1', set: 'awakening', name: 'Eclipse Necromancer GX', rarity: 'GX', element: 'Dark', hp: 260, attack: 'Shadow Oblivion', dmg: 200, ability: 'GX Rule: When knocked out, opponent takes 2 Prize cards.', flavor: 'Raises the fallen to block out the sun.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=necro' },
  { id: 'v_gx1', set: 'voidfall', name: 'Chaos Bringer GX', rarity: 'GX', element: 'Dark', hp: 290, attack: 'Annihilation', dmg: 240, ability: 'GX Rule: When knocked out, opponent takes 2 Prize cards.', flavor: 'The embodiment of universal entropy.', imgSrc: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=chaosbringer' },
  { id: 'm_gx1', set: 'mythos', name: 'Chronos GX', rarity: 'GX', element: 'Cosmic', hp: 300, attack: 'Time Paradox', dmg: 250, ability: 'GX Rule: When knocked out, opponent takes 2 Prize cards.', flavor: 'The master of time. Erases enemies from existence.', imgSrc: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=chronos' }
];

const CHARACTERS = [...ENERGY_CARDS, ...COMBAT_CHARACTERS];

const PACKS = [
  {
    id: 'p1', name: 'Genesis Premium', description: '8 Cards. Guarantees 1 Epic & 1 Rare. Features Alpha Genesis GX!',
    cost: 500, cardCount: 8, color: 'from-amber-600 via-yellow-600 to-amber-800',
    dropRates: { Common: 0.50, Rare: 0.34, Epic: 0.12, Legendary: 0.03, GX: 0.01 },
    guaranteed: ['Epic', 'Rare'],
    set: 'genesis',
    featuredCardId: 'gx1'
  },
  {
    id: 'p2', name: 'Awakening Booster', description: '5 Cards. New elements emerge! Features Eclipse Necromancer GX!',
    cost: 300, cardCount: 5, color: 'from-blue-700 via-indigo-700 to-slate-900',
    dropRates: { Common: 0.58, Rare: 0.28, Epic: 0.10, Legendary: 0.03, GX: 0.01 },
    guaranteed: ['Rare'],
    set: 'awakening',
    featuredCardId: 'a_gx1'
  },
  {
    id: 'p3', name: 'Voidfall Booster', description: '6 Cards. Embrace the darkness! Features Chaos Bringer GX!',
    cost: 400, cardCount: 6, color: 'from-fuchsia-800 via-purple-800 to-slate-950',
    dropRates: { Common: 0.55, Rare: 0.30, Epic: 0.11, Legendary: 0.03, GX: 0.01 },
    guaranteed: ['Rare'],
    set: 'voidfall',
    featuredCardId: 'v_gx1'
  },
  {
    id: 'p4', name: 'Mythos Booster', description: '5 Cards. Face ancient legends! Features Chronos GX!',
    cost: 400, cardCount: 5, color: 'from-emerald-700 via-teal-700 to-slate-900',
    dropRates: { Common: 0.55, Rare: 0.30, Epic: 0.11, Legendary: 0.03, GX: 0.01 },
    guaranteed: ['Rare'],
    set: 'mythos',
    featuredCardId: 'm_gx1'
  }
];

const BOXES = [
  {
    id: 'bx1', name: 'Mythos Collector Box', description: 'Includes 6 Mythos Packs, 1 Guaranteed Chronos GX, and 1 exclusive MASSIVE card!',
    cost: 5000, color: 'from-purple-900 via-indigo-900 to-black',
    packId: 'p4', promoId: 'm_gx1'
  }
];

const STARTER_DECK = [
  'en_water', 'en_water', 'en_water', 'en_water', 
  'en_earth', 'en_earth', 'en_earth', 'en_earth', 
  'en_wind', 'en_wind', 
  'c1', 'c1', 'c1', 
  'c2', 'c2', 'c2', 
  'c3', 'c3', 
  'c5', 'c5', 'c5', 
  'c8', 'c8', 'c8', 
  'c11', 'c11', 
  'r5', 'r5', 
  'r9', 'r9'
];

const INITIAL_COLLECTION = {};
STARTER_DECK.forEach(id => {
  INITIAL_COLLECTION[id] = (INITIAL_COLLECTION[id] || 0) + 1;
});

// --- HELPER LOGIC ---

const appId = typeof __app_id !== 'undefined' ? String(__app_id).replace(/\//g, '_') : 'mythic-pulls-live';

const getLobbyCol = (db) => collection(db, 'artifacts', appId, 'public', 'data', 'lobby');
const getMatchesCol = (db) => collection(db, 'artifacts', appId, 'public', 'data', 'matches');
const getTradesCol = (db) => collection(db, 'artifacts', appId, 'public', 'data', 'trades');
const getSaveDocRef = (db, uid) => doc(db, 'artifacts', appId, 'users', uid, 'savedata', 'game');

const getBaseCard = (id) => {
    if (!id) return null;
    const baseId = id.replace('_massive', '');
    const card = CHARACTERS.find(c => c.id === baseId);
    if (!card) return null;
    return { ...card, id: id, isMassive: id.includes('_massive') };
};

const rollRarity = (dropRates) => {
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, chance] of Object.entries(dropRates)) {
    cumulative += chance;
    if (roll <= cumulative) return rarity;
  }
  return 'Common';
};

const openPack = (pack) => {
  let pulled = [];
  const setCards = COMBAT_CHARACTERS.filter(c => c.set === pack.set);

  pack.guaranteed.forEach(rarity => {
    let finalRarity = rarity;
    if (rarity === 'Legendary' && Math.random() < 0.2) finalRarity = 'GX';

    let possible = setCards.filter(c => c.rarity === finalRarity);
    if(possible.length === 0) possible = setCards.filter(c => c.rarity === 'Legendary'); 
    if(possible.length === 0) possible = setCards; 
    pulled.push({ ...possible[Math.floor(Math.random() * possible.length)], instanceId: Math.random().toString(36).substr(2, 9) });
  });
  
  pulled.push({ ...ENERGY_CARDS[Math.floor(Math.random() * ENERGY_CARDS.length)], instanceId: Math.random().toString(36).substr(2, 9) });
  
  const remaining = pack.cardCount - pack.guaranteed.length - 1;
  for (let i = 0; i < remaining; i++) {
    const rolledRarity = rollRarity(pack.dropRates);
    let possible = setCards.filter(c => c.rarity === rolledRarity);
    if(possible.length === 0) possible = setCards.filter(c => c.rarity === 'Common'); 
    pulled.push({ ...possible[Math.floor(Math.random() * possible.length)], instanceId: Math.random().toString(36).substr(2, 9) });
  }
  return pulled.sort((a, b) => RARITY_WEIGHTS[b.rarity] - RARITY_WEIGHTS[a.rarity]); 
};

// --- GLOBAL TOAST COMPONENT ---
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border backdrop-blur-xl ${
        type === 'error' ? 'bg-rose-950/80 border-rose-500/50 text-rose-100' : 
        type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100' : 
        'bg-slate-900/90 border-slate-700 text-slate-200'
      }`}>
        {type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
        {type === 'success' && <Check className="w-5 h-5 text-emerald-500" />}
        {type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
        <span className="font-bold tracking-wide text-sm sm:text-base">{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

// --- COMPONENTS ---

const TCGCard = ({ card, size = 'large', isFlipped = true, onClick, inBattle = false, isSelected = false }) => {
  if (!card) return null;
  const rarityStyle = RARITIES[card.rarity || 'Common'];
  const elementStyle = ELEMENTS[card.element || 'Water'];
  const ElementIcon = elementStyle?.icon || CircleDashed;
  
  let dims = '';
  let padding = '';
  let iconSize = '';
  let elementIconSize = '';

  if (size === 'large') {
    dims = 'w-72 h-[29rem] sm:w-[24rem] sm:h-[36rem] text-base';
    padding = 'p-3 sm:p-5'; iconSize = 'w-48 h-48'; elementIconSize = 'w-8 h-8';
  } else if (size === 'small') {
    dims = 'w-full aspect-[2.5/3.6] text-[0.6rem] sm:text-xs';
    padding = 'p-2'; iconSize = 'w-16 h-16'; elementIconSize = 'w-3 h-3';
  } else if (size === 'mini') {
    dims = 'w-16 sm:w-20 lg:w-24 aspect-[2.5/3.6] text-[0.4rem]';
    padding = 'p-1'; iconSize = 'w-8 h-8'; elementIconSize = 'w-2 h-2 hidden sm:block';
  }

  if (card.isMassive && size === 'large') dims += ' scale-110';

  const selectionRing = isSelected ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : '';
  const massiveGlow = card.isMassive ? 'shadow-[0_0_40px_rgba(234,179,8,0.6)] border-yellow-400' : '';

  if (card.isEnergy) {
    return (
      <div className={`relative cursor-pointer group perspective-1000 ${dims} ${selectionRing}`} onClick={onClick} style={{ perspective: '1000px' }}>
        <div className={`w-full h-full absolute transition-transform duration-500 preserve-3d shadow-2xl rounded-3xl ${!isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: !isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          <div className={`absolute w-full h-full backface-hidden rounded-3xl border-2 sm:border-[4px] border-slate-700 bg-gradient-to-br ${elementStyle.artBg} flex flex-col items-center justify-between py-4 sm:py-8 shadow-inner overflow-hidden`} style={{ backfaceVisibility: 'hidden' }}>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
             {size !== 'mini' && <h3 className={`font-black uppercase tracking-[0.3em] text-white/90 drop-shadow-md ${size === 'large' ? 'text-3xl mt-4' : 'text-[0.65rem] sm:text-xs'}`}>ENERGY</h3>}
             <div className={`bg-white/10 p-3 sm:p-8 rounded-full shadow-[0_0_50px_rgba(255,255,255,0.2)] backdrop-blur-xl border border-white/20 group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all duration-500`}>
                <ElementIcon className={`${size === 'large' ? 'w-32 h-32' : size === 'small' ? 'w-10 h-10' : 'w-6 h-6'} text-white drop-shadow-lg`} />
             </div>
             {size !== 'mini' && <h4 className={`font-black uppercase tracking-[0.4em] text-white/80 drop-shadow-md mb-2 ${size === 'large' ? 'text-2xl' : 'text-[0.55rem] sm:text-[0.65rem]'}`}>{card.element}</h4>}
          </div>
          <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 sm:border-[4px] border-slate-700/50 rounded-3xl flex items-center justify-center shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
             <Layers className={`${size === 'large' ? 'w-24 h-24' : 'w-6 h-6 sm:w-10 sm:h-10'} text-amber-500 drop-shadow-md`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative cursor-pointer group perspective-1000 ${dims} ${selectionRing}`} onClick={onClick} style={{ perspective: '1000px' }}>
      
      {/* MASSIVE BADGE */}
      {card.isMassive && isFlipped && (
          <div className="absolute -top-3 -right-3 z-50 bg-gradient-to-r from-yellow-400 via-rose-500 to-fuchsia-500 text-white font-black px-3 py-1 rounded-full border-2 border-white transform rotate-12 shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse uppercase tracking-widest text-[0.6rem] sm:text-xs">
              MASSIVE
          </div>
      )}

      <div className={`w-full h-full absolute transition-transform duration-500 preserve-3d rounded-3xl ${massiveGlow} ${card.isMassive && isFlipped ? 'shadow-[0_0_40px_rgba(234,179,8,0.6)]' : 'shadow-2xl'} ${!isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: !isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        
        {/* Front */}
        <div className={`absolute w-full h-full backface-hidden rounded-3xl ${rarityStyle.outerBg} p-[2px] sm:p-1 ${card.isMassive ? 'bg-gradient-to-br from-yellow-400 via-red-500 to-fuchsia-500' : ''}`} style={{ backfaceVisibility: 'hidden' }}>
          <div className={`relative w-full h-full rounded-[1.3rem] sm:rounded-[1.6rem] bg-gradient-to-br ${rarityStyle.bg} flex flex-col overflow-hidden border border-white/10 ${card.isMassive ? 'border-yellow-200/50' : ''}`}>
            {rarityStyle.foil && <div className={`absolute inset-0 z-20 pointer-events-none mix-blend-overlay opacity-60 ${rarityStyle.foil}`}></div>}
            {card.isMassive && <div className="absolute inset-0 z-20 pointer-events-none mix-blend-color-dodge bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pulse-slow"></div>}

            {/* Header */}
            <div className={`flex justify-between items-center ${padding} bg-white/40 backdrop-blur-md border-b border-white/20`}>
              <h3 className={`font-black uppercase tracking-tight ${rarityStyle.color || 'text-slate-900'} ${size === 'large' ? 'text-2xl sm:text-3xl' : size === 'small' ? 'text-[0.6rem] sm:text-[0.8rem]' : 'text-[0.4rem] sm:text-[0.5rem]'} truncate max-w-[70%] drop-shadow-sm ${card.isMassive ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-fuchsia-600 drop-shadow-none' : ''}`}>{card.name}</h3>
              <div className="flex items-center space-x-1 font-black text-rose-700 shrink-0 bg-white/60 px-1.5 py-0.5 rounded-full shadow-sm border border-white/50">
                {size !== 'mini' && <span className="drop-shadow-sm">{card.hp} HP</span>}
                <div className={`rounded-full bg-white p-0.5 shadow-sm`}>
                  <ElementIcon className={`${elementIconSize} ${elementStyle.color}`} />
                </div>
              </div>
            </div>

            {/* Art */}
            <div className={`flex-1 m-1.5 sm:m-2.5 border border-white/20 bg-gradient-to-br ${elementStyle.artBg} shadow-inner flex items-center justify-center relative overflow-hidden rounded-xl`}>
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
              <div className={`${iconSize} z-10 relative drop-shadow-[0_10px_15px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform duration-500 ease-out ${card.isMassive ? 'scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]' : ''}`}>
                <img src={card.imgSrc} alt={card.name} className={`w-full h-full object-contain ${elementStyle.imgFilter}`} />
              </div>
            </div>

            {/* In Battle Overlays */}
            {inBattle && (
               <>
                 <div className="absolute top-1 left-1 right-1 bg-black/60 rounded-full h-2 sm:h-2.5 overflow-hidden z-30 border border-white/20 backdrop-blur-md shadow-inner">
                    <div className={`h-full transition-all duration-500 ease-out ${card.currentHp > card.hp * 0.5 ? 'bg-emerald-500' : card.currentHp > card.hp * 0.2 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(0, (card.currentHp / card.hp) * 100)}%` }}></div>
                 </div>
                 {card.attachedEnergy > 0 && (
                   <div className="absolute bottom-[35%] right-2 flex flex-col gap-1.5 z-30">
                     {[...Array(card.attachedEnergy)].map((_, i) => (
                       <div key={i} className="w-5 h-5 sm:w-7 sm:h-7 bg-white/90 backdrop-blur-sm rounded-full border-2 border-slate-800 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in">
                         <ZapIcon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 drop-shadow-sm" />
                       </div>
                     ))}
                   </div>
                 )}
               </>
            )}

            {/* Footer / Stats */}
            {size !== 'mini' && (
              <div className={`bg-white/80 backdrop-blur-md flex flex-col ${padding} border-t border-white/30`}>
                <div className="flex justify-between items-center font-black">
                  <span className={`flex items-center gap-1.5 sm:gap-2 ${size === 'large' ? 'text-xl' : 'text-[0.5rem] sm:text-[0.65rem]'} text-slate-800`}>
                     <Swords className={`${elementIconSize} text-slate-500`} /> {card.attack}
                  </span>
                  <div className="flex flex-col items-end leading-none text-rose-600 drop-shadow-sm">
                    <span className={`${size === 'large' ? 'text-3xl' : 'text-[0.75rem] sm:text-xs'}`}>{card.dmg}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 sm:border-[4px] border-slate-700/50 rounded-3xl flex items-center justify-center shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <Layers className={`${size === 'large' ? 'w-24 h-24' : 'w-6 h-6 sm:w-10 sm:h-10'} text-amber-500 drop-shadow-md`} />
        </div>
      </div>
    </div>
  );
};


// --- OFFLINE BATTLE ARENA COMPONENT ---
const BattleArena = ({ playerDeckIds, onWin, onLose, onExit, difficulty, showToast }) => {
  const [gameState, setGameState] = useState('setup');
  const [winner, setWinner] = useState(null);
  const [log, setLog] = useState(["Battle starting... Shuffling decks."]);

  const [player, setPlayer] = useState(null);
  const [bot, setBot] = useState(null);
  const [selectedHandCard, setSelectedHandCard] = useState(null);

  const addToLog = (msg) => setLog(prev => [...prev, msg].slice(-10)); 

  useEffect(() => {
    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);
    
    const createBattleDeck = (idArray) => shuffle(idArray).map(id => {
      const base = getBaseCard(id);
      return { ...base, instanceId: Math.random().toString(36).substr(2, 9), currentHp: base.hp, attachedEnergy: 0 };
    });

    let pDeck, pHand;
    let playerHasBasic = false;
    let attempts = 0;
    
    while (!playerHasBasic && attempts < 15) {
       pDeck = createBattleDeck(playerDeckIds);
       pHand = pDeck.slice(0, 7);
       pDeck = pDeck.slice(7);
       if (pHand.some(c => !c.isEnergy)) playerHasBasic = true;
       attempts++;
    }

    let bDeck, bHand;
    let botHasBasic = false;
    attempts = 0;
    
    const poolWeights = {
       easy: { Common: 85, Rare: 15 },
       medium: { Common: 40, Rare: 50, Epic: 10 },
       hard: { Rare: 50, Epic: 40, Legendary: 10 },
       extreme: { Epic: 30, Legendary: 50, GX: 20 }
    };

    while (!botHasBasic && attempts < 15) {
       let bDeckIds = [];
       for(let i=0; i<10; i++) bDeckIds.push(ENERGY_CARDS[Math.floor(Math.random() * ENERGY_CARDS.length)].id);
       
       const weights = poolWeights[difficulty] || poolWeights.medium;
       const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

       for(let i=0; i<20; i++) {
          let random = Math.random() * totalWeight;
          let targetRarity = 'Common';
          for (const [rarity, weight] of Object.entries(weights)) {
              if (random < weight) { targetRarity = rarity; break; }
              random -= weight;
          }
          let options = COMBAT_CHARACTERS.filter(c => c.rarity === targetRarity);
          if (options.length === 0) options = COMBAT_CHARACTERS.filter(c => c.rarity === 'Common');
          bDeckIds.push(options[Math.floor(Math.random() * options.length)].id);
       }
       
       bDeck = createBattleDeck(bDeckIds);
       bHand = bDeck.slice(0, 7);
       bDeck = bDeck.slice(7);
       if (bHand.some(c => !c.isEnergy)) botHasBasic = true;
       attempts++;
    }

    const botStartingPrizes = difficulty === 'extreme' ? 2 : 3;

    setPlayer({ deck: pDeck, hand: pHand, bench: [], active: null, prizes: 3, energyAttachedThisTurn: false, hasDrawnThisTurn: false });
    setBot({ deck: bDeck, hand: bHand, bench: [], active: null, prizes: botStartingPrizes });
    setLog([`Battle started on ${difficulty.toUpperCase()} difficulty! Choose a Basic Character.`]);
    
  }, [playerDeckIds, difficulty]);

  useEffect(() => {
    // FORCE PLAYER TO PROMOTE
    if (gameState === 'playerTurn' && player && !player.active) {
        const hasBasicInHand = player.hand.some(c => !c.isEnergy);
        if (player.bench.filter(Boolean).length === 0 && !hasBasicInHand) {
            addToLog("You have no more characters! You blacked out.");
            setWinner('bot');
            setGameState('gameOver');
        }
    }
  }, [gameState, player]);

  useEffect(() => {
    if (gameState === 'botTurn' && bot && player) {
      const executeBotTurn = async () => {
        addToLog("--- Bot's Turn ---");
        await new Promise(r => setTimeout(r, 1000));
        
        let currentBot = { 
          ...bot, deck: [...bot.deck], hand: [...bot.hand], bench: [...bot.bench],
          active: bot.active ? { ...bot.active } : null 
        };
        let currentPlayer = { 
          ...player, active: player.active ? { ...player.active } : null
        };

        if (currentBot.deck.length > 0) {
          currentBot.hand.push(currentBot.deck.pop());
          addToLog("Bot drew a card.");
        } else {
          addToLog("Bot is out of cards! Player wins!");
          setWinner('player');
          setGameState('gameOver');
          return;
        }

        setBot(currentBot);
        await new Promise(r => setTimeout(r, 1000));

        // FORCE BOT TO PROMOTE IF NO ACTIVE
        if (!currentBot.active) {
            if (currentBot.bench.filter(Boolean).length > 0) {
                const bIdx = currentBot.bench.findIndex(Boolean);
                currentBot.active = currentBot.bench.splice(bIdx, 1)[0];
                addToLog(`Bot promoted ${currentBot.active.name}.`);
            } else {
                const basicIdx = currentBot.hand.findIndex(c => !c.isEnergy);
                if (basicIdx >= 0) {
                    currentBot.active = currentBot.hand.splice(basicIdx, 1)[0];
                    addToLog(`Bot played ${currentBot.active.name}.`);
                } else {
                    addToLog("Bot blacked out! Player wins!");
                    setWinner('player');
                    setGameState('gameOver');
                    return;
                }
            }
            setBot({...currentBot});
            await new Promise(r => setTimeout(r, 1000));
        }

        let newHand = [];
        for (let card of currentBot.hand) {
          if (!card.isEnergy && currentBot.bench.length < 5) {
             currentBot.bench.push(card);
             addToLog(`Bot played ${card.name} to bench.`);
          } else {
             newHand.push(card);
          }
        }
        currentBot.hand = newHand;
        setBot({...currentBot});
        await new Promise(r => setTimeout(r, 1000));

        // Bot AI: Smart Energy Attachment
        let energyIndex = currentBot.hand.findIndex(c => c.isEnergy);
        if (energyIndex >= 0) {
           const botEnergyCard = currentBot.hand[energyIndex];
           if (currentBot.active && currentBot.active.attachedEnergy < 2 && currentBot.active.element === botEnergyCard.element) {
               currentBot.active.attachedEnergy += 1;
               currentBot.hand.splice(energyIndex, 1);
               addToLog(`Bot attached Energy to ${currentBot.active.name}.`);
           } else {
               const validBenchTargetIndex = currentBot.bench.findIndex(c => c.element === botEnergyCard.element);
               if (validBenchTargetIndex >= 0) {
                   currentBot.bench[validBenchTargetIndex].attachedEnergy += 1;
                   currentBot.hand.splice(energyIndex, 1);
                   addToLog(`Bot attached Energy to benched ${currentBot.bench[validBenchTargetIndex].name}.`);
               }
           }
           setBot({...currentBot});
           await new Promise(r => setTimeout(r, 1000));
        }

        if (currentBot.active && currentPlayer.active && currentBot.active.attachedEnergy > 0) {
           addToLog(`Bot's ${currentBot.active.name} used ${currentBot.active.attack}!`);
           currentPlayer.active.currentHp -= currentBot.active.dmg;
           
           if (currentPlayer.active.currentHp <= 0) {
              const prizesToTake = currentPlayer.active.rarity === 'GX' ? 2 : 1;
              addToLog(`Player's ${currentPlayer.active.name} fainted! Bot took ${prizesToTake} Prize Card(s).`);
              currentBot.prizes -= prizesToTake;
              currentPlayer.active = null;
              
              if (currentBot.prizes <= 0) {
                 setBot({...currentBot});
                 setPlayer({...currentPlayer});
                 setWinner('bot');
                 setGameState('gameOver');
                 return;
              }
           }
           setBot({...currentBot});
           setPlayer({...currentPlayer});
        } else {
           addToLog("Bot ends turn.");
        }

        await new Promise(r => setTimeout(r, 1000));
        setGameState(prev => {
           if (prev !== 'gameOver') {
             setPlayer(p => ({ ...p, energyAttachedThisTurn: false, hasDrawnThisTurn: false }));
             addToLog("It's your turn! Please DRAW a card.");
             return 'playerTurn';
           }
           return prev;
        });
      };
      executeBotTurn();
    }
  }, [gameState]);

  const handleDraw = () => {
    if (gameState !== 'playerTurn' || player.hasDrawnThisTurn) return;

    setPlayer(p => {
      if (p.deck.length === 0) {
        addToLog("You are out of cards! You lose!");
        setWinner('bot');
        setGameState('gameOver');
        return p;
      }
      const newDeck = [...p.deck];
      const drawnCard = newDeck.pop();
      addToLog(`You drew a card.`);
      return {
        ...p,
        deck: newDeck,
        hand: [...p.hand, drawnCard],
        hasDrawnThisTurn: true
      };
    });
  };

  const handleHandCardClick = (card, index) => {
    if (gameState !== 'setup' && gameState !== 'playerTurn') return;
    
    if (selectedHandCard?.index === index) {
      setSelectedHandCard(null); 
      return;
    }
    setSelectedHandCard({ card, index });
  };

  const handlePlayAreaClick = (area, benchIndex = null) => {
    if (!selectedHandCard || (gameState !== 'setup' && gameState !== 'playerTurn')) return;
    const { card, index } = selectedHandCard;

    if (area === 'active' && !player.active && !card.isEnergy) {
       setPlayer(p => {
         let newHand = [...p.hand];
         newHand.splice(index, 1);
         return { ...p, hand: newHand, active: card };
       });
       addToLog(`Played ${card.name} to Active.`);
       setSelectedHandCard(null);
       if (gameState === 'setup' && bot.active) setGameState('playerTurn'); 
    } 
    else if (area === 'bench' && player.bench.length < 5 && !card.isEnergy) {
       setPlayer(p => {
         let newHand = [...p.hand];
         newHand.splice(index, 1);
         return { ...p, hand: newHand, bench: [...p.bench, card] };
       });
       addToLog(`Played ${card.name} to Bench.`);
       setSelectedHandCard(null);
    }
    else if (area === 'active' && card.isEnergy && player.active && !player.energyAttachedThisTurn && gameState === 'playerTurn') {
       if (card.element !== player.active.element) {
           showToast(`Cannot attach ${card.element} Energy to a ${player.active.element} character!`, 'error');
           return;
       }
       setPlayer(p => {
         let newHand = [...p.hand];
         newHand.splice(index, 1);
         return { ...p, hand: newHand, active: { ...p.active, attachedEnergy: p.active.attachedEnergy + 1 }, energyAttachedThisTurn: true };
       });
       addToLog(`Attached Energy to ${player.active.name}.`);
       setSelectedHandCard(null);
    }
    else if (area === 'benchCard' && card.isEnergy && benchIndex !== null && !player.energyAttachedThisTurn && gameState === 'playerTurn') {
       if (card.element !== player.bench[benchIndex].element) {
           showToast(`Cannot attach ${card.element} Energy to a ${player.bench[benchIndex].element} character!`, 'error');
           return;
       }
       setPlayer(p => {
         let newHand = [...p.hand];
         newHand.splice(index, 1);
         let newBench = [...p.bench];
         newBench[benchIndex] = { ...newBench[benchIndex], attachedEnergy: newBench[benchIndex].attachedEnergy + 1 };
         return { ...p, hand: newHand, bench: newBench, energyAttachedThisTurn: true };
       });
       addToLog(`Attached Energy to benched ${player.bench[benchIndex].name}.`);
       setSelectedHandCard(null);
    }
  };

  const handleBenchPromote = (benchIndex) => {
    if (gameState !== 'setup' && gameState !== 'playerTurn') return;
    if (!player.active) {
       setPlayer(p => {
         let newBench = [...p.bench];
         const promoted = newBench.splice(benchIndex, 1)[0];
         return { ...p, bench: newBench, active: promoted };
       });
       addToLog(`Promoted from Bench to Active.`);
    }
  };

  const handleAttack = () => {
    if (gameState !== 'playerTurn' || !bot.active) return;
    if (!player.active) {
       showToast("You must promote an Active character!", 'error');
       return;
    }
    if (!player.hasDrawnThisTurn) {
       showToast("You must DRAW a card first! Click your deck.", 'error');
       return;
    }
    if (player.active.attachedEnergy < 1) {
       showToast("Requires at least 1 Energy attached to attack!", 'error');
       return;
    }

    addToLog(`Player's ${player.active.name} used ${player.active.attack}!`);
    
    let currentBot = { ...bot, active: { ...bot.active } };
    currentBot.active.currentHp -= player.active.dmg;

    if (currentBot.active.currentHp <= 0) {
       const prizesToTake = currentBot.active.rarity === 'GX' ? 2 : 1;
       addToLog(`Bot's ${currentBot.active.name} fainted! You took ${prizesToTake} Prize Card(s).`);
       currentBot.active = null;
       setPlayer(p => ({ ...p, prizes: p.prizes - prizesToTake }));
       
       if (player.prizes - prizesToTake <= 0) {
          setBot(currentBot);
          setWinner('player');
          setGameState('gameOver');
          return;
       }
    }
    setBot(currentBot);
    
    setGameState('botTurn');
  };

  const passTurn = () => {
    if (gameState === 'playerTurn') {
       if (!player.active) {
           showToast("You must promote an Active character!", 'error');
           return;
       }
       if (!player.hasDrawnThisTurn) {
          showToast("You must DRAW a card before ending your turn! Click your deck.", 'error');
          return;
       }
       addToLog("Player passed turn.");
       setGameState('botTurn');
    }
  };

  if (!player || !bot) {
    return <div className="flex-1 flex flex-col items-center justify-center">
       <Sparkles className="w-16 h-16 text-amber-500 animate-spin" />
       <p className="text-slate-400 mt-4 font-bold tracking-widest">SHUFFLING DECKS...</p>
    </div>;
  }

  if (gameState === 'gameOver') {
    const rewards = { easy: 250, medium: 500, hard: 1000, extreme: 2500 };
    const winAmount = rewards[difficulty];
    const loseAmount = Math.floor(rewards[difficulty] * 0.1);

    return (
      <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
         <h2 className={`text-6xl sm:text-8xl font-black mb-8 tracking-[0.3em] drop-shadow-2xl ${winner === 'player' ? 'text-amber-400' : 'text-slate-500'}`}>
           {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
         </h2>
         <p className="text-xl sm:text-2xl text-slate-300 mb-12">
           {winner === 'player' ? `You crushed the ${difficulty} AI! +${winAmount} Coins` : `The AI bested you. +${loseAmount} Coins`}
         </p>
         <button onClick={() => { winner === 'player' ? onWin(winAmount) : onLose(loseAmount); onExit(); }} className="px-12 py-4 bg-amber-600 text-white font-black tracking-widest rounded-full hover:bg-amber-500 hover:scale-105 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.4)] border border-amber-400">
            COLLECT REWARD
         </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border border-slate-700 rounded-[2rem] overflow-y-auto shadow-2xl max-h-[85vh] custom-scrollbar backdrop-blur-xl relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
      
      {/* BOT SIDE */}
      <div className="flex-1 min-h-[280px] shrink-0 bg-slate-950/80 border-b border-slate-800 p-4 flex flex-col relative z-10">
         <div className="absolute top-4 left-4 flex gap-4">
            <div className="w-10 sm:w-12 aspect-[2.5/3.6] bg-gradient-to-br from-slate-800 to-black border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center shadow-md">
               <Layers className="w-4 h-4 text-slate-500 opacity-50" />
               <span className="text-slate-400 font-black text-[0.6rem] mt-1">{bot.deck.length}</span>
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-slate-500 font-bold text-[0.6rem] uppercase tracking-widest">Prizes</span>
               <div className="flex gap-1.5">
                  {[...Array(Math.max(0, bot.prizes))].map((_, i) => <div key={i} className="w-6 h-10 bg-amber-600/80 border border-amber-400 rounded shadow-md backface-hidden" style={{ transform: 'rotateY(180deg)' }}></div>)}
               </div>
            </div>
         </div>

         <div className="absolute top-4 right-4 flex gap-1.5">
            <span className="text-slate-500 font-bold text-xs uppercase mr-2 mt-1 tracking-widest">Bot Hand ({bot.hand.length})</span>
            {[...Array(Math.min(bot.hand.length, 5))].map((_, i) => <div key={i} className="w-6 h-10 bg-slate-800 rounded border border-slate-700 shadow-sm"></div>)}
         </div>

         <div className="flex-1 flex flex-col items-center justify-center mt-6">
            <div className="flex gap-3 mb-6 h-24">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-16 h-24 border border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/50 shadow-inner">
                    {bot.bench[i] && <TCGCard card={bot.bench[i]} size="mini" inBattle={true} />}
                 </div>
               ))}
            </div>
            <div className="w-28 h-40 border border-amber-900/50 rounded-2xl flex items-center justify-center bg-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative">
               <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-3xl blur-sm -z-10"></div>
               {bot.active ? <TCGCard card={bot.active} size="small" inBattle={true} /> : <span className="text-slate-600 text-xs font-bold tracking-widest">NO ACTIVE</span>}
            </div>
         </div>
      </div>

      {/* MIDFIELD */}
      <div className="h-16 shrink-0 bg-slate-800/90 backdrop-blur-md flex justify-between items-center px-6 border-y border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20">
         <div className="flex items-center space-x-3 text-sm">
           <span className={`px-4 py-1.5 rounded-full font-black tracking-widest text-xs transition-colors ${gameState === 'playerTurn' ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-slate-700 text-slate-400'}`}>YOUR TURN</span>
           <span className={`px-4 py-1.5 rounded-full font-black tracking-widest text-xs transition-colors ${gameState === 'botTurn' ? 'bg-rose-500 text-slate-950 shadow-[0_0_15px_rgba(243,118,150,0.6)]' : 'bg-slate-700 text-slate-400'}`}>BOT TURN</span>
         </div>
         
         <div className="text-slate-300 font-mono text-xs sm:text-sm w-1/3 truncate text-center bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700">
            &gt; {log[log.length - 1]}
         </div>

         <div className="flex space-x-3">
           <button onClick={handleDraw} disabled={gameState !== 'playerTurn' || player.hasDrawnThisTurn} className="px-5 py-2 bg-blue-600/90 disabled:bg-slate-700 text-white font-black tracking-widest rounded-xl shadow-lg hover:bg-blue-500 transition-all flex items-center gap-2 text-xs sm:text-sm border border-blue-400/50 disabled:border-transparent">
              <Layers className="w-4 h-4" /> DRAW
           </button>
           <button onClick={handleAttack} disabled={gameState !== 'playerTurn' || !player.active || player.active.attachedEnergy < 1 || !player.hasDrawnThisTurn} className="px-5 py-2 bg-rose-600/90 disabled:bg-slate-700 text-white font-black tracking-widest rounded-xl shadow-lg hover:bg-rose-500 transition-all flex items-center gap-2 text-xs sm:text-sm border border-rose-400/50 disabled:border-transparent">
              <Swords className="w-4 h-4" /> ATTACK
           </button>
           <button onClick={passTurn} disabled={gameState !== 'playerTurn' || !player.hasDrawnThisTurn} className="px-5 py-2 bg-slate-700 disabled:bg-slate-800 text-slate-200 font-bold tracking-widest rounded-xl hover:bg-slate-600 transition-all text-xs sm:text-sm border border-slate-500 disabled:border-transparent">
              PASS
           </button>
         </div>
      </div>

      {/* PLAYER SIDE */}
      <div className="flex-[1.5] min-h-[420px] shrink-0 bg-slate-900 p-4 flex flex-col justify-between relative z-10">
         <div className="absolute bottom-6 left-6 flex flex-col items-center">
            <div 
               className={`w-16 sm:w-20 aspect-[2.5/3.6] bg-gradient-to-br from-amber-900 to-black border-2 sm:border-4 border-amber-600/80 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:-translate-y-2 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${gameState === 'playerTurn' && !player.hasDrawnThisTurn ? 'ring-4 ring-blue-500 animate-pulse' : ''}`}
               onClick={handleDraw}
            >
               <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 opacity-80" />
               <span className="text-slate-200 font-black text-xs sm:text-sm mt-1 drop-shadow-md">{player.deck.length}</span>
            </div>
            <span className="text-slate-400 text-[0.6rem] sm:text-xs font-bold mt-2 tracking-widest uppercase">Deck</span>
         </div>

         <div className="absolute bottom-6 right-6 flex flex-col items-end">
            <span className="text-amber-500 font-bold text-xs uppercase mb-2 tracking-widest">Prizes</span>
            <div className="flex gap-1.5">
               {[...Array(Math.max(0, player.prizes))].map((_, i) => <div key={i} className="w-8 h-12 bg-amber-600 border border-amber-400 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>)}
            </div>
         </div>
         
         <div className="flex-1 flex flex-col items-center justify-start mt-4">
            <div 
               className={`w-28 h-40 border rounded-2xl flex items-center justify-center shadow-2xl mb-6 transition-all duration-300 cursor-pointer ${!player.active && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-amber-400 bg-amber-900/20 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : player.active && selectedHandCard?.card.isEnergy && !player.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-950/80'}`}
               onClick={() => handlePlayAreaClick('active')}
            >
               {player.active ? <TCGCard card={player.active} size="small" inBattle={true} /> : <span className="text-slate-500 text-xs font-bold text-center p-2 uppercase tracking-widest">Play Active</span>}
            </div>
            
            <div className="flex gap-3 h-24">
               {[...Array(5)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-16 h-24 border rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                     !player.bench[i] && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-amber-400/50 bg-amber-900/10' : 
                     player.bench[i] && selectedHandCard?.card.isEnergy && !player.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20' :
                     'border-slate-800 bg-slate-900/50'
                   }`}
                   onClick={() => {
                      if (player.bench[i] && selectedHandCard?.card.isEnergy) {
                         handlePlayAreaClick('benchCard', i);
                      } else if (player.bench[i]) {
                         handleBenchPromote(i);
                      } else {
                         handlePlayAreaClick('bench');
                      }
                   }}
                 >
                    {player.bench[i] ? <TCGCard card={player.bench[i]} size="mini" inBattle={true} /> : null}
                 </div>
               ))}
            </div>
         </div>

         <div className="h-36 shrink-0 flex justify-center items-end pb-4 mt-6">
            {player.hand.map((card, idx) => (
               <div key={card.instanceId} className="w-24 sm:w-28 transition-all duration-300 hover:-translate-y-6 hover:rotate-2" style={{ marginLeft: idx === 0 ? 0 : '-2rem', zIndex: idx }}>
                 <TCGCard 
                   card={card} 
                   size="small" 
                   isFlipped={true} 
                   isSelected={selectedHandCard?.index === idx}
                   onClick={() => handleHandCardClick(card, idx)} 
                 />
               </div>
            ))}
            {player.hand.length === 0 && <span className="text-slate-600 italic tracking-widest font-bold">Hand is empty</span>}
         </div>
      </div>
    </div>
  );
};


// --- ONLINE LOBBY COMPONENT ---
const OnlineLobby = ({ user, db, onStartMatch, setDbError, showToast }) => {
   const [lobbyUsers, setLobbyUsers] = useState([]);
   const [myStatus, setMyStatus] = useState(null);

   useEffect(() => {
      if (!user || !db) return;

      const myRef = doc(getLobbyCol(db), user.uid);
      const joinLobby = async () => {
         try {
             await setDoc(myRef, {
                 uid: user.uid,
                 name: user.displayName || `Player_${user.uid.substring(0,4)}`,
                 status: 'idle',
                 challengerId: null,
                 matchId: null,
                 lastSeen: Date.now()
             });
         } catch(e) {
             console.error("Failed to join lobby", e);
             setDbError(true);
         }
      };
      joinLobby();

      const interval = setInterval(() => {
          updateDoc(myRef, { lastSeen: Date.now() }).catch(() => {});
      }, 15000);

      const unsub = onSnapshot(getLobbyCol(db), (snap) => {
          const now = Date.now();
          const activeUsers = [];
          snap.forEach(d => {
              const data = d.data();
              if (now - data.lastSeen < 45000) {
                  activeUsers.push(data);
              }
              if (data.uid === user.uid) {
                  setMyStatus(data);
              }
          });
          setLobbyUsers(activeUsers.filter(u => u.uid !== user.uid));
      }, (err) => {
         console.error(err);
         if (err.message?.toLowerCase().includes('permission') || err.code === 'permission-denied') {
             setDbError(true);
         }
      });

      return () => {
          clearInterval(interval);
          unsub();
          deleteDoc(myRef).catch(() => {});
      };
   }, [user, db, setDbError]);

   useEffect(() => {
      if (myStatus && myStatus.matchId) {
          onStartMatch(myStatus.matchId);
      }
   }, [myStatus, onStartMatch]);

   const challengePlayer = async (targetId) => {
      try {
          const targetRef = doc(getLobbyCol(db), targetId);
          await updateDoc(targetRef, {
              challengerId: user.uid,
              status: 'challenged'
          });
          await updateDoc(doc(getLobbyCol(db), user.uid), {
              status: 'waiting_for_accept'
          });
      } catch(e) { 
          console.error(e); 
          if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') {
             setDbError(true);
          } else {
             showToast("Failed to send challenge", 'error'); 
          }
      }
   };

   const acceptChallenge = async () => {
      try {
          const matchesCol = getMatchesCol(db);
          const newMatchRef = doc(matchesCol);
          await setDoc(newMatchRef, {
              hostId: user.uid, 
              guestId: myStatus.challengerId,
              status: 'waiting_for_guest_deck', 
              turn: user.uid, 
              players: {}, 
              log: ["Match started! Waiting for players..."],
              winner: null
          });

          const matchId = newMatchRef.id;

          await updateDoc(doc(getLobbyCol(db), myStatus.challengerId), {
              matchId: matchId,
              status: 'playing'
          });

          await updateDoc(doc(getLobbyCol(db), user.uid), {
              matchId: matchId,
              status: 'playing',
              challengerId: null
          });
      } catch(e) { 
          console.error(e); 
          if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') {
             setDbError(true);
          } else {
             showToast("Failed to accept challenge", 'error'); 
          }
      }
   };

   const declineChallenge = async () => {
      try {
          await updateDoc(doc(getLobbyCol(db), user.uid), {
              challengerId: null,
              status: 'idle'
          });
          await updateDoc(doc(getLobbyCol(db), myStatus.challengerId), {
              status: 'idle'
          });
      } catch(e) { 
          console.error(e); 
          if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') setDbError(true);
      }
   };

   const cancelMyChallenge = async () => {
       try {
           await updateDoc(doc(getLobbyCol(db), user.uid), {
              status: 'idle'
           });
       } catch(e) { 
           console.error(e); 
           if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') setDbError(true);
       }
   };

   if (!myStatus) {
       return <div className="flex-1 flex items-center justify-center"><Sparkles className="animate-spin text-fuchsia-500 w-12 h-12" /></div>;
   }

   return (
       <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">
           <div className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-2xl border border-fuchsia-900/50 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
               <div className="bg-gradient-to-r from-fuchsia-900/30 to-purple-900/30 border-b border-fuchsia-900/50 p-6 sm:p-8 flex items-center gap-6">
                  <div className="p-4 bg-fuchsia-500/20 rounded-2xl border border-fuchsia-500/30">
                     <Users className="w-8 h-8 sm:w-10 sm:h-10 text-fuchsia-400" />
                  </div>
                  <div>
                      <h2 className="text-2xl sm:text-4xl font-black tracking-widest text-white drop-shadow-md">ONLINE LOBBY</h2>
                      <p className="text-fuchsia-400 font-bold text-sm sm:text-base tracking-wide">Find an opponent and battle for 1,000 Coins!</p>
                  </div>
               </div>

               <div className="p-6 sm:p-8 flex-1 overflow-y-auto min-h-[400px] relative custom-scrollbar">
                   
                   {myStatus.challengerId && myStatus.status === 'challenged' && (
                       <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                           <div className="bg-slate-900 border border-fuchsia-500/50 rounded-3xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(217,70,239,0.2)] animate-in zoom-in-95">
                               <div className="w-20 h-20 bg-fuchsia-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                  <Zap className="w-10 h-10 text-fuchsia-400 animate-bounce" />
                               </div>
                               <h3 className="text-2xl font-black text-white mb-2 tracking-widest">NEW CHALLENGER!</h3>
                               <p className="text-slate-400 mb-8 font-medium">Someone wants to battle you.</p>
                               <div className="flex gap-4 justify-center">
                                   <button onClick={declineChallenge} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"><X className="w-5 h-5"/> DECLINE</button>
                                   <button onClick={acceptChallenge} className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black tracking-widest rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"><Check className="w-5 h-5"/> ACCEPT</button>
                               </div>
                           </div>
                       </div>
                   )}

                   {myStatus.status === 'waiting_for_accept' && (
                       <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                           <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center shadow-xl animate-in zoom-in-95">
                               <Sparkles className="w-12 h-12 text-fuchsia-500 mx-auto mb-6 animate-spin" />
                               <h3 className="text-xl font-black text-white mb-8 tracking-widest">WAITING FOR OPPONENT...</h3>
                               <button onClick={cancelMyChallenge} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">CANCEL</button>
                           </div>
                       </div>
                   )}

                   <div className="space-y-4">
                       {lobbyUsers.length === 0 ? (
                           <div className="text-center py-24 opacity-50 flex flex-col items-center">
                               <Ghost className="w-16 h-16 mb-4 text-slate-500" />
                               <p className="font-bold tracking-widest text-slate-400">NO OTHER PLAYERS ONLINE</p>
                           </div>
                       ) : (
                           lobbyUsers.map(u => (
                               <div key={u.uid} className="flex items-center justify-between bg-slate-950/50 border border-slate-800 p-4 sm:p-6 rounded-2xl hover:border-fuchsia-500/40 hover:bg-slate-900 transition-all group">
                                   <div className="flex items-center gap-5">
                                       <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 flex items-center justify-center font-black text-xl shadow-inner border border-white/10 group-hover:scale-110 transition-transform">
                                           {u.name.charAt(0).toUpperCase()}
                                       </div>
                                       <div>
                                           <h4 className="font-bold text-white text-lg tracking-wide">{u.name}</h4>
                                           <div className="flex items-center gap-2 mt-1">
                                             <div className={`w-2 h-2 rounded-full ${u.status === 'idle' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`}></div>
                                             <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                                                 {u.status === 'idle' ? 'READY TO BATTLE' : 'IN MENU'}
                                             </span>
                                           </div>
                                       </div>
                                   </div>
                                   <button 
                                      onClick={() => challengePlayer(u.uid)}
                                      disabled={u.status !== 'idle'}
                                      className="px-6 py-3 bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/30 rounded-xl font-black tracking-widest hover:bg-fuchsia-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]"
                                   >
                                       CHALLENGE
                                   </button>
                               </div>
                           ))
                       )}
                   </div>
               </div>
           </div>
       </div>
   );
};

// --- ONLINE BATTLE ARENA COMPONENT ---
const OnlineBattleArena = ({ playerDeckIds, onWin, onLose, onExit, user, db, existingMatchId, showToast, setDbError }) => {
  const [matchData, setMatchData] = useState(null);
  const [selectedHandCard, setSelectedHandCard] = useState(null);

  const createBattleDeck = (idArray) => {
    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);
    return shuffle(idArray).map(id => {
      const base = getBaseCard(id);
      return { ...base, instanceId: Math.random().toString(36).substr(2, 9), currentHp: base.hp, attachedEnergy: 0 };
    });
  };

  const initializePlayerState = (deckIds) => {
    let pDeck, pHand;
    let playerHasBasic = false;
    let attempts = 0;
    while (!playerHasBasic && attempts < 15) {
       pDeck = createBattleDeck(deckIds);
       pHand = pDeck.slice(0, 7);
       pDeck = pDeck.slice(7);
       if (pHand.some(c => !c.isEnergy)) playerHasBasic = true;
       attempts++;
    }
    return { deck: pDeck, hand: pHand, bench: [], active: null, prizes: 3, energyAttachedThisTurn: false, hasDrawnThisTurn: false };
  };

  useEffect(() => {
    if (!existingMatchId) return;

    const joinIfGuest = async () => {
       const matchRef = doc(getMatchesCol(db), existingMatchId);
       try {
           const snap = await getDoc(matchRef);
           if (snap.exists()) {
               const data = snap.data();
               if (data.guestId === user.uid && (!data.players || !data.players[user.uid])) {
                   await updateDoc(matchRef, {
                       [`players.${user.uid}`]: initializePlayerState(playerDeckIds),
                       status: 'playing'
                   });
               } else if (data.hostId === user.uid && (!data.players || !data.players[user.uid])) {
                   await updateDoc(matchRef, {
                       [`players.${user.uid}`]: initializePlayerState(playerDeckIds)
                   });
               }
           }
       } catch (e) {
           console.error(e);
           if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') setDbError(true);
       }
    };
    joinIfGuest();

    const unsub = onSnapshot(doc(getMatchesCol(db), existingMatchId), (snap) => {
        if (snap.exists()) {
            setMatchData(snap.data());
        } else {
            showToast("Match ended abruptly.", 'error');
            onExit();
        }
    }, (err) => {
        console.error("Arena Snapshot Error", err);
        if (err.message?.toLowerCase().includes('permission') || err.code === 'permission-denied') setDbError(true);
    });
    return () => unsub();
  }, [existingMatchId, db, user, playerDeckIds, onExit, showToast, setDbError]);

  const updateMatch = async (updates) => {
     try {
         await updateDoc(doc(getMatchesCol(db), existingMatchId), updates);
     } catch (e) { 
         console.error("Sync failed", e); 
         if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') setDbError(true);
     }
  };

  if (!matchData || !matchData.players || !matchData.players[user.uid]) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
           <Sparkles className="w-16 h-16 text-fuchsia-500 animate-spin" />
           <h2 className="text-3xl font-black tracking-widest text-white animate-pulse">CONNECTING TO ARENA...</h2>
        </div>
     );
  }

  const me = matchData.players[user.uid];
  const opponentId = matchData.hostId === user.uid ? matchData.guestId : matchData.hostId;
  const opponent = opponentId ? matchData.players[opponentId] : null;
  
  if (!opponent) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
           <Zap className="w-16 h-16 text-fuchsia-500 animate-bounce" />
           <h2 className="text-2xl font-black tracking-widest text-white">WAITING FOR OPPONENT'S DECK...</h2>
        </div>
      );
  }

  const isMyTurn = matchData.turn === user.uid && matchData.status === 'playing';

  // FORCE PLAYER TO PROMOTE ONLINE
  useEffect(() => {
    if (isMyTurn && !me.active) {
        const hasBasicInHand = me.hand.some(c => !c.isEnergy);
        if (me.bench.filter(Boolean).length === 0 && !hasBasicInHand) {
            updateMatch({ winner: opponentId, status: 'gameover', log: [...matchData.log, "Player blacked out!"].slice(-10) });
        }
    }
  }, [isMyTurn, me?.active, me?.bench, me?.hand, opponentId, matchData?.log]);

  const handleDraw = async () => {
    if (!isMyTurn || me.hasDrawnThisTurn) return;
    if (me.deck.length === 0) {
        await updateMatch({ winner: opponentId, status: 'gameover', log: [...matchData.log, "Player ran out of cards!"].slice(-10) });
        return;
    }
    const newDeck = [...me.deck];
    const drawnCard = newDeck.pop();
    await updateMatch({
        [`players.${user.uid}.deck`]: newDeck,
        [`players.${user.uid}.hand`]: [...me.hand, drawnCard],
        [`players.${user.uid}.hasDrawnThisTurn`]: true,
        log: [...matchData.log, "Opponent drew a card."].slice(-10)
    });
  };

  const handlePlayAreaClick = async (area, benchIndex = null) => {
    if (!selectedHandCard || !isMyTurn) return;
    const { card, index } = selectedHandCard;

    if (area === 'active' && !me.active && !card.isEnergy) {
       const newHand = [...me.hand];
       newHand.splice(index, 1);
       await updateMatch({
           [`players.${user.uid}.hand`]: newHand,
           [`players.${user.uid}.active`]: card,
           log: [...matchData.log, `Opponent played ${card.name} to Active.`].slice(-10)
       });
       setSelectedHandCard(null);
    } 
    else if (area === 'bench' && me.bench.length < 5 && !card.isEnergy) {
       const newHand = [...me.hand];
       newHand.splice(index, 1);
       await updateMatch({
           [`players.${user.uid}.hand`]: newHand,
           [`players.${user.uid}.bench`]: [...me.bench, card],
           log: [...matchData.log, `Opponent played ${card.name} to Bench.`].slice(-10)
       });
       setSelectedHandCard(null);
    }
    else if (area === 'active' && card.isEnergy && me.active && !me.energyAttachedThisTurn && isMyTurn) {
       if (card.element !== me.active.element) {
           showToast(`Cannot attach ${card.element} Energy to a ${me.active.element} character!`, 'error');
           return;
       }
       const newHand = [...me.hand];
       newHand.splice(index, 1);
       await updateMatch({
           [`players.${user.uid}.hand`]: newHand,
           [`players.${user.uid}.active.attachedEnergy`]: me.active.attachedEnergy + 1,
           [`players.${user.uid}.energyAttachedThisTurn`]: true,
           log: [...matchData.log, `Opponent attached Energy.`].slice(-10)
       });
       setSelectedHandCard(null);
    }
    else if (area === 'benchCard' && card.isEnergy && benchIndex !== null && !me.energyAttachedThisTurn && isMyTurn) {
       if (card.element !== me.bench[benchIndex].element) {
           showToast(`Cannot attach ${card.element} Energy to a ${me.bench[benchIndex].element} character!`, 'error');
           return;
       }
       const newHand = [...me.hand];
       newHand.splice(index, 1);
       const newBench = [...me.bench];
       newBench[benchIndex].attachedEnergy += 1;
       await updateMatch({
           [`players.${user.uid}.hand`]: newHand,
           [`players.${user.uid}.bench`]: newBench,
           [`players.${user.uid}.energyAttachedThisTurn`]: true,
           log: [...matchData.log, `Opponent attached Energy to bench.`].slice(-10)
       });
       setSelectedHandCard(null);
    }
  };

  const handleBenchPromote = async (benchIndex) => {
    if (!isMyTurn || me.active) return;
    const newBench = [...me.bench];
    const promoted = newBench.splice(benchIndex, 1)[0];
    await updateMatch({
        [`players.${user.uid}.bench`]: newBench,
        [`players.${user.uid}.active`]: promoted,
        log: [...matchData.log, `Opponent promoted ${promoted.name} to Active.`].slice(-10)
    });
  };

  const handleAttack = async () => {
    if (!isMyTurn || !opponent?.active) return;
    if (!me.active) { showToast("You must promote an Active character!", 'error'); return; }
    if (!me.hasDrawnThisTurn) { showToast("You must DRAW first!", 'error'); return; }
    if (me.active.attachedEnergy < 1) { showToast("Need Energy!", 'error'); return; }

    const newOppHp = opponent.active.currentHp - me.active.dmg;
    let logMsg = `Opponent's ${me.active.name} attacked for ${me.active.dmg}!`;
    let updates = {
       [`players.${opponentId}.active.currentHp`]: newOppHp,
       turn: opponentId,
       [`players.${user.uid}.energyAttachedThisTurn`]: false,
       [`players.${user.uid}.hasDrawnThisTurn`]: false
    };

    if (newOppHp <= 0) {
       const prizesToTake = opponent.active.rarity === 'GX' ? 2 : 1;
       const newPrizes = me.prizes - prizesToTake;
       logMsg += ` ${opponent.active.name} fainted!`;
       updates[`players.${opponentId}.active`] = null;
       updates[`players.${user.uid}.prizes`] = newPrizes;
       
       if (newPrizes <= 0) {
          updates.winner = user.uid;
          updates.status = 'gameover';
       }
    }
    updates.log = [...matchData.log, logMsg].slice(-10);
    await updateMatch(updates);
  };

  const passTurn = async () => {
    if (!isMyTurn) return;
    if (!me.active) { showToast("You must promote an Active character!", 'error'); return; }
    if (!me.hasDrawnThisTurn) { showToast("Draw a card first!", 'error'); return; }
    await updateMatch({
        turn: opponentId,
        [`players.${user.uid}.energyAttachedThisTurn`]: false,
        [`players.${user.uid}.hasDrawnThisTurn`]: false,
        log: [...matchData.log, "Opponent passed their turn."].slice(-10)
    });
  };

  const leaveMatch = async () => {
     if (matchData.status === 'playing') {
         await updateMatch({ winner: opponentId, status: 'gameover' });
     } else {
         deleteDoc(doc(getMatchesCol(db), existingMatchId)).catch(()=>{});
     }
     updateDoc(doc(getLobbyCol(db), user.uid), { matchId: null, status: 'idle' }).catch(()=>{});
     onExit();
  };

  if (matchData.status === 'gameover') {
    const isWinner = matchData.winner === user.uid;
    return (
      <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
         <h2 className={`text-6xl sm:text-8xl font-black mb-8 tracking-[0.3em] drop-shadow-2xl ${isWinner ? 'text-fuchsia-400' : 'text-slate-500'}`}>
           {isWinner ? 'ONLINE VICTORY' : 'DEFEAT'}
         </h2>
         <p className="text-xl sm:text-2xl text-slate-300 mb-12 font-medium tracking-wide">
           {isWinner ? 'You proved your dominance! +1000 Coins' : 'You were outmatched. +100 Coins'}
         </p>
         <button onClick={() => { isWinner ? onWin() : onLose(); leaveMatch(); }} className="px-12 py-4 bg-fuchsia-600 text-white font-black tracking-widest rounded-full hover:bg-fuchsia-500 transition-all hover:scale-105 shadow-[0_10px_30px_rgba(192,38,211,0.4)]">
            COLLECT REWARD
         </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border border-slate-700 rounded-[2rem] overflow-y-auto shadow-2xl max-h-[85vh] custom-scrollbar backdrop-blur-xl relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
      
      <button onClick={leaveMatch} className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2 bg-rose-600/90 backdrop-blur-md border border-rose-500/50 text-white text-xs font-black tracking-widest rounded-full hover:bg-rose-500 shadow-[0_5px_15px_rgba(225,29,72,0.4)] transition-all">FORFEIT</button>

      {/* OPPONENT SIDE */}
      <div className="flex-1 min-h-[280px] shrink-0 bg-slate-950/80 border-b border-slate-800 p-4 flex flex-col relative z-10">
         <div className="absolute top-4 left-4 flex gap-4">
            <div className="w-10 sm:w-12 aspect-[2.5/3.6] bg-gradient-to-br from-fuchsia-900/40 to-black border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center shadow-md">
               <Layers className="w-4 h-4 text-fuchsia-500/50" />
               <span className="text-slate-400 font-black text-[0.6rem] mt-1">{opponent?.deck?.length || 0}</span>
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-slate-500 font-bold text-[0.6rem] uppercase tracking-widest">Prizes</span>
               <div className="flex gap-1.5">
                  {[...Array(Math.max(0, opponent?.prizes || 0))].map((_, i) => <div key={i} className="w-6 h-10 bg-fuchsia-600/80 border border-fuchsia-500 rounded shadow-md backface-hidden"></div>)}
               </div>
            </div>
         </div>
         <div className="absolute top-4 right-4 flex gap-1.5">
            <span className="text-slate-500 font-bold text-xs uppercase mr-2 mt-1 tracking-widest">Opp Hand</span>
            {[...Array(Math.min(opponent?.hand?.length || 0, 5))].map((_, i) => <div key={i} className="w-6 h-10 bg-slate-800 rounded border border-slate-700 shadow-sm"></div>)}
         </div>

         <div className="flex-1 flex flex-col items-center justify-center mt-8">
            <div className="flex gap-3 mb-6 h-24">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-16 h-24 border border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/50 shadow-inner">
                    {opponent?.bench?.[i] && <TCGCard card={opponent.bench[i]} size="mini" inBattle={true} />}
                 </div>
               ))}
            </div>
            <div className="w-28 h-40 border border-fuchsia-900/50 rounded-2xl flex items-center justify-center bg-slate-950 shadow-[0_0_30px_rgba(192,38,211,0.15)] relative">
               <div className="absolute -inset-1 bg-gradient-to-tr from-fuchsia-500/20 to-transparent rounded-3xl blur-sm -z-10"></div>
               {opponent?.active ? <TCGCard card={opponent.active} size="small" inBattle={true} /> : <span className="text-slate-600 text-xs font-bold tracking-widest">WAITING</span>}
            </div>
         </div>
      </div>

      {/* MIDFIELD */}
      <div className="h-16 shrink-0 bg-slate-800/90 backdrop-blur-md flex justify-between items-center px-6 border-y border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20">
         <div className="flex items-center space-x-3 text-sm">
           <span className={`px-4 py-1.5 rounded-full font-black tracking-widest text-xs transition-colors ${isMyTurn ? 'bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.6)]' : 'bg-slate-700 text-slate-400'}`}>YOUR TURN</span>
           <span className={`px-4 py-1.5 rounded-full font-black tracking-widest text-xs transition-colors ${!isMyTurn ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(243,118,150,0.6)]' : 'bg-slate-700 text-slate-400'}`}>OPP TURN</span>
         </div>
         <div className="text-slate-300 font-mono text-xs sm:text-sm w-1/3 truncate text-center bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700">
            &gt; {matchData.log[matchData.log.length - 1]}
         </div>
         <div className="flex space-x-3">
           <button onClick={handleDraw} disabled={!isMyTurn || me.hasDrawnThisTurn} className="px-5 py-2 bg-blue-600/90 disabled:bg-slate-700 text-white font-black tracking-widest rounded-xl shadow-lg hover:bg-blue-500 transition-all flex items-center gap-2 text-xs sm:text-sm border border-blue-400/50 disabled:border-transparent"><Layers className="w-4 h-4" /> DRAW</button>
           <button onClick={handleAttack} disabled={!isMyTurn || !me.active || me.active.attachedEnergy < 1 || !me.hasDrawnThisTurn} className="px-5 py-2 bg-rose-600/90 disabled:bg-slate-700 text-white font-black tracking-widest rounded-xl shadow-lg hover:bg-rose-500 transition-all flex items-center gap-2 text-xs sm:text-sm border border-rose-400/50 disabled:border-transparent"><Swords className="w-4 h-4" /> ATTACK</button>
           <button onClick={passTurn} disabled={!isMyTurn || !me.hasDrawnThisTurn} className="px-5 py-2 bg-slate-700 disabled:bg-slate-800 text-slate-200 font-bold tracking-widest rounded-xl hover:bg-slate-600 transition-all text-xs sm:text-sm border border-slate-500 disabled:border-transparent">PASS</button>
         </div>
      </div>

      {/* PLAYER SIDE */}
      <div className="flex-[1.5] min-h-[420px] shrink-0 bg-slate-900 p-4 flex flex-col justify-between relative z-10">
         <div className="absolute bottom-6 left-6 flex flex-col items-center">
            <div className={`w-16 sm:w-20 aspect-[2.5/3.6] bg-gradient-to-br from-fuchsia-900/60 to-black border-2 sm:border-4 border-fuchsia-600/80 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:-translate-y-2 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${isMyTurn && !me.hasDrawnThisTurn ? 'ring-4 ring-blue-500 animate-pulse' : ''}`} onClick={handleDraw}>
               <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-fuchsia-500 opacity-80" />
               <span className="text-slate-200 font-black text-xs sm:text-sm mt-1 drop-shadow-md">{me.deck.length}</span>
            </div>
            <span className="text-slate-400 text-[0.6rem] sm:text-xs font-bold mt-2 tracking-widest uppercase">Deck</span>
         </div>
         <div className="absolute bottom-6 right-6 flex flex-col items-end">
            <span className="text-fuchsia-500 font-bold text-xs uppercase mb-2 tracking-widest">Prizes</span>
            <div className="flex gap-1.5">
               {[...Array(Math.max(0, me.prizes))].map((_, i) => <div key={i} className="w-8 h-12 bg-fuchsia-600 border border-fuchsia-400 rounded-lg shadow-[0_0_15px_rgba(217,70,239,0.5)]"></div>)}
            </div>
         </div>
         
         <div className="flex-1 flex flex-col items-center justify-start mt-4">
            <div 
               className={`w-28 h-40 border rounded-2xl flex items-center justify-center shadow-2xl mb-6 transition-all duration-300 cursor-pointer ${!me.active && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-fuchsia-400 bg-fuchsia-900/20 shadow-[0_0_30px_rgba(217,70,239,0.2)]' : me.active && selectedHandCard?.card.isEnergy && !me.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-950/80'}`}
               onClick={() => handlePlayAreaClick('active')}
            >
               {me.active ? <TCGCard card={me.active} size="small" inBattle={true} /> : <span className="text-slate-500 text-xs font-bold text-center p-2 uppercase tracking-widest">Play Active</span>}
            </div>
            <div className="flex gap-3 h-24">
               {[...Array(5)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-16 h-24 border rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${!me.bench[i] && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-fuchsia-400/50 bg-fuchsia-900/10' : me.bench[i] && selectedHandCard?.card.isEnergy && !me.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20' : 'border-slate-800 bg-slate-900/50'}`}
                   onClick={() => me.bench[i] && selectedHandCard?.card.isEnergy ? handlePlayAreaClick('benchCard', i) : me.bench[i] ? handleBenchPromote(i) : handlePlayAreaClick('bench')}
                 >
                    {me.bench[i] ? <TCGCard card={me.bench[i]} size="mini" inBattle={true} /> : null}
                 </div>
               ))}
            </div>
         </div>
         <div className="h-36 shrink-0 flex justify-center items-end pb-4 mt-6">
            {me.hand.map((card, idx) => (
               <div key={card.instanceId} className="w-24 sm:w-28 transition-all duration-300 hover:-translate-y-6 hover:rotate-2" style={{ marginLeft: idx === 0 ? 0 : '-2rem', zIndex: idx }}>
                 <TCGCard card={card} size="small" isFlipped={true} isSelected={selectedHandCard?.index === idx} onClick={() => setSelectedHandCard(selectedHandCard?.index === idx ? null : { card, index: idx })} />
               </div>
            ))}
            {me.hand.length === 0 && <span className="text-slate-600 italic tracking-widest font-bold">Hand is empty</span>}
         </div>
      </div>
    </div>
  );
};


// --- GLOBAL TRADE HUB COMPONENT ---
const TradeHub = ({ user, db, collection: myCollection, setCollection, showToast, setDbError }) => {
   const [openTrades, setOpenTrades] = useState([]);
   const [offerCardId, setOfferCardId] = useState('');
   const [reqCardId, setReqCardId] = useState('');
   const [isPosting, setIsPosting] = useState(false);

   // Listen for global open trades & MY completed trades
   useEffect(() => {
       if (!user || !db) return;
       const unsub = onSnapshot(getTradesCol(db), (snap) => {
           const open = [];
           snap.docs.forEach(d => {
               const t = d.data();
               t.id = d.id;
               if (t.status === 'open') {
                   open.push(t);
               } else if (t.status === 'completed' && t.offererId === user.uid) {
                   // This is MY trade that someone just accepted! Claim the reward!
                   setCollection(prev => {
                       const next = { ...prev };
                       next[t.reqId] = (next[t.reqId] || 0) + 1;
                       return next;
                   });
                   showToast(`Trade completed! You received ${getBaseCard(t.reqId).name}!`, 'success');
                   deleteDoc(d.ref).catch(()=>{});
               }
           });
           setOpenTrades(open.sort((a,b) => b.timestamp - a.timestamp));
       }, (err) => {
           console.error("Trade Hub Error", err);
           if (err.message?.toLowerCase().includes('permission') || err.code === 'permission-denied') setDbError(true);
       });
       return () => unsub();
   }, [user, db, setCollection, showToast, setDbError]);

   const postTrade = async () => {
       if (!offerCardId || !reqCardId) return;
       if (!myCollection[offerCardId] || myCollection[offerCardId] <= 0) {
           showToast("You don't own the card you are trying to offer!", 'error');
           return;
       }
       setIsPosting(true);
       try {
           // Deduct from local inventory immediately
           setCollection(prev => {
               const next = { ...prev };
               next[offerCardId] -= 1;
               return next;
           });

           await addDoc(getTradesCol(db), {
               offererId: user.uid,
               offererName: user.displayName || `Player_${user.uid.substring(0,4)}`,
               offerId: offerCardId,
               reqId: reqCardId,
               status: 'open',
               timestamp: Date.now()
           });
           showToast("Trade posted successfully!", 'success');
           setOfferCardId('');
           setReqCardId('');
       } catch(e) {
           console.error(e);
           if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') {
              setDbError(true);
           } else {
              showToast("Failed to post trade.", 'error');
           }
       }
       setIsPosting(false);
   };

   const cancelTrade = async (trade) => {
       try {
           // Refund card
           setCollection(prev => {
               const next = { ...prev };
               next[trade.offerId] = (next[trade.offerId] || 0) + 1;
               return next;
           });
           await deleteDoc(doc(getTradesCol(db), trade.id));
           showToast("Trade cancelled.", 'info');
       } catch(e) { 
           console.error(e); 
           if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') setDbError(true);
           else showToast("Cancel failed", 'error'); 
       }
   };

   const acceptTrade = async (trade) => {
       if (!myCollection[trade.reqId] || myCollection[trade.reqId] <= 0) {
           showToast("You do not own the requested card!", 'error');
           return;
       }
       try {
           // Swap cards in local inventory
           setCollection(prev => {
               const next = { ...prev };
               next[trade.reqId] -= 1;
               next[trade.offerId] = (next[trade.offerId] || 0) + 1;
               return next;
           });
           
           // Mark as completed so original offerer can claim it
           await updateDoc(doc(getTradesCol(db), trade.id), { status: 'completed' });
           showToast(`Trade accepted! You received ${getBaseCard(trade.offerId).name}.`, 'success');
       } catch(e) { 
           console.error(e); 
           if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') setDbError(true);
           else showToast("Accept failed", 'error'); 
       }
   };

   // Prepare dropdown options
   const myOwnedIds = Object.keys(myCollection).filter(id => myCollection[id] > 0);
   const allCardsGrouped = {
       "Genesis Set": CHARACTERS.filter(c => c.set === 'genesis'),
       "Awakening Set": CHARACTERS.filter(c => c.set === 'awakening'),
       "Voidfall Set": CHARACTERS.filter(c => c.set === 'voidfall'),
       "Mythos Set": CHARACTERS.filter(c => c.set === 'mythos'),
       "Energy Cards": ENERGY_CARDS
   };

   return (
      <div className="flex-1 flex flex-col xl:flex-row gap-8 pb-10">
         
         {/* POST A TRADE PANEL */}
         <div className="w-full xl:w-[450px] shrink-0 bg-slate-900/60 backdrop-blur-xl border border-blue-500/30 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(59,130,246,0.1)] flex flex-col h-fit">
            <h3 className="text-2xl font-black text-white tracking-widest mb-6 flex items-center gap-3"><ArrowRightLeft className="text-blue-500" /> CREATE TRADE</h3>
            
            <label className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Card to Offer (You give)</label>
            <select value={offerCardId} onChange={e => setOfferCardId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 mb-6">
                <option value="">-- Select a card you own --</option>
                {myOwnedIds.map(id => {
                    const card = getBaseCard(id);
                    if (!card) return null;
                    return <option key={id} value={id}>{card.name} ({card.rarity}) x{myCollection[id]}</option>
                })}
            </select>

            <label className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Card to Request (You want)</label>
            <select value={reqCardId} onChange={e => setReqCardId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500 mb-8">
                <option value="">-- Select any card --</option>
                {Object.entries(allCardsGrouped).map(([group, cards]) => (
                   <optgroup key={group} label={group}>
                       {cards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.rarity})</option>)}
                   </optgroup>
                ))}
            </select>

            <button 
                onClick={postTrade} 
                disabled={!offerCardId || !reqCardId || isPosting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black tracking-[0.2em] rounded-xl shadow-lg transition-all"
            >
                {isPosting ? 'POSTING...' : 'POST TRADE'}
            </button>
         </div>

         {/* OPEN TRADES PANEL */}
         <div className="flex-1 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 shadow-inner flex flex-col min-h-[500px]">
             <h3 className="text-2xl font-black text-white tracking-widest mb-6">GLOBAL TRADES ({openTrades.length})</h3>
             
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                 {openTrades.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full opacity-50">
                         <Ghost className="w-16 h-16 mb-4 text-slate-500" />
                         <p className="font-bold tracking-widest uppercase">No open trades right now</p>
                     </div>
                 ) : (
                     openTrades.map(trade => {
                         const offerCard = getBaseCard(trade.offerId);
                         const reqCard = getBaseCard(trade.reqId);
                         const isMine = trade.offererId === user.uid;
                         const canAccept = !isMine && myCollection[trade.reqId] > 0;

                         return (
                             <div key={trade.id} className="bg-slate-950/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-6 justify-between hover:border-blue-500/50 transition-colors">
                                 <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                     
                                     {/* Offering */}
                                     <div className="flex flex-col items-center">
                                         <span className="text-[0.6rem] text-emerald-400 font-bold uppercase tracking-widest mb-1">Offering</span>
                                         <div className="w-20"><TCGCard card={offerCard} size="small" /></div>
                                     </div>

                                     <ArrowRightLeft className="w-6 h-6 text-slate-600 rotate-90 sm:rotate-0" />

                                     {/* Requesting */}
                                     <div className="flex flex-col items-center">
                                         <span className="text-[0.6rem] text-rose-400 font-bold uppercase tracking-widest mb-1">Requesting</span>
                                         <div className="w-20"><TCGCard card={reqCard} size="small" /></div>
                                     </div>
                                 </div>

                                 <div className="flex flex-col items-center sm:items-end w-full sm:w-auto mt-4 sm:mt-0">
                                     <span className="text-slate-400 text-xs font-bold mb-3">{isMine ? 'Your Trade' : `Posted by ${trade.offererName}`}</span>
                                     {isMine ? (
                                         <button onClick={() => cancelTrade(trade)} className="w-full sm:w-auto px-6 py-2 bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white rounded-lg font-bold tracking-widest transition-colors">CANCEL</button>
                                     ) : (
                                         <button onClick={() => acceptTrade(trade)} disabled={!canAccept} className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white disabled:bg-slate-800 disabled:text-slate-600 rounded-lg font-black tracking-widest hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:shadow-none">
                                            {canAccept ? 'ACCEPT TRADE' : 'MISSING CARD'}
                                         </button>
                                     )}
                                 </div>
                             </div>
                         )
                     })
                 )}
             </div>
         </div>
      </div>
   );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [coins, setCoins] = useState(500); // 500 starting coins
  const [collection, setCollection] = useState(INITIAL_COLLECTION);
  const [deck, setDeck] = useState(STARTER_DECK); 
  const [activeTab, setActiveTab] = useState('shop'); 
  const [showRules, setShowRules] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Offline Battle State
  const [battleDifficulty, setBattleDifficulty] = useState(null); 

  // Cloud Save / Online States
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dbError, setDbError] = useState(false);
  
  const [onlineMatchId, setOnlineMatchId] = useState(null);

  const showToast = (message, type = 'info') => {
     setToast({ message, type });
     setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    try {
      const isGitHub = typeof __firebase_config === 'undefined';

      // 🔥 FIREBASE CONFIG INSTRUCTIONS: 
      // If you are running this on GitHub, you MUST replace the fake strings below 
      // with your ACTUAL Firebase project configuration!
      const myFirebaseConfig = {
        apiKey: "AIzaSyCcNMYKx4XMQnELN1Lgx8RMbYX3bUeFqd8",
        authDomain: "mythic-pulls.firebaseapp.com",
        projectId: "mythic-pulls",
        storageBucket: "mythic-pulls.firebasestorage.app",
        messagingSenderId: "127448359944",
        appId: "1:127448359944:web:790aaa8de8928241e6ddbd",
        measurementId: "G-6319YPL6H7"
      };

      const config = !isGitHub ? JSON.parse(__firebase_config) : myFirebaseConfig;
      const app = initializeApp(config);
      const auth = getAuth(app);
      setDb(getFirestore(app));

      const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (isGitHub) {
           setShowLogin(true);
        } else {
          await signInAnonymously(auth);
        }
      };
      initAuth();

      const unsubscribe = onAuthStateChanged(auth, u => {
         if (u) {
            setUser(u);
            setShowLogin(false);
         } else if (isGitHub) {
            setShowLogin(true);
         }
      });
      return () => unsubscribe();
    } catch(e) {
      console.error("Firebase init failed. Did you add your config?", e);
      setDataLoaded(true); 
    }
  }, []);

  const handleGoogleLogin = async () => {
     try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
     } catch (e) {
        console.error(e);
        showToast("Login failed! " + e.message, 'error');
     }
  };

  const handleLogout = () => {
     const auth = getAuth();
     signOut(auth);
     setShowLogin(true);
  };

  useEffect(() => {
    if (!user || !db) return;
    const loadData = async () => {
       try {
          const docRef = getSaveDocRef(db, user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
             const data = snap.data();
             if (data.coins !== undefined) setCoins(data.coins);
             if (data.collection) setCollection(data.collection);
             if (data.deck) setDeck(data.deck);
          }
       } catch(e) { 
           console.error("Load Data Error:", e);
           if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') {
               setDbError(true);
           }
       }
       setDataLoaded(true);
    };
    loadData();
  }, [user, db]);

  useEffect(() => {
     if (dataLoaded && user && db && !dbError) {
        const saveData = async () => {
           try {
              const docRef = getSaveDocRef(db, user.uid);
              await setDoc(docRef, { coins, collection, deck });
           } catch(e) { 
               console.error("Save Data Error:", e); 
               if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') {
                   setDbError(true);
               }
           }
        };
        saveData();
     }
  }, [coins, collection, deck, dataLoaded, user, db, dbError]);

  
  const [currentCards, setCurrentCards] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardRevealed, setIsCardRevealed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [activePackName, setActivePackName] = useState('');
  
  // Unboxing Animation States
  const [openingItem, setOpeningItem] = useState(null); // 'pack' or 'box' obj
  const [isUnboxing, setIsUnboxing] = useState(false);
  const [unboxStage, setUnboxStage] = useState('shake'); 

  const startUnboxing = (pulledCards, itemObj, type) => {
      setCurrentCards(pulledCards);
      setActiveCardIndex(0);
      setIsCardRevealed(false);
      setShowSummary(false);
      setActivePackName(itemObj.name);
      
      setOpeningItem({ ...itemObj, type });
      setIsUnboxing(true);
      setUnboxStage('shake');
      setActiveTab('opening');

      setTimeout(() => {
          setUnboxStage('burst');
          setTimeout(() => setIsUnboxing(false), 600); 
      }, 1500); 
  };

  const buyPack = (pack) => {
    if (coins >= pack.cost) {
      setCoins(prev => prev - pack.cost);
      const pulled = openPack(pack);
      startUnboxing(pulled, pack, 'pack');
      
      setCollection(prev => {
        const next = { ...prev };
        pulled.forEach(card => next[card.id] = (next[card.id] || 0) + 1);
        return next;
      });
    }
  };

  const buyBox = (box) => {
      if (coins < box.cost) return;
      setCoins(prev => prev - box.cost);

      const pulled = [];
      const packTemplate = PACKS.find(p => p.id === box.packId);
      
      // 6 Packs worth of cards
      for(let i=0; i<6; i++) {
          pulled.push(...openPack(packTemplate));
      }

      // 1 Guaranteed Promo
      const promoBase = getBaseCard(box.promoId);
      if (promoBase) pulled.push({ ...promoBase, instanceId: Math.random().toString(36).substr(2, 9) });

      // 1 MASSIVE Rarity Card
      const allRaresAndUp = COMBAT_CHARACTERS.filter(c => ['Rare','Epic','Legendary','GX'].includes(c.rarity));
      const massiveBase = allRaresAndUp[Math.floor(Math.random() * allRaresAndUp.length)];
      pulled.push({ ...massiveBase, id: massiveBase.id + '_massive', isMassive: true, instanceId: Math.random().toString(36).substr(2, 9) });

      startUnboxing(pulled, box, 'box');

      setCollection(prev => {
         const next = {...prev};
         pulled.forEach(c => next[c.id] = (next[c.id] || 0) + 1);
         return next;
      });
  };

  const handleCardInteraction = () => {
    if (!isCardRevealed) {
      setIsCardRevealed(true);
    } else {
      if (activeCardIndex < currentCards.length - 1) {
        setIsCardRevealed(false);
        setTimeout(() => setActiveCardIndex(prev => prev + 1), 50);
      } else {
        setShowSummary(true);
      }
    }
  };

  const handleRevealAll = () => {
      setIsCardRevealed(true);
      setShowSummary(true);
  };

  const MAX_DECK_SIZE = 30; 
  
  const addToDeck = (cardId) => {
    const ownedCount = collection[cardId] || 0;
    const inDeckCount = deck.filter(id => id === cardId).length;
    if (inDeckCount < ownedCount && deck.length < MAX_DECK_SIZE) {
      setDeck(prev => [...prev, cardId]);
    }
  };

  const removeFromDeck = (indexToRemove) => {
    setDeck(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const navTo = (tab) => {
      setActiveTab(tab);
      setBattleDifficulty(null);
      setOnlineMatchId(null);
  };

  // --- RENDERING SCREENS ---

  if (dbError) {
      return (
         <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center overflow-y-auto">
            <AlertCircle className="w-24 h-24 text-rose-500 mb-6" />
            <h1 className="text-4xl font-black text-rose-500 mb-4">DATABASE LOCKED!</h1>
            <p className="text-xl text-slate-300 max-w-2xl mb-8">
               Your Firebase Database is currently blocking the game from saving or matching players. You need to update your Firestore Security Rules.
            </p>
            <div className="bg-slate-900 border-2 border-slate-700 p-6 rounded-3xl text-left max-w-2xl shadow-2xl">
               <h3 className="text-amber-500 font-bold mb-4 text-xl tracking-widest">HOW TO UNLOCK IT:</h3>
               <ol className="list-decimal pl-5 text-slate-300 space-y-4 font-medium">
                  <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline font-black">Firebase Console</a>.</li>
                  <li>Click on <strong>Firestore Database</strong> in the left-hand menu.</li>
                  <li>Click the <strong>Rules</strong> tab at the top of the database screen.</li>
                  <li>Delete the code in there, and paste exactly this code:</li>
                  <pre className="bg-black p-4 mt-2 rounded-xl text-emerald-400 font-mono text-sm sm:text-base border border-slate-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                  </pre>
                  <li>Click the blue <strong>Publish</strong> button.</li>
                  <li>Come back here and refresh this page!</li>
               </ol>
            </div>
         </div>
      );
  }

  if (showLogin && !user) {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
           <Layers className="w-20 h-20 text-amber-500 mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
           <h1 className="text-4xl sm:text-6xl font-black text-amber-500 tracking-widest mb-4 drop-shadow-lg text-center">MYTHIC PULLS</h1>
           <p className="text-slate-400 mb-12 text-center max-w-md text-sm sm:text-lg">Sign in to save your collection, coins, and battle decks to the cloud!</p>
           <button onClick={handleGoogleLogin} className="px-6 py-4 sm:px-8 bg-white text-slate-950 font-black rounded-full flex items-center gap-3 hover:bg-slate-200 transition-transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              SIGN IN WITH GOOGLE
           </button>
        </div>
     );
  }

  if (!dataLoaded) {
     return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500 font-black tracking-[0.2em]">LOADING SAVE DATA...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col">
      
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* Rulebook Modal */}
      {showRules && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-amber-500/50 p-8 rounded-[2rem] max-w-2xl w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] relative max-h-[90vh] overflow-y-auto custom-scrollbar">
             <button onClick={() => setShowRules(false)} className="absolute top-6 right-6 text-2xl font-black text-slate-500 hover:text-white transition-colors"><X /></button>
             <h2 className="text-3xl font-black text-amber-500 mb-8 tracking-widest flex items-center gap-3"><BookOpen /> HOW TO PLAY</h2>
             <ul className="space-y-5 text-slate-300 text-lg">
                <li className="flex gap-3"><span className="text-amber-500 font-black">1.</span> <span>Draw 7 cards. Play a Basic Character to the Active slot.</span></li>
                <li className="flex gap-3"><span className="text-amber-500 font-black">2.</span> <span>You <strong className="text-white">must DRAW a card</strong> by clicking your deck at the start of every turn.</span></li>
                <li className="flex gap-3"><span className="text-amber-500 font-black">3.</span> <span>You can attach <strong className="text-white">ONE Energy card per turn</strong> to an Active or Benched character. <br/><em className="text-amber-400/80 text-sm">Note: Energy element MUST match the character's element!</em></span></li>
                <li className="flex gap-3"><span className="text-amber-500 font-black">4.</span> <span>You can have up to 5 characters on your bench. Click a benched character to promote it if your active spot is empty.</span></li>
                <li className="flex gap-3"><span className="text-amber-500 font-black">5.</span> <span>Attacking requires at least 1 Energy. It deals damage and automatically ends your turn.</span></li>
                <li className="flex gap-3"><span className="text-amber-500 font-black">6.</span> <span>Knock out an enemy to take 1 Prize Card. But beware—knocking out a <strong className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400">GX Character</strong> gives <strong className="text-white">2 Prize Cards!</strong></span></li>
                <li className="flex gap-3"><span className="text-amber-500 font-black">7.</span> <span>Take all 3 of your Prize Cards, or outlast your opponent so they run out of cards to draw.</span></li>
             </ul>
          </div>
        </div>
      )}

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none flex justify-center items-center opacity-40 z-0">
        <div className="w-[800px] h-[800px] bg-blue-900/20 blur-[150px] rounded-full mix-blend-screen absolute top-[-20%] left-[-10%]"></div>
        <div className="w-[800px] h-[800px] bg-fuchsia-900/10 blur-[150px] rounded-full mix-blend-screen absolute bottom-[-20%] right-[-10%]"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-slate-900/70 backdrop-blur-2xl border border-slate-700/50 p-2 sm:p-3 rounded-full z-50 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex justify-between items-center">
        <div className="flex items-center space-x-3 pl-4 sm:pl-6">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white tracking-[0.2em] hidden lg:block drop-shadow-md">
            MYTHIC
          </h1>
        </div>
        
        <div className="flex space-x-1 sm:space-x-2 bg-slate-950/60 p-1.5 sm:p-2 rounded-full border border-slate-800/80 shadow-inner overflow-x-auto no-scrollbar">
          <button onClick={() => navTo('shop')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'shop' ? 'bg-slate-800 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}>
            <Store className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xl:inline">SHOP</span>
          </button>
          <button onClick={() => navTo('collection')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'collection' ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}>
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xl:inline">BINDER</span>
          </button>
          <button onClick={() => navTo('deck')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'deck' ? 'bg-slate-800 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}>
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xl:inline">DECK</span>
          </button>
          <button onClick={() => navTo('trades')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'trades' ? 'bg-slate-800 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 border border-transparent'}`}>
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xl:inline">TRADE</span>
          </button>
          <button onClick={() => navTo('battle')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'battle' ? 'bg-slate-800 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.2)]' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 border border-transparent'}`}>
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xl:inline">BATTLE</span>
          </button>
          <button onClick={() => navTo('online')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'online' ? 'bg-slate-800 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'text-slate-400 hover:text-fuchsia-400 hover:bg-slate-800/50 border border-transparent'}`}>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xl:inline">ONLINE</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-950 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full border border-slate-800 shadow-inner mr-1 sm:mr-2">
          <button onClick={() => setShowRules(true)} className="text-slate-400 hover:text-slate-200 transition-colors hidden sm:block" title="How to Play">
             <BookOpen className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block"></div>
          <div className="flex items-center bg-amber-500/10 px-2 sm:px-3 py-1 rounded-lg border border-amber-500/20">
             <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mr-2" />
             <span className="font-black text-amber-400 tracking-wide text-sm sm:text-base">{coins.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 bg-slate-800 mx-1"></div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 transition-colors" title="Sign Out">
             <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </nav>

      <main className="pt-28 sm:pt-32 p-4 sm:p-10 flex-1 flex flex-col relative z-10 max-w-[90rem] mx-auto w-full">
        
        {/* SHOP VIEW */}
        {activeTab === 'shop' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col items-center justify-center pb-10">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-4xl sm:text-6xl font-black text-white mb-4 sm:mb-6 tracking-tighter drop-shadow-2xl">SHOP</h2>
              <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto px-4 font-medium tracking-wide">Pull mythic heroes. Gather elemental energy. Construct an unbeatable deck.</p>
            </div>

            {/* BOOSTER BOXES SECTION */}
            <div className="w-full max-w-7xl mb-12 px-4">
                <h3 className="text-2xl font-black text-slate-300 tracking-[0.2em] mb-6 flex items-center gap-3"><PackageOpen className="text-purple-500" /> BOOSTER BOXES</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {BOXES.map(box => {
                        const promoCard = getBaseCard(box.promoId);
                        const elementStyle = promoCard ? ELEMENTS[promoCard.element] : null;

                        return (
                        <div key={box.id} className="group relative bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-purple-500 transition-all hover:-translate-y-4 duration-300 flex flex-col lg:flex-row">
                            <div className={`w-full lg:w-1/2 h-56 lg:h-auto bg-gradient-to-b ${box.color} flex items-center justify-center p-6 text-center relative overflow-hidden shrink-0 border-r border-white/10`}>
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay z-0"></div>
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>
                                
                                {promoCard && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-700 ease-out z-0">
                                        <img src={promoCard.imgSrc} className={`w-48 h-48 sm:w-64 sm:h-64 object-contain ${elementStyle?.imgFilter} drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] group-hover:drop-shadow-[0_0_40px_rgba(255,255,255,0.7)]`} alt="Featured" />
                                    </div>
                                )}
                                <div className="z-10 bg-black/80 w-[120%] py-3 sm:py-4 backdrop-blur-md border-y border-white/20 transform -rotate-6 group-hover:-rotate-3 transition-transform duration-500 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex flex-col items-center">
                                    <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-yellow-400 tracking-[0.2em] drop-shadow-lg uppercase">
                                        {box.name}
                                    </h3>
                                </div>
                            </div>
                            <div className="p-6 sm:p-10 flex flex-col flex-1 justify-between bg-gradient-to-b from-slate-900 to-slate-950 relative z-20">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 bg-purple-500/10 w-fit px-3 py-1 rounded-lg border border-purple-500/20">
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                        <span className="text-purple-400 font-bold tracking-widest text-xs uppercase">Premium Item</span>
                                    </div>
                                    <p className="text-slate-300 font-medium mb-6 sm:mb-8 text-base sm:text-lg leading-relaxed">{box.description}</p>
                                </div>
                                <button 
                                onClick={() => buyBox(box)}
                                disabled={coins < box.cost}
                                className={`w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl tracking-[0.2em] flex items-center justify-center space-x-4 transition-all ${
                                    coins >= box.cost 
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] border border-purple-500/50' 
                                    : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                                }`}
                                >
                                <span>BUY BOX</span>
                                <div className="flex items-center bg-black/30 px-3 sm:px-4 py-1.5 rounded-xl border border-white/10">
                                    <Coins className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-yellow-500" />
                                    {box.cost.toLocaleString()}
                                </div>
                                </button>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
            
            {/* BOOSTER PACKS SECTION */}
            <div className="w-full max-w-7xl px-4">
                <h3 className="text-2xl font-black text-slate-300 tracking-[0.2em] mb-6 flex items-center gap-3"><Layers className="text-amber-500" /> BOOSTER PACKS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full gap-8 sm:gap-10">
                {PACKS.map(pack => {
                    const featuredCard = getBaseCard(pack.featuredCardId);
                    const elementStyle = featuredCard ? ELEMENTS[featuredCard.element] : null;

                    return (
                    <div key={pack.id} className="group relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-amber-500/50 transition-all hover:-translate-y-4 duration-300 flex flex-col">
                    <div className={`h-56 sm:h-72 bg-gradient-to-b ${pack.color} flex flex-col items-center justify-center p-6 text-center relative overflow-hidden shrink-0`}>
                        {/* Foil crimps top and bottom */}
                        <div className="absolute top-0 w-full h-4 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_4px,rgba(255,255,255,0.1)_4px,rgba(255,255,255,0.1)_8px)] z-20 shadow-sm border-b border-black/20"></div>
                        <div className="absolute bottom-0 w-full h-4 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_4px,rgba(255,255,255,0.1)_4px,rgba(255,255,255,0.1)_8px)] z-20 shadow-sm border-t border-white/20"></div>

                        {/* Pack texture */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 mix-blend-overlay z-0"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/30 pointer-events-none z-10 group-hover:opacity-50 transition-opacity"></div>
                        
                        {/* Featured Character Art */}
                        {featuredCard && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-700 ease-out z-0 mt-4">
                            <img src={featuredCard.imgSrc} className={`w-40 h-40 sm:w-52 sm:h-52 object-contain ${elementStyle?.imgFilter} drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]`} alt="Featured" />
                            </div>
                        )}

                        {/* Pack Name Banner */}
                        <div className="z-10 bg-black/70 w-[120%] py-3 sm:py-4 backdrop-blur-md border-y-2 border-white/20 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex flex-col items-center">
                            <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-stone-200 to-stone-400 tracking-[0.2em] drop-shadow-[0_4px_4px_rgba(0,0,0,1)] uppercase">
                                {pack.name}
                            </h3>
                            {featuredCard && (
                                <p className="text-[0.6rem] sm:text-xs text-amber-400 font-bold tracking-[0.3em] mt-1 uppercase opacity-80">
                                Featuring {featuredCard.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="p-6 sm:p-10 flex flex-col flex-1 justify-between bg-gradient-to-b from-slate-900 to-slate-950 relative z-20">
                        <p className="text-slate-300 font-medium mb-6 sm:mb-8 text-center text-base sm:text-lg leading-relaxed">{pack.description}</p>
                        
                        <button 
                        onClick={() => buyPack(pack)}
                        disabled={coins < pack.cost}
                        className={`w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl tracking-[0.2em] flex items-center justify-center space-x-4 transition-all ${
                            coins >= pack.cost 
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_30px_rgba(217,119,6,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] border border-amber-500/50' 
                            : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                        >
                        <span>PURCHASE</span>
                        <div className="flex items-center bg-black/30 px-3 sm:px-4 py-1.5 rounded-xl border border-white/10">
                            <Coins className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-yellow-500" />
                            {pack.cost}
                        </div>
                        </button>
                    </div>
                    </div>
                )})}
                </div>
            </div>
          </div>
        )}

        {/* OPENING VIEW */}
        {activeTab === 'opening' && (
           <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 relative">
             
             {isUnboxing && openingItem ? (
                <div className="flex flex-col items-center justify-center relative z-50">
                   <h2 className="text-3xl font-black text-white tracking-[0.2em] mb-12 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">OPENING...</h2>
                   
                   {/* Background Explosion Glow */}
                   {unboxStage === 'burst' && (
                       <div className="absolute inset-0 bg-amber-500 rounded-full blur-[150px] opacity-90 animate-in fade-in zoom-in duration-500"></div>
                   )}

                   <div className={`relative transition-all duration-300 ${openingItem.type === 'box' ? 'w-80 sm:w-[28rem] h-64 sm:h-80' : 'w-64 sm:w-80 h-96 sm:h-[28rem]'} rounded-[2rem] shadow-[0_0_50px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col ${unboxStage === 'shake' ? 'animate-pack-shake scale-105' : 'animate-pack-burst pointer-events-none'}`}>
                      <div className={`flex-1 bg-gradient-to-b ${openingItem.color} flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}>
                         
                         {openingItem.type === 'pack' && (
                             <>
                                <div className="absolute top-0 w-full h-4 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_4px,rgba(255,255,255,0.1)_4px,rgba(255,255,255,0.1)_8px)] z-20 shadow-sm border-b border-black/20"></div>
                                <div className="absolute bottom-0 w-full h-4 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_4px,rgba(255,255,255,0.1)_4px,rgba(255,255,255,0.1)_8px)] z-20 shadow-sm border-t border-white/20"></div>
                             </>
                         )}

                         <div className={`absolute inset-0 ${openingItem.type === 'box' ? "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" : "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"} opacity-40 mix-blend-overlay z-0`}></div>
                         
                         {(openingItem.featuredCardId || openingItem.promoId) && (
                             <div className={`absolute inset-0 flex items-center justify-center opacity-100 z-0 drop-shadow-[0_0_40px_rgba(255,255,255,0.8)] ${openingItem.type === 'box' ? 'scale-150 opacity-60' : 'scale-110'}`}>
                                <img src={getBaseCard(openingItem.featuredCardId || openingItem.promoId)?.imgSrc} className="w-56 h-56 sm:w-72 sm:h-72 object-contain" alt="Featured" />
                             </div>
                         )}
                         <div className="z-10 bg-black/70 w-[120%] py-4 backdrop-blur-md border-y-2 border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex flex-col items-center">
                            <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-stone-200 to-stone-400 tracking-[0.2em] drop-shadow-[0_4px_4px_rgba(0,0,0,1)] uppercase">
                               {openingItem.name}
                            </h3>
                         </div>
                      </div>
                   </div>
                </div>
             ) : (
                <>
                   <div className="text-center mb-10">
                     <h2 className="text-2xl sm:text-4xl font-black text-amber-500 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">{activePackName}</h2>
                     {!showSummary && currentCards.length <= 15 && (
                        <div className="mt-6 flex items-center justify-center space-x-3">
                          {[...Array(currentCards.length)].map((_, i) => (
                            <div key={i} className={`h-2 sm:h-3 rounded-full transition-all duration-500 ${i === activeCardIndex ? 'w-10 sm:w-16 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.8)]' : i < activeCardIndex ? 'w-3 sm:w-4 bg-slate-700' : 'w-3 sm:w-4 bg-slate-800'}`} />
                          ))}
                        </div>
                     )}
                   </div>
                   
                   {!showSummary ? (
                     <div className="flex flex-col items-center justify-center relative mt-2 sm:mt-6">
                       <div className="animate-in slide-in-from-bottom-10 fade-in duration-500">
                         <TCGCard key={activeCardIndex} card={currentCards[activeCardIndex]} isFlipped={isCardRevealed} size="large" onClick={handleCardInteraction} />
                       </div>
                       <div className="h-24 mt-10 sm:mt-14 flex items-center justify-center gap-4">
                         {isCardRevealed ? (
                           <>
                             {currentCards.length > 10 && activeCardIndex < currentCards.length - 1 && (
                                <button onClick={handleRevealAll} className="px-8 py-5 bg-slate-800 text-slate-300 font-black tracking-[0.2em] text-sm sm:text-base rounded-full hover:bg-slate-700 hover:text-white transition-all border border-slate-600">
                                  REVEAL ALL
                                </button>
                             )}
                             <button onClick={handleCardInteraction} className="px-12 py-5 bg-amber-500 text-slate-950 font-black tracking-[0.2em] text-base sm:text-xl rounded-full hover:bg-amber-400 hover:scale-105 transition-all shadow-[0_0_40px_rgba(245,158,11,0.4)] border border-amber-300">
                               {activeCardIndex < currentCards.length - 1 ? 'NEXT CARD' : 'FINISH'}
                             </button>
                           </>
                         ) : (
                           <p className="text-slate-400 animate-pulse font-black tracking-[0.3em] text-lg sm:text-xl uppercase drop-shadow-md cursor-pointer hover:text-white" onClick={handleCardInteraction}>Tap to reveal</p>
                         )}
                       </div>
                     </div>
                   ) : (
                     <div className="w-full max-w-[90rem] animate-in zoom-in-95 duration-500 flex flex-col items-center pb-16">
                       <h3 className="text-3xl sm:text-5xl font-black text-white mb-10 sm:mb-16 tracking-[0.3em] text-center drop-shadow-2xl">SUMMARY</h3>
                       <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-16 sm:mb-24">
                         {currentCards.map((card, index) => (
                           <div key={card.instanceId} className="animate-in slide-in-from-bottom-12 fade-in hover:-translate-y-6 sm:hover:-translate-y-8 transition-transform duration-500 ease-out" style={{ animationDelay: `${(index % 10) * 50}ms` }}>
                             <TCGCard card={card} isFlipped={true} size="small" />
                           </div>
                         ))}
                       </div>
                       <button onClick={() => navTo('shop')} className="px-12 sm:px-16 py-4 sm:py-6 bg-amber-600 text-white font-black text-lg sm:text-2xl tracking-[0.2em] rounded-full hover:bg-amber-500 hover:scale-105 transition-all shadow-[0_10px_40px_rgba(217,119,6,0.5)] border border-amber-400">
                         RETURN TO SHOP
                       </button>
                     </div>
                   )}
                </>
             )}
           </div>
        )}

        {/* COLLECTION VIEW */}
        {activeTab === 'collection' && (
           <div className="animate-in fade-in duration-500">
           <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-8 sm:mb-12 border-b border-slate-800 pb-6 sm:pb-8">
             <div className="text-center sm:text-left">
               <h2 className="text-4xl sm:text-5xl font-black text-white mb-2 sm:mb-4 tracking-tighter drop-shadow-lg">CARD BINDER</h2>
               <div className="flex items-center justify-center sm:justify-start gap-3">
                 <div className="bg-emerald-500/20 px-3 py-1 rounded-md border border-emerald-500/30">
                    <p className="text-emerald-400 font-black tracking-[0.2em] text-xs sm:text-sm">
                      {Object.keys(collection).length} / {CHARACTERS.length} UNIQUE CARDS
                    </p>
                 </div>
               </div>
             </div>
           </div>
           
           {/* Normal & Massive Cards Rendering Logic */}
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 lg:gap-10 pb-24">
             {CHARACTERS.map(char => {
               // Render base card
               const count = collection[char.id] || 0;
               const isOwned = count > 0;
               
               // Check if they own the massive version of this card
               const massiveId = char.id + '_massive';
               const massiveCount = collection[massiveId] || 0;
               const ownsMassive = massiveCount > 0;

               return (
                 <React.Fragment key={char.id}>
                    {/* Base Card */}
                    <div className="relative group">
                    {isOwned && (
                        <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-slate-900 text-white border-2 border-emerald-500 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black shadow-[0_0_20px_rgba(16,185,129,0.5)] z-20 transform group-hover:scale-110 transition-transform text-sm sm:text-lg">
                        {count}
                        </div>
                    )}
                    <div className={`transition-all duration-500 ease-out ${!isOwned ? 'opacity-20 grayscale blur-[3px] hover:blur-none hover:opacity-50 hover:grayscale-0' : 'hover:-translate-y-4 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)]'}`}>
                        {isOwned ? <TCGCard card={char} size="small" isFlipped={true} /> : (
                            <div className="w-full aspect-[2.5/3.6] bg-slate-900/50 border-2 border-dashed border-slate-700/50 rounded-[1.5rem] flex flex-col items-center justify-center p-4 sm:p-6 text-center backdrop-blur-sm">
                            <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-slate-800 mb-2 sm:mb-4" />
                            <span className="text-xs sm:text-sm text-slate-600 font-bold tracking-widest">LOCKED</span>
                            </div>
                        )}
                    </div>
                    </div>

                    {/* Render Massive version ONLY if they own it, placed right next to the base card */}
                    {ownsMassive && (
                        <div className="relative group" key={massiveId}>
                            <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-slate-900 text-white border-2 border-yellow-400 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black shadow-[0_0_20px_rgba(250,204,21,0.5)] z-20 transform group-hover:scale-110 transition-transform text-sm sm:text-lg">
                                {massiveCount}
                            </div>
                            <div className="transition-all duration-500 ease-out hover:-translate-y-4 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                <TCGCard card={{...char, isMassive: true}} size="small" isFlipped={true} />
                            </div>
                        </div>
                    )}
                 </React.Fragment>
               );
             })}
           </div>
         </div>
        )}

        {/* DECK VIEW */}
        {activeTab === 'deck' && (() => {
          const deckChars = deck.map(id => getBaseCard(id)).filter(Boolean);
          return (
          <div className="animate-in fade-in duration-500 flex flex-col pb-20">
            <div className="mb-6 sm:mb-10 border-b border-slate-800 pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-6">
               <div>
                 <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter flex items-center gap-4 drop-shadow-lg">BATTLE DECK</h2>
               </div>
               <div className={`px-5 sm:px-6 py-2 sm:py-3 rounded-2xl border-2 flex items-center gap-3 font-black tracking-widest shadow-xl transition-colors ${deck.length === MAX_DECK_SIZE ? 'bg-teal-500/20 text-teal-400 border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.3)]' : 'bg-slate-900/50 text-slate-400 border-slate-700/50'}`}>
                 <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                 <span>{deck.length} / {MAX_DECK_SIZE}</span>
               </div>
            </div>

            <div className="flex flex-col-reverse lg:flex-row gap-8 xl:gap-14">
              <div className="flex-1 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] p-6 sm:p-10 flex flex-col shadow-2xl">
                <h3 className="text-sm sm:text-lg font-black text-slate-400 mb-6 sm:mb-8 tracking-[0.2em] uppercase flex items-center gap-3 bg-slate-950/50 w-fit px-4 py-2 rounded-xl border border-slate-800">
                  <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" /> Available Collection
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                  {Object.keys(collection).filter(id => collection[id] > 0).map(id => {
                    const char = getBaseCard(id);
                    if (!char) return null;
                    const ownedCount = collection[id] || 0;
                    const inDeckCount = deck.filter(dId => dId === id).length;
                    const availableCount = ownedCount - inDeckCount;
                    const canAdd = availableCount > 0 && deck.length < MAX_DECK_SIZE;
                    return (
                      <div key={id} className={`relative transition-all duration-300 ease-out ${canAdd ? 'cursor-pointer hover:-translate-y-4 hover:shadow-[0_20px_40px_rgba(20,184,166,0.2)]' : 'opacity-30 cursor-not-allowed grayscale'}`} onClick={() => canAdd && addToDeck(id)}>
                        <div className={`absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-black z-20 shadow-2xl border-2 ${canAdd ? 'bg-teal-500 text-slate-950 border-teal-300' : 'bg-slate-800 text-slate-500 border-slate-600'}`}>
                          {availableCount}
                        </div>
                        <TCGCard card={char} size="small" isFlipped={true} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full lg:w-[400px] xl:w-[500px] bg-slate-900/60 backdrop-blur-2xl border border-teal-900/50 shadow-[0_0_50px_rgba(20,184,166,0.1)] rounded-[2.5rem] p-6 sm:p-8 flex flex-col shrink-0 lg:sticky lg:top-32 h-fit max-h-[calc(100vh-140px)]">
                <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">
                   <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3 sm:gap-4">
                      {[...Array(MAX_DECK_SIZE)].map((_, index) => {
                        const cardId = deck[index];
                        if (cardId) {
                           const char = getBaseCard(cardId);
                           return (
                             <div key={`slot-${index}-${cardId}`} className="relative cursor-pointer hover:scale-95 transition-transform group" onClick={() => removeFromDeck(index)}>
                               <div className="absolute inset-0 bg-rose-950/80 z-30 rounded-[1.3rem] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-sm border-2 border-rose-500/50 shadow-inner">
                                 <Skull className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 drop-shadow-lg" />
                               </div>
                               <TCGCard card={char} size="small" isFlipped={true} />
                             </div>
                           );
                        } else {
                           return (
                             <div key={`empty-${index}`} className="w-full aspect-[2.5/3.6] bg-slate-950/40 border-2 border-dashed border-slate-700/50 rounded-[1.3rem] flex flex-col items-center justify-center p-2 text-center group transition-colors hover:border-teal-500/30 hover:bg-teal-950/20">
                               <span className="text-slate-700 font-black text-xl sm:text-2xl opacity-50 group-hover:text-teal-500/60 transition-colors">{index + 1}</span>
                             </div>
                           );
                        }
                      })}
                   </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* TRADE VIEW */}
        {activeTab === 'trades' && (
           <TradeHub user={user} db={db} collection={collection} setCollection={setCollection} showToast={showToast} setDbError={setDbError} />
        )}

        {/* OFFLINE BATTLE VIEW */}
        {activeTab === 'battle' && (
          <div className="animate-in fade-in duration-500 flex-1 flex flex-col">
             {deck.length < 30 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                   <ShieldAlert className="w-24 h-24 text-rose-500/50 animate-pulse" />
                   <h2 className="text-4xl font-black tracking-widest text-white">DECK INCOMPLETE</h2>
                   <p className="text-slate-400 font-medium">You need exactly 30 cards in your deck to enter the Battle Arena.</p>
                   <button onClick={() => navTo('deck')} className="mt-4 px-8 py-4 bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 rounded-full font-black tracking-widest text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">GO TO DECK BUILDER</button>
                </div>
             ) : battleDifficulty ? (
                <BattleArena 
                  playerDeckIds={deck} 
                  difficulty={battleDifficulty}
                  onWin={(amt) => setCoins(c => c + amt)} 
                  onLose={(amt) => setCoins(c => c + amt)} 
                  onExit={() => navTo('shop')} 
                  showToast={showToast}
                />
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center pb-10">
                   <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20 mb-8 shadow-[0_0_40px_rgba(225,29,72,0.2)]">
                      <Swords className="w-20 h-20 text-rose-500 drop-shadow-md" />
                   </div>
                   <h2 className="text-4xl sm:text-6xl font-black tracking-widest text-white mb-4 drop-shadow-2xl">BATTLE ARENA</h2>
                   <p className="text-slate-400 mb-14 text-lg font-medium tracking-wide">Select a difficulty. Harder bots yield greater coin rewards.</p>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4">
                      <button onClick={() => setBattleDifficulty('easy')} className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 hover:border-emerald-500/80 rounded-[2rem] p-8 flex flex-col items-center transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)] group">
                         <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all border border-emerald-500/20"><Check className="w-10 h-10" /></div>
                         <h3 className="text-2xl font-black text-white tracking-widest mb-3">EASY</h3>
                         <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                           <p className="text-emerald-400 text-sm font-bold tracking-widest">REWARD: 250 <Coins className="inline w-4 h-4 text-yellow-500 -mt-1 ml-1"/></p>
                         </div>
                      </button>
                      <button onClick={() => setBattleDifficulty('medium')} className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 hover:border-amber-500/80 rounded-[2rem] p-8 flex flex-col items-center transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(245,158,11,0.2)] group">
                         <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all border border-amber-500/20"><Layers className="w-10 h-10" /></div>
                         <h3 className="text-2xl font-black text-white tracking-widest mb-3">MEDIUM</h3>
                         <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                           <p className="text-amber-400 text-sm font-bold tracking-widest">REWARD: 500 <Coins className="inline w-4 h-4 text-yellow-500 -mt-1 ml-1"/></p>
                         </div>
                      </button>
                      <button onClick={() => setBattleDifficulty('hard')} className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 hover:border-rose-500/80 rounded-[2rem] p-8 flex flex-col items-center transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(225,29,72,0.2)] group">
                         <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-rose-500/20 transition-all border border-rose-500/20"><Swords className="w-10 h-10" /></div>
                         <h3 className="text-2xl font-black text-white tracking-widest mb-3">HARD</h3>
                         <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                           <p className="text-rose-400 text-sm font-bold tracking-widest">REWARD: 1000 <Coins className="inline w-4 h-4 text-yellow-500 -mt-1 ml-1"/></p>
                         </div>
                      </button>
                      <button onClick={() => setBattleDifficulty('extreme')} className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 hover:border-fuchsia-500/80 rounded-[2rem] p-8 flex flex-col items-center transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(217,70,239,0.2)] group relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <div className="w-20 h-20 bg-fuchsia-500/10 text-fuchsia-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-fuchsia-500/20 transition-all border border-fuchsia-500/20"><Skull className="w-10 h-10" /></div>
                         <h3 className="text-2xl font-black text-white tracking-widest mb-3 z-10">EXTREME</h3>
                         <div className="bg-slate-950 px-4 py-2 rounded-xl border border-fuchsia-900/50 z-10">
                           <p className="text-fuchsia-400 text-sm font-bold tracking-widest">REWARD: 2500 <Coins className="inline w-4 h-4 text-yellow-500 -mt-1 ml-1"/></p>
                         </div>
                      </button>
                   </div>
                </div>
             )}
          </div>
        )}

        {/* ONLINE BATTLE VIEW */}
        {activeTab === 'online' && (
          <div className="animate-in fade-in duration-500 flex-1 flex flex-col">
             {deck.length < 30 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                   <ShieldAlert className="w-24 h-24 text-fuchsia-500/50 animate-pulse" />
                   <h2 className="text-4xl font-black tracking-widest text-white">DECK INCOMPLETE</h2>
                   <p className="text-slate-400 font-medium">You need exactly 30 cards in your deck to play online.</p>
                   <button onClick={() => navTo('deck')} className="mt-4 px-8 py-4 bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 rounded-full font-black tracking-widest text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">GO TO DECK BUILDER</button>
                </div>
             ) : onlineMatchId ? (
                <OnlineBattleArena 
                  playerDeckIds={deck} 
                  onWin={() => setCoins(c => c + 1000)} 
                  onLose={() => setCoins(c => c + 100)} 
                  onExit={() => navTo('shop')} 
                  user={user}
                  db={db}
                  existingMatchId={onlineMatchId}
                  showToast={showToast}
                  setDbError={setDbError}
                />
             ) : (
                <OnlineLobby 
                   user={user} 
                   db={db} 
                   setDbError={setDbError} 
                   onStartMatch={(matchId) => setOnlineMatchId(matchId)}
                   showToast={showToast}
                />
             )}
          </div>
        )}

      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pack-shake {
          0%, 100% { transform: translateX(0) rotate(0deg) scale(1.05); }
          25% { transform: translateX(-8px) rotate(-4deg) scale(1.05); }
          50% { transform: translateX(8px) rotate(4deg) scale(1.05); }
          75% { transform: translateX(-8px) rotate(-4deg) scale(1.05); }
        }
        @keyframes pack-burst {
          0% { transform: scale(1.05); filter: brightness(1); opacity: 1; }
          40% { transform: scale(1.2); filter: brightness(2) contrast(1.5); opacity: 1; }
          100% { transform: scale(3.5); filter: brightness(3); opacity: 0; }
        }
        .animate-pack-shake { animation: pack-shake 0.3s cubic-bezier(.36,.07,.19,.97) infinite; }
        .animate-pack-burst { animation: pack-burst 0.6s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.6); border-radius: 10px; border: 2px solid rgba(15, 23, 42, 0.4); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 0.8); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}