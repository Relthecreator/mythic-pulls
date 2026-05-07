import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, Sparkles, Ghost, Flame, Droplet, Wind, Mountain, Moon, Sun, Star, 
  Crown, Shield, Zap, Swords, Skull, Heart, CircleDashed, LayoutDashboard,
  Layers, Store, ZapIcon, Crosshair, ShieldAlert, AlertCircle, Play, BookOpen, LogOut
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

// --- GAME DATA & CONFIGURATION ---

const RARITY_WEIGHTS = { Energy: 0, Common: 1, Rare: 2, Epic: 3, Legendary: 4, GX: 5 };

const RARITIES = {
  Energy: { label: 'Energy', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'from-stone-700 to-stone-900', outerBg: 'bg-stone-950', foil: '' },
  Common: { label: 'Common', color: 'text-gray-400', border: 'border-gray-500', bg: 'from-slate-200 to-slate-400', outerBg: 'bg-slate-800', foil: '' },
  Rare: { label: 'Rare', color: 'text-blue-500', border: 'border-blue-400', bg: 'from-blue-100 to-blue-300', outerBg: 'bg-blue-950', foil: 'after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent' },
  Epic: { label: 'Epic', color: 'text-purple-500', border: 'border-purple-400', bg: 'from-purple-100 to-purple-300', outerBg: 'bg-purple-950', foil: 'after:bg-gradient-to-tr after:from-purple-400/30 after:via-white/60 after:to-purple-400/30' },
  Legendary: { label: 'Legendary', color: 'text-yellow-500', border: 'border-yellow-300', bg: 'from-yellow-100 to-amber-300', outerBg: 'bg-yellow-700', foil: 'after:bg-gradient-to-br after:from-yellow-300/50 after:via-white/70 after:to-pink-400/50 animate-pulse-slow' },
  GX: { label: 'GX', color: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400', border: 'border-cyan-300', bg: 'from-slate-900 via-fuchsia-950 to-slate-900', outerBg: 'bg-gradient-to-br from-cyan-400 via-purple-500 to-yellow-400 p-[3px]', foil: 'after:bg-gradient-to-bl after:from-cyan-300/40 after:via-white/60 after:to-yellow-300/40 animate-pulse' }
};

const ELEMENTS = {
  Water: { icon: Droplet, color: 'text-blue-600', artBg: 'from-blue-400 to-blue-800', imgFilter: 'sepia-[.5] hue-rotate-[190deg] saturate-200' },
  Earth: { icon: Mountain, color: 'text-amber-800', artBg: 'from-amber-700 to-stone-900', imgFilter: 'sepia-[.7] hue-rotate-[10deg] saturate-150' },
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
  
  { id: 'e1', set: 'genesis', name: 'Shadow Automaton', rarity: 'Epic', element: 'Dark', hp: 100, attack: 'Dark Beam', dmg: 80, ability: 'Siphon: Heals for 50% of damage dealt.', flavor: 'Constructed from forbidden, abyssal technology.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=void' },
  { id: 'e2', set: 'genesis', name: 'Dawn Paladin', rarity: 'Epic', element: 'Light', hp: 130, attack: 'Radiant Slash', dmg: 70, ability: 'Aura of Light: Allies take 10 less damage.', flavor: 'Draws power directly from the midday sun.', imgSrc: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=solar' },
  { id: 'e3', set: 'genesis', name: 'Iron Blademaster', rarity: 'Epic', element: 'Steel', hp: 90, attack: 'Omni-Slash', dmg: 90, ability: 'Pierce: Ignores enemy armor and shields.', flavor: 'Has mastered every weapon known to mankind.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=blade' },
  { id: 'e4', set: 'genesis', name: 'Storm Bringer', rarity: 'Epic', element: 'Wind', hp: 110, attack: 'Hurricane', dmg: 85, ability: 'Cyclone: Shuffles enemy hand.', flavor: 'Summons storms with a flick of the wrist.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=storm' },
  { id: 'e5', set: 'genesis', name: 'Abyssal Horror', rarity: 'Epic', element: 'Dark', hp: 140, attack: 'Void Crush', dmg: 95, ability: 'Terror: Enemies cannot heal while this is active.', flavor: 'Do not look into its eyes. Just don\'t.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=horror' },
  { id: 'e6', set: 'genesis', name: 'Luminous Seraph', rarity: 'Epic', element: 'Light', hp: 120, attack: 'Holy Strike', dmg: 80, ability: 'Resurrect: Revives the first fainted ally with 30 HP.', flavor: 'Descends from the heavens to smite evil.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=seraph' },
  
  { id: 'l1', set: 'genesis', name: 'Nebula Construct', rarity: 'Legendary', element: 'Cosmic', hp: 180, attack: 'Supernova', dmg: 150, ability: 'Big Bang: Destroys all shields and buffs on the field.', flavor: 'An abstract entity born from a dying star.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=dragon' },
  { id: 'l2', set: 'genesis', name: 'Astral Weaver', rarity: 'Legendary', element: 'Light', hp: 150, attack: 'Solar Flare', dmg: 140, ability: 'Reality Warp: Swap HP percentage with enemy once per game.', flavor: 'Spins new galaxies from stardust.', imgSrc: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=star' },
  { id: 'l3', set: 'genesis', name: 'Titan of the Deep', rarity: 'Legendary', element: 'Water', hp: 200, attack: 'Tsunami', dmg: 160, ability: 'Flood: Washes away all bench cards, forcing a reset.', flavor: 'Sleeps at the bottom of the Mariana Trench.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=titan' },

  { id: 'gx1', set: 'genesis', name: 'Alpha Genesis GX', rarity: 'GX', element: 'Cosmic', hp: 280, attack: 'Omega Burst', dmg: 220, ability: 'GX Rule: When knocked out, opponent takes 2 Prize cards.', flavor: 'The primordial force that birthed the elements.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=alpha' },

  // --- SET 2: AWAKENING ---
  { id: 'a_c1', set: 'awakening', name: 'Spore Fiend', rarity: 'Common', element: 'Earth', hp: 45, attack: 'Leech', dmg: 15, ability: 'Heals self for 5 HP per hit.', flavor: 'Thrives in damp, dark caves.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=spore' },
  { id: 'a_c2', set: 'awakening', name: 'Aqua Pup', rarity: 'Common', element: 'Water', hp: 35, attack: 'Bite', dmg: 20, ability: 'Agile: Hard to hit.', flavor: 'A loyal companion of the sea.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=aquapup' },
  { id: 'a_c3', set: 'awakening', name: 'Ember Sprite', rarity: 'Common', element: 'Fire', hp: 30, attack: 'Cinder', dmg: 25, ability: 'Volatile: Explodes on death.', flavor: 'Leaves tiny scorch marks everywhere.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=ember' },
  { id: 'a_c4', set: 'awakening', name: 'Static Bug', rarity: 'Common', element: 'Electric', hp: 40, attack: 'Zap', dmg: 15, ability: 'Swarm: +5 DMG for each bug on bench.', flavor: 'Attracted to high-voltage lines.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=bug' },
  { id: 'a_c5', set: 'awakening', name: 'Alloy Drone', rarity: 'Common', element: 'Steel', hp: 60, attack: 'Ram', dmg: 10, ability: 'Sturdy: Cannot be 1-hit KO\'d.', flavor: 'Mass produced for heavy labor.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=alloy' },
  
  { id: 'a_r1', set: 'awakening', name: 'Forest Guardian', rarity: 'Rare', element: 'Earth', hp: 110, attack: 'Root Smash', dmg: 40, ability: 'Photosynthesis: Heals 10 HP every turn.', flavor: 'Ancient protector of the old woods.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=guardian' },
  { id: 'a_r2', set: 'awakening', name: 'Tidal Serpent', rarity: 'Rare', element: 'Water', hp: 95, attack: 'Aqua Tail', dmg: 55, ability: 'Slippery: Ignores enemy abilities.', flavor: 'Rules the treacherous coral reefs.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=serpent' },
  { id: 'a_r3', set: 'awakening', name: 'Flame Knight', rarity: 'Rare', element: 'Fire', hp: 100, attack: 'Blazing Sword', dmg: 60, ability: 'Honor: Does double DMG if you have fewer prizes.', flavor: 'Sworn to the order of the burning sun.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=flameknight' },
  
  { id: 'a_e1', set: 'awakening', name: 'Thunder Wyrm', rarity: 'Epic', element: 'Electric', hp: 130, attack: 'Lightning Breath', dmg: 90, ability: 'Paralyze: Enemy misses next turn 50% of the time.', flavor: 'Storm clouds gather where it flies.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=wyrm' },
  { id: 'a_e2', set: 'awakening', name: 'Abyssal Warden', rarity: 'Epic', element: 'Dark', hp: 150, attack: 'Soul Drain', dmg: 75, ability: 'Dark Aura: All non-Dark cards lose 10 Max HP.', flavor: 'Keeper of the deepest dungeon.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=warden' },
  
  { id: 'a_l1', set: 'awakening', name: 'Solar Dragon', rarity: 'Legendary', element: 'Light', hp: 190, attack: 'Solar Beam', dmg: 140, ability: 'Purify: Clears all negative effects from your team.', flavor: 'Breathes life-giving warmth across the land.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=solardragon' },

  { id: 'a_gx1', set: 'awakening', name: 'Eclipse Necromancer GX', rarity: 'GX', element: 'Dark', hp: 260, attack: 'Shadow Oblivion', dmg: 200, ability: 'GX Rule: When knocked out, opponent takes 2 Prize cards.', flavor: 'Raises the fallen to block out the sun.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=necro' },

  // --- SET 3: VOIDFALL ---
  { id: 'v_c1', set: 'voidfall', name: 'Void Slime', rarity: 'Common', element: 'Dark', hp: 50, attack: 'Absorb', dmg: 10, ability: 'Heals 10 HP every turn.', flavor: 'A puddle of pure dark matter.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=voidslime' },
  { id: 'v_c2', set: 'voidfall', name: 'Cosmic Dust', rarity: 'Common', element: 'Cosmic', hp: 30, attack: 'Sparkle', dmg: 20, ability: 'Confuse: 10% chance enemy misses.', flavor: 'Remnants of a dead star.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=cosmicdust' },
  { id: 'v_c3', set: 'voidfall', name: 'Ghost Lantern', rarity: 'Common', element: 'Ghost', hp: 40, attack: 'Flicker', dmg: 25, ability: 'Spook: Enemy cannot use abilities next turn.', flavor: 'Guides lost souls to the abyss.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=lantern' },
  { id: 'v_c4', set: 'voidfall', name: 'Meteor Hound', rarity: 'Common', element: 'Earth', hp: 60, attack: 'Crater Bite', dmg: 20, ability: 'Tough: Takes 5 less damage.', flavor: 'Forged in the heart of a falling meteor.', imgSrc: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=meteorhound' },
  { id: 'v_c5', set: 'voidfall', name: 'Lunar Moth', rarity: 'Common', element: 'Wind', hp: 35, attack: 'Moon Gust', dmg: 15, ability: 'Evade: 20% dodge chance.', flavor: 'Only flies under a full moon.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=lunarmoth' },
  
  { id: 'v_r1', set: 'voidfall', name: 'Astral Knight', rarity: 'Rare', element: 'Steel', hp: 100, attack: 'Star Slash', dmg: 50, ability: 'Armor: Blocks 10 damage per attack.', flavor: 'A guardian of the cosmic gates.', imgSrc: 'https://api.dicebear.com/9.x/adventurer/svg?seed=astralknight' },
  { id: 'v_r2', set: 'voidfall', name: 'Poltergeist', rarity: 'Rare', element: 'Ghost', hp: 80, attack: 'Telekinesis', dmg: 60, ability: 'Haunt: Deals 10 damage to enemy bench.', flavor: 'Throws whatever it can find.', imgSrc: 'https://api.dicebear.com/9.x/lorelei/svg?seed=poltergeist' },
  { id: 'v_r3', set: 'voidfall', name: 'Starfire Elemental', rarity: 'Rare', element: 'Fire', hp: 90, attack: 'Nova Blast', dmg: 70, ability: 'Overheat: Takes 10 damage after attacking.', flavor: 'Burns brighter than a supernova.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=starfire' },
  
  { id: 'v_e1', set: 'voidfall', name: 'Event Horizon', rarity: 'Epic', element: 'Dark', hp: 140, attack: 'Gravity Crush', dmg: 85, ability: 'Pull: Forces enemy to swap active card.', flavor: 'Nothing escapes its grasp.', imgSrc: 'https://api.dicebear.com/9.x/shapes/svg?seed=eventhorizon' },
  { id: 'v_e2', set: 'voidfall', name: 'Supernova Spirit', rarity: 'Epic', element: 'Light', hp: 120, attack: 'Blinding Flash', dmg: 90, ability: 'Radiance: Heals all benched allies for 10.', flavor: 'The spectacular end of a massive star.', imgSrc: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=supernovaspirit' },
  
  { id: 'v_l1', set: 'voidfall', name: 'Void Leviathan', rarity: 'Legendary', element: 'Water', hp: 200, attack: 'Abyssal Maw', dmg: 130, ability: 'Consume: Instantly destroys any card under 40 HP.', flavor: 'Swallows entire planets whole.', imgSrc: 'https://api.dicebear.com/9.x/bottts/svg?seed=voidleviathan' },

  { id: 'v_gx1', set: 'voidfall', name: 'Chaos Bringer GX', rarity: 'GX', element: 'Dark', hp: 290, attack: 'Annihilation', dmg: 240, ability: 'GX Rule: When knocked out, opponent takes 2 Prize cards.', flavor: 'The embodiment of universal entropy.', imgSrc: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=chaosbringer' }
];

const CHARACTERS = [...ENERGY_CARDS, ...COMBAT_CHARACTERS];

const PACKS = [
  {
    id: 'p1', name: 'Genesis Premium Pack', description: '8 Cards. Guarantees 1 Epic & 1 Rare. Features Alpha Genesis GX!',
    cost: 500, cardCount: 8, color: 'from-amber-600 via-yellow-700 to-amber-900',
    dropRates: { Common: 0.50, Rare: 0.34, Epic: 0.12, Legendary: 0.03, GX: 0.01 },
    guaranteed: ['Epic', 'Rare'],
    set: 'genesis' 
  },
  {
    id: 'p2', name: 'Awakening Booster', description: '5 Cards. New elements emerge! Features Eclipse Necromancer GX!',
    cost: 300, cardCount: 5, color: 'from-cyan-700 via-blue-800 to-indigo-950',
    dropRates: { Common: 0.58, Rare: 0.28, Epic: 0.10, Legendary: 0.03, GX: 0.01 },
    guaranteed: ['Rare'],
    set: 'awakening' 
  },
  {
    id: 'p3', name: 'Voidfall Booster', description: '6 Cards. Embrace the darkness! Features Chaos Bringer GX!',
    cost: 400, cardCount: 6, color: 'from-fuchsia-800 via-purple-900 to-slate-950',
    dropRates: { Common: 0.55, Rare: 0.30, Epic: 0.11, Legendary: 0.03, GX: 0.01 },
    guaranteed: ['Rare'],
    set: 'voidfall' 
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

// Ensure we strictly follow the mandated paths to avoid 7-segment or permission errors
// Add .replace(/\//g, '_') to scrub any slashes out of the app ID!
const appId = typeof __app_id !== 'undefined' ? String(__app_id).replace(/\//g, '_') : 'mythic-pulls-live';

const getMatchesCol = (db) => collection(db, 'artifacts', appId, 'public', 'data', 'matches');
const getSaveDocRef = (db, uid) => doc(db, 'artifacts', appId, 'users', uid, 'savedata', 'game');

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
    let possible = setCards.filter(c => c.rarity === rarity);
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

  const selectionRing = isSelected ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-stone-900 scale-105' : '';

  if (card.isEnergy) {
    return (
      <div className={`relative cursor-pointer group perspective-1000 ${dims} ${selectionRing}`} onClick={onClick} style={{ perspective: '1000px' }}>
        <div className={`w-full h-full absolute transition-transform duration-500 preserve-3d shadow-xl rounded-2xl ${!isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: !isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          <div className={`absolute w-full h-full backface-hidden rounded-2xl border-[4px] sm:border-[6px] border-stone-800 bg-gradient-to-br ${elementStyle.artBg} flex flex-col items-center justify-between py-4 sm:py-8 shadow-inner`} style={{ backfaceVisibility: 'hidden' }}>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
             {size !== 'mini' && <h3 className={`font-black uppercase tracking-[0.3em] text-white/90 drop-shadow-md ${size === 'large' ? 'text-3xl mt-4' : 'text-[0.65rem] sm:text-xs'}`}>ENERGY</h3>}
             <div className={`bg-white/20 p-2 sm:p-6 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.4)] backdrop-blur-md border border-white/40 group-hover:scale-110 transition-transform duration-300`}>
                <ElementIcon className={`${size === 'large' ? 'w-32 h-32' : size === 'small' ? 'w-10 h-10' : 'w-6 h-6'} text-white drop-shadow-md`} />
             </div>
             {size !== 'mini' && <h4 className={`font-black uppercase tracking-[0.4em] text-white/80 drop-shadow-md mb-2 ${size === 'large' ? 'text-2xl' : 'text-[0.55rem] sm:text-[0.65rem]'}`}>{card.element}</h4>}
          </div>
          <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-amber-900 via-stone-900 to-black border-4 sm:border-[6px] border-amber-600/50 rounded-2xl flex items-center justify-center shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
             <Layers className={`${size === 'large' ? 'w-24 h-24' : 'w-6 h-6 sm:w-10 sm:h-10'} text-amber-500 drop-shadow-md`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative cursor-pointer group perspective-1000 ${dims} ${selectionRing}`} onClick={onClick} style={{ perspective: '1000px' }}>
      <div className={`w-full h-full absolute transition-transform duration-500 preserve-3d shadow-xl rounded-2xl ${!isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: !isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        
        {/* Front */}
        <div className={`absolute w-full h-full backface-hidden rounded-2xl ${rarityStyle.outerBg} p-[3px] sm:p-1.5 ${size === 'large' ? 'shadow-[0_0_40px_rgba(0,0,0,0.6)]' : ''}`} style={{ backfaceVisibility: 'hidden' }}>
          <div className={`relative w-full h-full rounded-xl bg-gradient-to-br ${rarityStyle.bg} flex flex-col overflow-hidden border-2 sm:border-4 ${rarityStyle.border}`}>
            {rarityStyle.foil && <div className={`absolute inset-0 z-20 pointer-events-none mix-blend-overlay opacity-70 ${rarityStyle.foil}`}></div>}

            {/* Header */}
            <div className={`flex justify-between items-center ${padding} bg-white/50 backdrop-blur-sm border-b-2 ${rarityStyle.border}`}>
              <h3 className={`font-black uppercase tracking-tighter ${rarityStyle.color || 'text-black'} ${size === 'large' ? 'text-2xl sm:text-3xl' : size === 'small' ? 'text-[0.6rem] sm:text-[0.8rem]' : 'text-[0.4rem] sm:text-[0.5rem]'} truncate max-w-[70%]`}>{card.name}</h3>
              <div className="flex items-center space-x-1 font-black text-red-700 shrink-0">
                {size !== 'mini' && <span>{card.hp} HP</span>}
                <div className="rounded-full bg-white p-0.5 shadow-sm">
                  <ElementIcon className={`${elementIconSize} ${elementStyle.color}`} />
                </div>
              </div>
            </div>

            {/* Art */}
            <div className={`flex-1 m-1 sm:m-2 border-2 ${rarityStyle.border} bg-gradient-to-br ${elementStyle.artBg} shadow-inner flex items-center justify-center relative overflow-hidden rounded-md`}>
              <div className={`${iconSize} z-10 relative drop-shadow-md group-hover:scale-105 transition-transform duration-300`}>
                <img src={card.imgSrc} alt={card.name} className={`w-full h-full object-contain ${elementStyle.imgFilter}`} />
              </div>
            </div>

            {/* In Battle Overlays */}
            {inBattle && (
               <>
                 <div className="absolute top-1 left-1 right-1 bg-black/60 rounded-full h-2 sm:h-3 overflow-hidden z-30 border border-white/20 backdrop-blur-sm">
                    <div className={`h-full transition-all duration-300 ${card.currentHp > card.hp * 0.5 ? 'bg-green-500' : card.currentHp > card.hp * 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, (card.currentHp / card.hp) * 100)}%` }}></div>
                 </div>
                 {card.attachedEnergy > 0 && (
                   <div className="absolute bottom-[35%] right-2 flex flex-col gap-1 z-30">
                     {[...Array(card.attachedEnergy)].map((_, i) => (
                       <div key={i} className="w-4 h-4 sm:w-6 sm:h-6 bg-white rounded-full border-2 border-stone-800 flex items-center justify-center shadow-lg">
                         <ZapIcon className="w-2 h-2 sm:w-3 sm:h-3 text-emerald-500" />
                       </div>
                     ))}
                   </div>
                 )}
               </>
            )}

            {/* Footer / Stats */}
            {size !== 'mini' && (
              <div className={`bg-white/90 flex flex-col ${padding}`}>
                <div className="flex justify-between items-center font-black">
                  <span className={`flex items-center gap-1 sm:gap-2 ${size === 'large' ? 'text-xl' : 'text-[0.5rem] sm:text-[0.65rem]'}`}>
                     <Swords className={elementIconSize} /> {card.attack}
                  </span>
                  <div className="flex flex-col items-end leading-none text-rose-500">
                    <span className={`${size === 'large' ? 'text-3xl' : 'text-[0.75rem] sm:text-xs'}`}>{card.dmg}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-amber-900 via-stone-900 to-black border-4 sm:border-[6px] border-amber-600/50 rounded-2xl flex items-center justify-center shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <Layers className={`${size === 'large' ? 'w-24 h-24' : 'w-6 h-6 sm:w-10 sm:h-10'} text-amber-500 drop-shadow-md`} />
        </div>
      </div>
    </div>
  );
};


// --- BATTLE ARENA COMPONENT ---
const BattleArena = ({ playerDeckIds, onWin, onLose, onExit }) => {
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
      const base = CHARACTERS.find(c => c.id === id);
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
    while (!botHasBasic && attempts < 15) {
       let bDeckIds = [];
       for(let i=0; i<10; i++) bDeckIds.push(ENERGY_CARDS[Math.floor(Math.random() * ENERGY_CARDS.length)].id);
       for(let i=0; i<20; i++) bDeckIds.push(COMBAT_CHARACTERS[Math.floor(Math.random() * COMBAT_CHARACTERS.length)].id);
       
       bDeck = createBattleDeck(bDeckIds);
       bHand = bDeck.slice(0, 7);
       bDeck = bDeck.slice(7);
       if (bHand.some(c => !c.isEnergy)) botHasBasic = true;
       attempts++;
    }

    setPlayer({ deck: pDeck, hand: pHand, bench: [], active: null, prizes: 3, energyAttachedThisTurn: false, hasDrawnThisTurn: false });
    setBot({ deck: bDeck, hand: bHand, bench: [], active: null, prizes: 3 });
    setLog(["Battle started! Choose a Basic Character."]);
    
  }, [playerDeckIds]);

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

        let newHand = [];
        for (let card of currentBot.hand) {
          if (!card.isEnergy && currentBot.bench.length < 5) {
             if (!currentBot.active) {
                currentBot.active = card;
                addToLog(`Bot promoted ${card.name} to Active.`);
             } else {
                currentBot.bench.push(card);
                addToLog(`Bot played ${card.name} to bench.`);
             }
          } else {
             newHand.push(card);
          }
        }
        currentBot.hand = newHand;
        setBot({...currentBot});
        await new Promise(r => setTimeout(r, 1000));

        let energyIndex = currentBot.hand.findIndex(c => c.isEnergy);
        if (energyIndex >= 0) {
           if (currentBot.active && currentBot.active.attachedEnergy < 2) {
               currentBot.active.attachedEnergy += 1;
               currentBot.hand.splice(energyIndex, 1);
               addToLog(`Bot attached Energy to ${currentBot.active.name}.`);
           } else if (currentBot.bench.length > 0) {
               currentBot.bench[0].attachedEnergy += 1;
               currentBot.hand.splice(energyIndex, 1);
               addToLog(`Bot attached Energy to benched ${currentBot.bench[0].name}.`);
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
       setPlayer(p => {
         let newHand = [...p.hand];
         newHand.splice(index, 1);
         return { ...p, hand: newHand, active: { ...p.active, attachedEnergy: p.active.attachedEnergy + 1 }, energyAttachedThisTurn: true };
       });
       addToLog(`Attached Energy to ${player.active.name}.`);
       setSelectedHandCard(null);
    }
    else if (area === 'benchCard' && card.isEnergy && benchIndex !== null && !player.energyAttachedThisTurn && gameState === 'playerTurn') {
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
    if (gameState !== 'playerTurn' || !player.active || !bot.active) return;
    if (!player.hasDrawnThisTurn) {
       alert("You must DRAW a card first! Click your deck.");
       return;
    }
    if (player.active.attachedEnergy < 1) {
       alert("Requires at least 1 Energy attached to attack!");
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
       if (!player.hasDrawnThisTurn) {
          alert("You must DRAW a card before ending your turn! Click your deck.");
          return;
       }
       addToLog("Player passed turn.");
       setGameState('botTurn');
    }
  };

  useEffect(() => {
    if (gameState === 'setup' && bot && !bot.active && bot.hand.length > 0) {
       let currentBot = { ...bot, hand: [...bot.hand] };
       let combatCards = currentBot.hand.filter(c => !c.isEnergy);
       if (combatCards.length > 0) {
          currentBot.active = combatCards[0];
          currentBot.hand = currentBot.hand.filter(c => c.instanceId !== combatCards[0].instanceId);
          setBot(currentBot);
          if (player && player.active) setGameState('playerTurn');
       }
    }
  }, [bot, gameState, player]);

  if (!player || !bot) {
    return <div className="flex-1 flex flex-col items-center justify-center">
       <Sparkles className="w-16 h-16 text-amber-500 animate-spin" />
       <p className="text-stone-400 mt-4 font-bold tracking-widest">SHUFFLING DECKS...</p>
    </div>;
  }

  if (gameState === 'gameOver') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
         <h2 className={`text-6xl font-black mb-8 tracking-[0.3em] drop-shadow-2xl ${winner === 'player' ? 'text-amber-400' : 'text-stone-500'}`}>
           {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
         </h2>
         <p className="text-xl text-stone-300 mb-12">
           {winner === 'player' ? 'You crushed the AI! +500 Coins' : 'The AI bested you. +50 Coins'}
         </p>
         <button onClick={() => { winner === 'player' ? onWin() : onLose(); onExit(); }} className="px-12 py-4 bg-amber-600 text-white font-black tracking-widest rounded-full hover:bg-amber-500 hover:scale-105 shadow-2xl">
            COLLECT REWARD
         </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-900 border-4 border-stone-800 rounded-[2rem] overflow-y-auto shadow-2xl max-h-[85vh] custom-scrollbar">
      
      {/* BOT SIDE */}
      <div className="flex-1 min-h-[280px] shrink-0 bg-stone-950/80 border-b border-stone-800 p-4 flex flex-col relative">
         <div className="absolute top-4 left-4 flex gap-4">
            <div className="w-10 sm:w-12 aspect-[2.5/3.6] bg-gradient-to-br from-stone-800 to-black border-2 border-stone-600 rounded flex flex-col items-center justify-center shadow-md">
               <Layers className="w-4 h-4 text-stone-500 opacity-50" />
               <span className="text-stone-400 font-black text-[0.6rem] mt-1">{bot.deck.length}</span>
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-stone-500 font-bold text-[0.6rem] uppercase">Prizes</span>
               <div className="flex gap-1">
                  {[...Array(Math.max(0, bot.prizes))].map((_, i) => <div key={i} className="w-6 h-10 bg-amber-600/50 border border-amber-500 rounded shadow-md backface-hidden" style={{ transform: 'rotateY(180deg)' }}></div>)}
               </div>
            </div>
         </div>

         <div className="absolute top-4 right-4 flex gap-1">
            <span className="text-stone-500 font-bold text-xs uppercase mr-2 mt-1">Bot Hand ({bot.hand.length})</span>
            {[...Array(Math.min(bot.hand.length, 5))].map((_, i) => <div key={i} className="w-6 h-10 bg-stone-700 rounded border border-stone-600 shadow-sm"></div>)}
         </div>

         <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex gap-2 mb-4 h-24">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-16 h-24 border-2 border-stone-800 rounded-lg flex items-center justify-center bg-stone-900/50">
                    {bot.bench[i] && <TCGCard card={bot.bench[i]} size="mini" inBattle={true} />}
                 </div>
               ))}
            </div>
            <div className="w-28 h-40 border-2 border-amber-900/50 rounded-xl flex items-center justify-center bg-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
               {bot.active ? <TCGCard card={bot.active} size="small" inBattle={true} /> : <span className="text-stone-700 text-xs">NO ACTIVE</span>}
            </div>
         </div>
      </div>

      {/* MIDFIELD */}
      <div className="h-16 shrink-0 bg-stone-800 flex justify-between items-center px-6 border-y-2 border-stone-950 shadow-inner z-10">
         <div className="flex items-center space-x-3 text-sm">
           <span className={`px-3 py-1 rounded font-black tracking-widest text-xs ${gameState === 'playerTurn' ? 'bg-amber-500 text-stone-900' : 'bg-stone-700 text-stone-400'}`}>YOUR TURN</span>
           <span className={`px-3 py-1 rounded font-black tracking-widest text-xs ${gameState === 'botTurn' ? 'bg-red-500 text-stone-900' : 'bg-stone-700 text-stone-400'}`}>BOT TURN</span>
         </div>
         
         <div className="text-stone-300 font-mono text-xs w-1/3 truncate text-center">
            &gt; {log[log.length - 1]}
         </div>

         <div className="flex space-x-2">
           <button onClick={handleDraw} disabled={gameState !== 'playerTurn' || player.hasDrawnThisTurn} className="px-4 sm:px-6 py-1.5 bg-blue-600 disabled:bg-stone-700 text-white font-black rounded-lg shadow-md hover:bg-blue-500 transition-colors flex items-center gap-2 text-xs sm:text-base">
              <Layers className="w-4 h-4" /> DRAW
           </button>
           <button onClick={handleAttack} disabled={gameState !== 'playerTurn' || !player.active || player.active.attachedEnergy < 1 || !player.hasDrawnThisTurn} className="px-4 sm:px-6 py-1.5 bg-rose-600 disabled:bg-stone-700 text-white font-black rounded-lg shadow-md hover:bg-rose-500 transition-colors flex items-center gap-2 text-xs sm:text-base">
              <Swords className="w-4 h-4" /> ATTACK
           </button>
           <button onClick={passTurn} disabled={gameState !== 'playerTurn' || !player.hasDrawnThisTurn} className="px-4 sm:px-6 py-1.5 bg-stone-600 disabled:bg-stone-700 text-white font-bold rounded-lg hover:bg-stone-500 transition-colors text-xs sm:text-base">
              PASS
           </button>
         </div>
      </div>

      {/* PLAYER SIDE */}
      <div className="flex-[1.5] min-h-[420px] shrink-0 bg-stone-900 p-4 flex flex-col justify-between relative">
         <div className="absolute bottom-4 left-4 flex flex-col items-center">
            <div 
               className={`w-14 sm:w-20 aspect-[2.5/3.6] bg-gradient-to-br from-amber-900 to-black border-4 border-amber-600/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:-translate-y-2 transition-transform shadow-xl ${gameState === 'playerTurn' && !player.hasDrawnThisTurn ? 'ring-4 ring-blue-500 animate-pulse' : ''}`}
               onClick={handleDraw}
            >
               <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 opacity-50" />
               <span className="text-stone-400 font-black text-[0.6rem] sm:text-xs mt-1">{player.deck.length}</span>
            </div>
            <span className="text-stone-500 text-[0.6rem] font-bold mt-1 uppercase">Deck (Click)</span>
         </div>

         <div className="absolute bottom-4 right-4 flex flex-col items-end">
            <span className="text-amber-500 font-bold text-xs uppercase mb-1">Prizes</span>
            <div className="flex gap-1">
               {[...Array(Math.max(0, player.prizes))].map((_, i) => <div key={i} className="w-8 h-12 bg-amber-600 border border-amber-400 rounded shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>)}
            </div>
         </div>
         
         <div className="flex-1 flex flex-col items-center justify-start mt-2">
            <div 
               className={`w-28 h-40 border-2 rounded-xl flex items-center justify-center shadow-2xl mb-4 transition-colors cursor-pointer ${!player.active && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-amber-400 bg-amber-900/20' : player.active && selectedHandCard?.card.isEnergy && !player.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20' : 'border-amber-900/50 bg-stone-950'}`}
               onClick={() => handlePlayAreaClick('active')}
            >
               {player.active ? <TCGCard card={player.active} size="small" inBattle={true} /> : <span className="text-stone-600 text-xs font-bold text-center p-2 uppercase">Play Active<br/>Character</span>}
            </div>
            
            <div className="flex gap-2 h-24">
               {[...Array(5)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-16 h-24 border-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                     !player.bench[i] && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-amber-400/50 bg-amber-900/10' : 
                     player.bench[i] && selectedHandCard?.card.isEnergy && !player.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20' :
                     'border-stone-800 bg-stone-900/50'
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

         <div className="h-32 shrink-0 flex justify-center items-end pb-2 mt-4">
            {player.hand.map((card, idx) => (
               <div key={card.instanceId} className="w-24 sm:w-28 transition-transform duration-200 hover:-translate-y-4" style={{ marginLeft: idx === 0 ? 0 : '-1.5rem', zIndex: idx }}>
                 <TCGCard 
                   card={card} 
                   size="small" 
                   isFlipped={true} 
                   isSelected={selectedHandCard?.index === idx}
                   onClick={() => handleHandCardClick(card, idx)} 
                 />
               </div>
            ))}
            {player.hand.length === 0 && <span className="text-stone-600 italic">Hand is empty</span>}
         </div>
      </div>
    </div>
  );
};


// --- ONLINE BATTLE ARENA COMPONENT ---
const OnlineBattleArena = ({ playerDeckIds, onWin, onLose, onExit, user, db, setDbError }) => {
  const [matchId, setMatchId] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHandCard, setSelectedHandCard] = useState(null);

  const createBattleDeck = (idArray) => {
    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);
    return shuffle(idArray).map(id => {
      const base = CHARACTERS.find(c => c.id === id);
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

  const findMatch = async () => {
    setIsSearching(true);
    try {
        const matchesCol = getMatchesCol(db);
        const snap = await getDocs(matchesCol); 
        const waitingMatches = snap.docs.filter(d => d.data().status === 'waiting' && d.data().hostId !== user.uid);
        
        if (waitingMatches.length > 0) {
            const matchDoc = waitingMatches[0];
            await updateDoc(doc(matchesCol, matchDoc.id), {
                guestId: user.uid,
                status: 'playing',
                [`players.${user.uid}`]: initializePlayerState(playerDeckIds),
                log: [...matchDoc.data().log, "A Challenger appeared!"]
            });
            setMatchId(matchDoc.id);
        } else {
            const newMatchRef = doc(matchesCol);
            await setDoc(newMatchRef, {
                hostId: user.uid,
                guestId: null,
                status: 'waiting',
                turn: user.uid,
                players: { [user.uid]: initializePlayerState(playerDeckIds) },
                log: ["Waiting for opponent..."],
                winner: null
            });
            setMatchId(newMatchRef.id);
        }
    } catch(e) { 
        console.error("Matchmaking Error:", e); 
        setIsSearching(false); 
        if (e.message?.toLowerCase().includes('permission') || e.code === 'permission-denied') {
            setDbError(true);
        } else {
            alert("Matchmaking failed."); 
        }
    }
  };

  useEffect(() => {
    if (!matchId) return;
    const unsub = onSnapshot(doc(getMatchesCol(db), matchId), (snap) => {
        if (snap.exists()) {
            setMatchData(snap.data());
        } else {
            setMatchData(null);
            setMatchId(null);
            setIsSearching(false);
            alert("Match ended abruptly.");
        }
    }, (err) => console.error(err));
    return () => unsub();
  }, [matchId, db]);

  const updateMatch = async (updates) => {
     try {
         await updateDoc(doc(getMatchesCol(db), matchId), updates);
     } catch (e) { console.error("Sync failed", e); }
  };

  if (!matchId) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
           <Zap className="w-24 h-24 text-fuchsia-500 drop-shadow-[0_0_20px_rgba(217,70,239,0.5)]" />
           <h2 className="text-4xl font-black tracking-widest text-white">ONLINE ARENA</h2>
           <p className="text-stone-400">Battle real players. Win 1,000 Coins.</p>
           <button onClick={findMatch} disabled={isSearching} className="mt-4 px-10 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full font-black tracking-widest text-white transition-all shadow-[0_0_30px_rgba(192,38,211,0.4)] disabled:opacity-50 hover:scale-105">
              {isSearching ? 'SEARCHING...' : 'FIND MATCH'}
           </button>
        </div>
     );
  }

  if (matchData?.status === 'waiting') {
     return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
           <Sparkles className="w-16 h-16 text-fuchsia-500 animate-spin" />
           <h2 className="text-3xl font-black tracking-widest text-white animate-pulse">WAITING FOR CHALLENGER...</h2>
        </div>
     );
  }

  if (!matchData?.players || !matchData.players[user.uid]) return null;

  const me = matchData.players[user.uid];
  const opponentId = matchData.hostId === user.uid ? matchData.guestId : matchData.hostId;
  const opponent = opponentId ? matchData.players[opponentId] : null;
  const isMyTurn = matchData.turn === user.uid && matchData.status === 'playing';

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
    if (!isMyTurn || !me.active || !opponent?.active) return;
    if (!me.hasDrawnThisTurn) { alert("You must DRAW first!"); return; }
    if (me.active.attachedEnergy < 1) { alert("Need Energy!"); return; }

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
    if (!isMyTurn || !me.hasDrawnThisTurn) { alert("Draw a card first!"); return; }
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
         await deleteDoc(doc(getMatchesCol(db), matchId));
     }
     setMatchId(null);
     onExit();
  };

  if (matchData.status === 'gameover') {
    const isWinner = matchData.winner === user.uid;
    return (
      <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
         <h2 className={`text-6xl font-black mb-8 tracking-[0.3em] drop-shadow-2xl ${isWinner ? 'text-fuchsia-400' : 'text-stone-500'}`}>
           {isWinner ? 'ONLINE VICTORY' : 'DEFEAT'}
         </h2>
         <p className="text-xl text-stone-300 mb-12">
           {isWinner ? 'You proved your dominance! +1000 Coins' : 'You were outmatched. +100 Coins'}
         </p>
         <button onClick={() => { isWinner ? onWin() : onLose(); leaveMatch(); }} className="px-12 py-4 bg-fuchsia-600 text-white font-black tracking-widest rounded-full hover:bg-fuchsia-500 shadow-2xl">
            COLLECT REWARD
         </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-900 border-4 border-fuchsia-900/50 rounded-[2rem] overflow-y-auto shadow-2xl max-h-[85vh] custom-scrollbar relative">
      <button onClick={leaveMatch} className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1 bg-red-600/80 text-white text-xs font-bold rounded-full hover:bg-red-500">FORFEIT</button>

      {/* OPPONENT SIDE */}
      <div className="flex-1 min-h-[280px] shrink-0 bg-stone-950/80 border-b border-stone-800 p-4 flex flex-col relative">
         <div className="absolute top-4 left-4 flex gap-4">
            <div className="w-10 sm:w-12 aspect-[2.5/3.6] bg-gradient-to-br from-fuchsia-900/40 to-black border-2 border-stone-600 rounded flex flex-col items-center justify-center shadow-md">
               <Layers className="w-4 h-4 text-fuchsia-500/50" />
               <span className="text-stone-400 font-black text-[0.6rem] mt-1">{opponent?.deck?.length || 0}</span>
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-stone-500 font-bold text-[0.6rem] uppercase">Prizes</span>
               <div className="flex gap-1">
                  {[...Array(Math.max(0, opponent?.prizes || 0))].map((_, i) => <div key={i} className="w-6 h-10 bg-fuchsia-600/50 border border-fuchsia-500 rounded shadow-md backface-hidden"></div>)}
               </div>
            </div>
         </div>
         <div className="absolute top-4 right-4 flex gap-1">
            <span className="text-stone-500 font-bold text-xs uppercase mr-2 mt-1">Opp Hand</span>
            {[...Array(Math.min(opponent?.hand?.length || 0, 5))].map((_, i) => <div key={i} className="w-6 h-10 bg-stone-700 rounded border border-stone-600 shadow-sm"></div>)}
         </div>

         <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex gap-2 mb-4 h-24">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-16 h-24 border-2 border-stone-800 rounded-lg flex items-center justify-center bg-stone-900/50">
                    {opponent?.bench?.[i] && <TCGCard card={opponent.bench[i]} size="mini" inBattle={true} />}
                 </div>
               ))}
            </div>
            <div className="w-28 h-40 border-2 border-fuchsia-900/50 rounded-xl flex items-center justify-center bg-stone-950 shadow-[0_0_20px_rgba(192,38,211,0.1)]">
               {opponent?.active ? <TCGCard card={opponent.active} size="small" inBattle={true} /> : <span className="text-stone-700 text-xs text-center">WAITING ON OPPONENT</span>}
            </div>
         </div>
      </div>

      {/* MIDFIELD */}
      <div className="h-16 shrink-0 bg-stone-800 flex justify-between items-center px-6 border-y-2 border-stone-950 shadow-inner z-10">
         <div className="flex items-center space-x-3 text-sm">
           <span className={`px-3 py-1 rounded font-black tracking-widest text-xs ${isMyTurn ? 'bg-fuchsia-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.8)]' : 'bg-stone-700 text-stone-400'}`}>YOUR TURN</span>
           <span className={`px-3 py-1 rounded font-black tracking-widest text-xs ${!isMyTurn ? 'bg-red-500 text-white' : 'bg-stone-700 text-stone-400'}`}>OPP TURN</span>
         </div>
         <div className="text-stone-300 font-mono text-xs w-1/3 truncate text-center">
            &gt; {matchData.log[matchData.log.length - 1]}
         </div>
         <div className="flex space-x-2">
           <button onClick={handleDraw} disabled={!isMyTurn || me.hasDrawnThisTurn} className="px-4 sm:px-6 py-1.5 bg-blue-600 disabled:bg-stone-700 text-white font-black rounded-lg shadow-md hover:bg-blue-500 flex items-center gap-2 text-xs sm:text-base"><Layers className="w-4 h-4" /> DRAW</button>
           <button onClick={handleAttack} disabled={!isMyTurn || !me.active || me.active.attachedEnergy < 1 || !me.hasDrawnThisTurn} className="px-4 sm:px-6 py-1.5 bg-rose-600 disabled:bg-stone-700 text-white font-black rounded-lg shadow-md hover:bg-rose-500 flex items-center gap-2 text-xs sm:text-base"><Swords className="w-4 h-4" /> ATTACK</button>
           <button onClick={passTurn} disabled={!isMyTurn || !me.hasDrawnThisTurn} className="px-4 sm:px-6 py-1.5 bg-stone-600 disabled:bg-stone-700 text-white font-bold rounded-lg hover:bg-stone-500 text-xs sm:text-base">PASS</button>
         </div>
      </div>

      {/* PLAYER SIDE */}
      <div className="flex-[1.5] min-h-[420px] shrink-0 bg-stone-900 p-4 flex flex-col justify-between relative">
         <div className="absolute bottom-4 left-4 flex flex-col items-center">
            <div className={`w-14 sm:w-20 aspect-[2.5/3.6] bg-gradient-to-br from-fuchsia-900/60 to-black border-4 border-fuchsia-600/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:-translate-y-2 transition-transform shadow-xl ${isMyTurn && !me.hasDrawnThisTurn ? 'ring-4 ring-blue-500 animate-pulse' : ''}`} onClick={handleDraw}>
               <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-fuchsia-500 opacity-50" />
               <span className="text-stone-400 font-black text-[0.6rem] sm:text-xs mt-1">{me.deck.length}</span>
            </div>
            <span className="text-stone-500 text-[0.6rem] font-bold mt-1 uppercase">Deck (Click)</span>
         </div>
         <div className="absolute bottom-4 right-4 flex flex-col items-end">
            <span className="text-fuchsia-500 font-bold text-xs uppercase mb-1">Prizes</span>
            <div className="flex gap-1">
               {[...Array(Math.max(0, me.prizes))].map((_, i) => <div key={i} className="w-8 h-12 bg-fuchsia-600 border border-fuchsia-400 rounded shadow-[0_0_10px_rgba(217,70,239,0.5)]"></div>)}
            </div>
         </div>
         
         <div className="flex-1 flex flex-col items-center justify-start mt-2">
            <div 
               className={`w-28 h-40 border-2 rounded-xl flex items-center justify-center shadow-2xl mb-4 transition-colors cursor-pointer ${!me.active && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-fuchsia-400 bg-fuchsia-900/20' : me.active && selectedHandCard?.card.isEnergy && !me.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20' : 'border-stone-700 bg-stone-950'}`}
               onClick={() => handlePlayAreaClick('active')}
            >
               {me.active ? <TCGCard card={me.active} size="small" inBattle={true} /> : <span className="text-stone-600 text-xs font-bold text-center p-2 uppercase">Play Active</span>}
            </div>
            <div className="flex gap-2 h-24">
               {[...Array(5)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-16 h-24 border-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${!me.bench[i] && selectedHandCard && !selectedHandCard.card.isEnergy ? 'border-fuchsia-400/50 bg-fuchsia-900/10' : me.bench[i] && selectedHandCard?.card.isEnergy && !me.energyAttachedThisTurn ? 'border-emerald-400 bg-emerald-900/20' : 'border-stone-800 bg-stone-900/50'}`}
                   onClick={() => me.bench[i] && selectedHandCard?.card.isEnergy ? handlePlayAreaClick('benchCard', i) : me.bench[i] ? handleBenchPromote(i) : handlePlayAreaClick('bench')}
                 >
                    {me.bench[i] ? <TCGCard card={me.bench[i]} size="mini" inBattle={true} /> : null}
                 </div>
               ))}
            </div>
         </div>
         <div className="h-32 shrink-0 flex justify-center items-end pb-2 mt-4">
            {me.hand.map((card, idx) => (
               <div key={card.instanceId} className="w-24 sm:w-28 transition-transform duration-200 hover:-translate-y-4" style={{ marginLeft: idx === 0 ? 0 : '-1.5rem', zIndex: idx }}>
                 <TCGCard card={card} size="small" isFlipped={true} isSelected={selectedHandCard?.index === idx} onClick={() => setSelectedHandCard(selectedHandCard?.index === idx ? null : { card, index: idx })} />
               </div>
            ))}
            {me.hand.length === 0 && <span className="text-stone-600 italic">Hand is empty</span>}
         </div>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [coins, setCoins] = useState(2500);
  const [collection, setCollection] = useState(INITIAL_COLLECTION);
  const [deck, setDeck] = useState(STARTER_DECK); 
  const [activeTab, setActiveTab] = useState('shop'); 
  const [showRules, setShowRules] = useState(false);
  
  // Cloud Save States
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dbError, setDbError] = useState(false);

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
        alert("Login failed!\n\nError Details: " + e.message + "\n\nMake sure you added 'relthecreator.github.io' to your Authorized Domains in the Firebase Console!");
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

  const buyPack = (pack) => {
    if (coins >= pack.cost) {
      setCoins(prev => prev - pack.cost);
      const pulled = openPack(pack);
      setCurrentCards(pulled);
      setActiveCardIndex(0);
      setIsCardRevealed(false);
      setShowSummary(false);
      setActivePackName(pack.name);
      setActiveTab('opening');
      
      setCollection(prev => {
        const newCol = { ...prev };
        pulled.forEach(card => {
          newCol[card.id] = (newCol[card.id] || 0) + 1;
        });
        return newCol;
      });
    }
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

  // --- RENDERING SCREENS ---

  if (dbError) {
      return (
         <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-white p-8 text-center overflow-y-auto">
            <AlertCircle className="w-24 h-24 text-rose-500 mb-6" />
            <h1 className="text-4xl font-black text-rose-500 mb-4">DATABASE LOCKED!</h1>
            <p className="text-xl text-stone-300 max-w-2xl mb-8">
               Your Firebase Database is currently blocking the game from saving or matching players. You need to update your Firestore Security Rules.
            </p>
            <div className="bg-stone-900 border-2 border-stone-700 p-6 rounded-2xl text-left max-w-2xl shadow-2xl">
               <h3 className="text-amber-500 font-bold mb-4 text-xl tracking-widest">HOW TO UNLOCK IT:</h3>
               <ol className="list-decimal pl-5 text-stone-300 space-y-4 font-medium">
                  <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline font-black">Firebase Console</a>.</li>
                  <li>Click on <strong>Firestore Database</strong> in the left-hand menu.</li>
                  <li>Click the <strong>Rules</strong> tab at the top of the database screen.</li>
                  <li>Delete the code in there, and paste exactly this code:</li>
                  <pre className="bg-black p-4 mt-2 rounded-xl text-emerald-400 font-mono text-sm sm:text-base border border-stone-800">
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
        <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-white p-4">
           <Layers className="w-20 h-20 text-amber-500 mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
           <h1 className="text-4xl sm:text-6xl font-black text-amber-500 tracking-widest mb-4 drop-shadow-lg text-center">MYTHIC PULLS</h1>
           <p className="text-stone-400 mb-12 text-center max-w-md text-sm sm:text-lg">Sign in to save your collection, coins, and battle decks to the cloud!</p>
           <button onClick={handleGoogleLogin} className="px-6 py-4 sm:px-8 bg-white text-stone-950 font-black rounded-full flex items-center gap-3 hover:bg-stone-200 transition-transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
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
     return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-amber-500 font-black tracking-[0.2em]">LOADING SAVE DATA...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col">
      
      {/* Rulebook Modal */}
      {showRules && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border-2 border-amber-500 p-8 rounded-[2rem] max-w-2xl w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] relative max-h-[90vh] overflow-y-auto custom-scrollbar">
             <button onClick={() => setShowRules(false)} className="absolute top-4 right-6 text-2xl font-black text-stone-500 hover:text-white transition-colors">X</button>
             <h2 className="text-3xl font-black text-amber-500 mb-6 tracking-widest flex items-center gap-3"><BookOpen /> HOW TO PLAY</h2>
             <ul className="space-y-4 text-stone-300 text-lg">
                <li><span className="text-amber-500 font-bold">1. Setup:</span> Draw 7 cards. Play a Basic Character to the Active slot.</li>
                <li><span className="text-amber-500 font-bold">2. The Turn:</span> You <strong className="text-white">must DRAW a card</strong> by clicking your deck at the start of every turn.</li>
                <li><span className="text-amber-500 font-bold">3. Energy:</span> You can attach <strong className="text-white">ONE Energy card per turn</strong> to your Active <em className="text-white">OR Benched</em> characters.</li>
                <li><span className="text-amber-500 font-bold">4. Bench:</span> You can have up to 5 characters on your bench. Click a benched character to promote it if your active spot is empty.</li>
                <li><span className="text-amber-500 font-bold">5. Attacking:</span> Attacking requires at least 1 Energy. It deals damage and automatically ends your turn.</li>
                <li><span className="text-amber-500 font-bold">6. Prizes & GX Rule:</span> Knock out an enemy to take 1 Prize Card. But beware—knocking out a <strong className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400">GX Character</strong> gives <strong className="text-white">2 Prize Cards!</strong></li>
                <li><span className="text-amber-500 font-bold">7. Winning:</span> Take all 3 of your Prize Cards, or outlast your opponent so they run out of cards to draw.</li>
             </ul>
          </div>
        </div>
      )}

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none flex justify-center items-center opacity-30 z-0">
        <div className="w-[1000px] h-[1000px] bg-amber-900/10 blur-[150px] rounded-full mix-blend-screen"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl bg-stone-900/80 backdrop-blur-xl border border-stone-800/60 p-2 sm:p-3 rounded-full z-50 shadow-2xl flex justify-between items-center">
        <div className="flex items-center space-x-2 pl-4 sm:pl-6">
          <Layers className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" />
          <h1 className="text-lg sm:text-2xl font-black text-white tracking-[0.2em] hidden lg:block">
            MYTHIC
          </h1>
        </div>
        
        <div className="flex space-x-1 sm:space-x-2 bg-stone-950/60 p-1.5 sm:p-2 rounded-full border border-stone-800/80 shadow-inner overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('shop')} className={`flex items-center space-x-2 px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'shop' ? 'bg-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}>
            <Store className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden md:inline">SHOP</span>
          </button>
          <button onClick={() => setActiveTab('collection')} className={`flex items-center space-x-2 px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'collection' ? 'bg-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}>
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden md:inline">BINDER</span>
          </button>
          <button onClick={() => setActiveTab('deck')} className={`flex items-center space-x-2 px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'deck' ? 'bg-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}>
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden md:inline">DECK</span>
          </button>
          <button onClick={() => setActiveTab('battle')} className={`flex items-center space-x-2 px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'battle' ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.5)]' : 'text-stone-400 hover:text-rose-400 hover:bg-stone-800'}`}>
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden md:inline">BATTLE</span>
          </button>
          <button onClick={() => setActiveTab('online')} className={`flex items-center space-x-2 px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-widest transition-all whitespace-nowrap ${activeTab === 'online' ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(192,38,211,0.5)]' : 'text-stone-400 hover:text-fuchsia-400 hover:bg-stone-800'}`}>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden md:inline">ONLINE</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 bg-stone-950 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full border border-amber-900/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] mr-1 sm:mr-2">
          <button onClick={() => setShowRules(true)} className="text-amber-500 hover:text-amber-300 transition-colors hidden sm:block" title="How to Play">
             <BookOpen className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-stone-800 mx-1 hidden sm:block"></div>
          <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
          <span className="font-bold text-amber-400 font-mono text-sm sm:text-lg">{coins.toLocaleString()}</span>
          <div className="w-px h-6 bg-stone-800 mx-1"></div>
          <button onClick={handleLogout} className="text-stone-500 hover:text-rose-500 transition-colors" title="Sign Out">
             <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </nav>

      <main className="pt-28 sm:pt-32 p-4 sm:p-10 flex-1 flex flex-col relative z-10 max-w-[90rem] mx-auto w-full">
        
        {/* SHOP VIEW */}
        {activeTab === 'shop' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col items-center justify-center pb-10">
            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-4xl sm:text-6xl font-black text-white mb-4 sm:mb-6 tracking-tighter drop-shadow-2xl">SHOP</h2>
              <p className="text-stone-400 text-lg sm:text-xl max-w-2xl mx-auto px-4">Pull mythic heroes. Gather elemental energy. Construct an unbeatable deck.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl w-full gap-8 px-4">
              {PACKS.map(pack => (
                <div key={pack.id} className="group relative bg-stone-900/80 backdrop-blur-md border border-stone-700/50 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-amber-500/50 transition-all hover:-translate-y-3 duration-300">
                  <div className={`h-48 sm:h-56 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] ${pack.color} flex items-center justify-center p-6 sm:p-8 text-center relative overflow-hidden`}>
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
                     <h3 className="text-3xl sm:text-4xl font-black text-white tracking-[0.2em] shadow-black drop-shadow-[0_6px_6px_rgba(0,0,0,0.8)] z-10 flex flex-col items-center">
                        <Layers className="w-12 h-12 sm:w-16 sm:h-16 mb-4 text-white drop-shadow-xl opacity-80" />
                        {pack.name}
                     </h3>
                  </div>
                  <div className="p-6 sm:p-10 flex flex-col h-[calc(100%-14rem)] justify-between">
                    <p className="text-stone-300 font-bold mb-6 sm:mb-8 text-center text-base sm:text-lg">{pack.description}</p>
                    
                    <button 
                      onClick={() => buyPack(pack)}
                      disabled={coins < pack.cost}
                      className={`w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl tracking-[0.2em] flex items-center justify-center space-x-4 transition-all ${
                        coins >= pack.cost 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_30px_rgba(217,119,6,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)]' 
                          : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                      }`}
                    >
                      <span>PURCHASE</span>
                      <div className="flex items-center bg-black/40 px-3 sm:px-4 py-1.5 rounded-xl">
                        <Coins className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-yellow-500" />
                        {pack.cost}
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OPENING VIEW */}
        {activeTab === 'opening' && (
           <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 relative">
           <div className="text-center mb-10">
             <h2 className="text-2xl sm:text-3xl font-black text-amber-500 tracking-[0.2em] drop-shadow-lg">{activePackName}</h2>
             {!showSummary && (
                <div className="mt-4 sm:mt-6 flex items-center justify-center space-x-2 sm:space-x-4">
                  {[...Array(currentCards.length)].map((_, i) => (
                    <div key={i} className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${i === activeCardIndex ? 'w-8 sm:w-12 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]' : i < activeCardIndex ? 'w-3 sm:w-4 bg-stone-700' : 'w-3 sm:w-4 bg-stone-800'}`} />
                  ))}
                </div>
             )}
           </div>
           
           {!showSummary ? (
             <div className="flex flex-col items-center justify-center relative mt-2 sm:mt-6">
               <div className="animate-in slide-in-from-bottom-10 fade-in duration-300">
                 <TCGCard key={activeCardIndex} card={currentCards[activeCardIndex]} isFlipped={isCardRevealed} size="large" onClick={handleCardInteraction} />
               </div>
               <div className="h-20 mt-10 sm:mt-14">
                 {isCardRevealed ? (
                   <button onClick={handleCardInteraction} className="px-10 py-4 bg-amber-500 text-stone-950 font-black tracking-[0.2em] text-base sm:text-lg rounded-full hover:bg-amber-400 hover:scale-105 transition-all shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                     {activeCardIndex < currentCards.length - 1 ? 'NEXT CARD' : 'FINISH'}
                   </button>
                 ) : (
                   <p className="text-stone-400 animate-pulse font-black tracking-[0.3em] text-base sm:text-lg uppercase mt-4">Tap to reveal</p>
                 )}
               </div>
             </div>
           ) : (
             <div className="w-full max-w-7xl animate-in zoom-in-95 duration-500 flex flex-col items-center pb-16">
               <h3 className="text-3xl sm:text-5xl font-black text-white mb-10 sm:mb-16 tracking-[0.3em] text-center drop-shadow-2xl">SUMMARY</h3>
               <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-12 sm:mb-20">
                 {currentCards.map((card, index) => (
                   <div key={card.instanceId} className="animate-in slide-in-from-bottom-12 fade-in hover:-translate-y-4 sm:hover:-translate-y-6 transition-transform duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                     <TCGCard card={card} isFlipped={true} size="small" />
                   </div>
                 ))}
               </div>
               <button onClick={() => setActiveTab('shop')} className="px-10 sm:px-14 py-4 sm:py-5 bg-amber-600 text-white font-black text-lg sm:text-xl tracking-[0.2em] rounded-full hover:bg-amber-500 hover:scale-105 transition-all shadow-[0_0_40px_rgba(217,119,6,0.5)] border border-amber-400">
                 RETURN TO SHOP
               </button>
             </div>
           )}
         </div>
        )}

        {/* COLLECTION VIEW */}
        {activeTab === 'collection' && (
           <div className="animate-in fade-in duration-500">
           <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-8 sm:mb-12 border-b border-stone-800 pb-6 sm:pb-8">
             <div className="text-center sm:text-left">
               <h2 className="text-4xl sm:text-5xl font-black text-white mb-2 sm:mb-4 tracking-tighter">CARD BINDER</h2>
               <p className="text-amber-500 font-black tracking-[0.2em] text-xs sm:text-base">
                 {Object.keys(collection).length} / {CHARACTERS.length} UNIQUE CARDS
               </p>
             </div>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-8 lg:gap-10 pb-24">
             {CHARACTERS.map(char => {
               const count = collection[char.id] || 0;
               const isOwned = count > 0;
               return (
                 <div key={char.id} className="relative group">
                   {isOwned && (
                     <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-stone-800 text-white border-2 border-amber-500 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black shadow-2xl z-20 transform group-hover:scale-110 transition-transform text-sm sm:text-lg">
                       {count}
                     </div>
                   )}
                   <div className={`transition-all duration-300 ${!isOwned ? 'opacity-30 grayscale blur-[2px] hover:blur-none hover:opacity-50' : 'hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]'}`}>
                      {isOwned ? <TCGCard card={char} size="small" isFlipped={true} /> : (
                        <div className="w-full aspect-[2.5/3.6] bg-stone-900 border-2 border-dashed border-stone-700 rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                           <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-stone-800 mb-2 sm:mb-4" />
                           <span className="text-xs sm:text-sm text-stone-600 font-bold tracking-widest">LOCKED</span>
                        </div>
                      )}
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
        )}

        {/* DECK VIEW */}
        {activeTab === 'deck' && (() => {
          const deckChars = deck.map(id => CHARACTERS.find(c => c.id === id)).filter(Boolean);
          const combatChars = deckChars.filter(c => !c.isEnergy);
          return (
          <div className="animate-in fade-in duration-500 flex flex-col pb-20">
            <div className="mb-6 sm:mb-10 border-b border-stone-800 pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-6">
               <div>
                 <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter flex items-center gap-4">BATTLE DECK</h2>
               </div>
               <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border-2 flex items-center gap-3 font-black tracking-widest shadow-xl transition-colors ${deck.length === MAX_DECK_SIZE ? 'bg-amber-500 text-stone-950 border-amber-400' : 'bg-stone-900 text-stone-400 border-stone-700'}`}>
                 <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                 <span>{deck.length} / {MAX_DECK_SIZE}</span>
               </div>
            </div>

            <div className="flex flex-col-reverse lg:flex-row gap-8 xl:gap-14">
              <div className="flex-1 bg-stone-900/30 backdrop-blur-sm border border-stone-800/80 rounded-[2rem] p-4 sm:p-10 flex flex-col shadow-inner">
                <h3 className="text-sm sm:text-lg font-black text-stone-500 mb-6 sm:mb-8 tracking-[0.2em] uppercase flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> Available Collection
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
                  {CHARACTERS.map(char => {
                    const ownedCount = collection[char.id] || 0;
                    if (ownedCount === 0) return null; 
                    const inDeckCount = deck.filter(id => id === char.id).length;
                    const availableCount = ownedCount - inDeckCount;
                    const canAdd = availableCount > 0 && deck.length < MAX_DECK_SIZE;
                    return (
                      <div key={char.id} className={`relative transition-all duration-300 ${canAdd ? 'cursor-pointer hover:-translate-y-2 sm:hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(245,158,11,0.2)]' : 'opacity-40 cursor-not-allowed grayscale'}`} onClick={() => canAdd && addToDeck(char.id)}>
                        <div className={`absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-black z-20 shadow-2xl border-2 ${canAdd ? 'bg-amber-500 text-stone-900 border-amber-300' : 'bg-stone-800 text-stone-500 border-stone-600'}`}>
                          {availableCount}
                        </div>
                        <TCGCard card={char} size="small" isFlipped={true} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full lg:w-[400px] xl:w-[500px] bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-900/40 shadow-[0_0_50px_rgba(245,158,11,0.1)] rounded-[2rem] p-4 sm:p-8 flex flex-col shrink-0 lg:sticky lg:top-32 h-fit max-h-[calc(100vh-140px)]">
                <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">
                   <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 sm:gap-4">
                      {[...Array(MAX_DECK_SIZE)].map((_, index) => {
                        const cardId = deck[index];
                        if (cardId) {
                           const char = CHARACTERS.find(c => c.id === cardId);
                           return (
                             <div key={`slot-${index}-${cardId}`} className="relative cursor-pointer hover:scale-[0.96] transition-transform group" onClick={() => removeFromDeck(index)}>
                               <div className="absolute inset-0 bg-red-950/80 z-30 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-[2px] border-2 border-red-500/50">
                                 <Skull className="w-6 h-6 sm:w-10 sm:h-10 text-red-500 drop-shadow-lg" />
                               </div>
                               <TCGCard card={char} size="small" isFlipped={true} />
                             </div>
                           );
                        } else {
                           return (
                             <div key={`empty-${index}`} className="w-full aspect-[2.5/3.6] bg-stone-950/40 border-2 border-dashed border-stone-700 rounded-2xl flex flex-col items-center justify-center p-2 text-center group">
                               <span className="text-stone-800 font-black text-xl sm:text-2xl opacity-40 group-hover:text-amber-900/60 transition-colors">{index + 1}</span>
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

        {/* BATTLE VIEW */}
        {activeTab === 'battle' && (
          <div className="animate-in fade-in duration-500 flex-1 flex flex-col">
             {deck.length < 30 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                   <ShieldAlert className="w-24 h-24 text-rose-500/50 animate-pulse" />
                   <h2 className="text-4xl font-black tracking-widest text-white">DECK INCOMPLETE</h2>
                   <p className="text-stone-400">You need exactly 30 cards in your deck to enter the Battle Arena.</p>
                   <button onClick={() => setActiveTab('deck')} className="mt-4 px-8 py-3 bg-stone-800 hover:bg-stone-700 rounded-full font-bold text-white transition-colors">Go to Deck Builder</button>
                </div>
             ) : (
                <BattleArena 
                  playerDeckIds={deck} 
                  onWin={() => setCoins(c => c + 500)} 
                  onLose={() => setCoins(c => c + 50)} 
                  onExit={() => setActiveTab('shop')} 
                />
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
                   <p className="text-stone-400">You need exactly 30 cards in your deck to play online.</p>
                   <button onClick={() => setActiveTab('deck')} className="mt-4 px-8 py-3 bg-stone-800 hover:bg-stone-700 rounded-full font-bold text-white transition-colors">Go to Deck Builder</button>
                </div>
             ) : (
                <OnlineBattleArena 
                  playerDeckIds={deck} 
                  onWin={() => setCoins(c => c + 1000)} 
                  onLose={() => setCoins(c => c + 100)} 
                  onExit={() => setActiveTab('shop')} 
                  user={user}
                  db={db}
                  setDbError={setDbError}
                />
             )}
          </div>
        )}

      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(28, 25, 23, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.4); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}