import { AnimationFrame } from '../types/animation';

export interface FigmaFrame extends AnimationFrame {
  thumbnail?: string;
  elements: FigmaElement[];
  isVisible: boolean;
  isSelected: boolean;
}

export interface FigmaElement {
  id: string;
  name: string;
  type: 'text' | 'rectangle' | 'image' | 'button' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  color?: string;
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  borderRadius?: number;
  imageSrc?: string;
}

export const mockFigmaFrames: FigmaFrame[] = [
  {
    id: 'frame-1',
    name: '300x250 - Medium Rectangle',
    width: 300,
    height: 250,
    selected: true,
    isVisible: true,
    isSelected: true,
    elements: [
      {
        id: 'bg-1',
        name: 'Background',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 300,
        height: 250,
        opacity: 1,
        color: '#4A7CFF'
      },
      {
        id: 'headline-1',
        name: 'Headline',
        type: 'text',
        x: 20,
        y: 40,
        width: 260,
        height: 60,
        opacity: 1,
        content: 'Limited Time Offer',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF'
      },
      {
        id: 'subhead-1',
        name: 'Subheadline',
        type: 'text',
        x: 20,
        y: 110,
        width: 260,
        height: 40,
        opacity: 1,
        content: 'Save up to 50% on all products',
        fontSize: 16,
        color: '#E6EFFF'
      },
      {
        id: 'button-1',
        name: 'CTA Button',
        type: 'button',
        x: 20,
        y: 170,
        width: 120,
        height: 40,
        opacity: 1,
        color: '#FF5533',
        content: 'Shop Now',
        borderRadius: 4
      },
      {
        id: 'logo-1',
        name: 'Logo',
        type: 'image',
        x: 220,
        y: 170,
        width: 60,
        height: 60,
        opacity: 1,
        imageSrc: 'logo-placeholder.png'
      }
    ]
  },
  {
    id: 'frame-2',
    name: '728x90 - Leaderboard',
    width: 728,
    height: 90,
    selected: false,
    isVisible: true,
    isSelected: false,
    elements: [
      {
        id: 'bg-2',
        name: 'Background',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 728,
        height: 90,
        opacity: 1,
        color: '#333333'
      },
      {
        id: 'logo-2',
        name: 'Logo',
        type: 'image',
        x: 10,
        y: 15,
        width: 60,
        height: 60,
        opacity: 1,
        imageSrc: 'logo-placeholder.png'
      },
      {
        id: 'headline-2',
        name: 'Headline',
        type: 'text',
        x: 80,
        y: 25,
        width: 320,
        height: 40,
        opacity: 1,
        content: 'Premium Quality Products',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF'
      },
      {
        id: 'button-2',
        name: 'CTA Button',
        type: 'button',
        x: 598,
        y: 25,
        width: 120,
        height: 40,
        opacity: 1,
        color: '#4CAF50',
        content: 'Learn More',
        borderRadius: 4
      }
    ]
  },
  {
    id: 'frame-3',
    name: '160x600 - Skyscraper',
    width: 160,
    height: 600,
    selected: false,
    isVisible: true,
    isSelected: false,
    elements: [
      {
        id: 'bg-3',
        name: 'Background',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 160,
        height: 600,
        opacity: 1,
        color: '#673AB7'
      },
      {
        id: 'logo-3',
        name: 'Logo',
        type: 'image',
        x: 50,
        y: 20,
        width: 60,
        height: 60,
        opacity: 1,
        imageSrc: 'logo-placeholder.png'
      },
      {
        id: 'headline-3',
        name: 'Headline',
        type: 'text',
        x: 15,
        y: 100,
        width: 130,
        height: 100,
        opacity: 1,
        content: 'Summer Sale',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF'
      },
      {
        id: 'subhead-3',
        name: 'Subheadline',
        type: 'text',
        x: 15,
        y: 210,
        width: 130,
        height: 80,
        opacity: 1,
        content: 'Exclusive deals on all summer items',
        fontSize: 14,
        color: '#E1D5F5'
      },
      {
        id: 'button-3',
        name: 'CTA Button',
        type: 'button',
        x: 15,
        y: 500,
        width: 130,
        height: 40,
        opacity: 1,
        color: '#FF9800',
        content: 'Shop Now',
        borderRadius: 4
      }
    ]
  },
  {
    id: 'frame-4',
    name: '320x480 - Mobile Interstitial',
    width: 320,
    height: 480,
    selected: false,
    isVisible: true,
    isSelected: false,
    elements: [
      {
        id: 'bg-4',
        name: 'Background',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 320,
        height: 480,
        opacity: 1,
        color: '#009688'
      },
      {
        id: 'logo-4',
        name: 'Logo',
        type: 'image',
        x: 130,
        y: 40,
        width: 60,
        height: 60,
        opacity: 1,
        imageSrc: 'logo-placeholder.png'
      },
      {
        id: 'headline-4',
        name: 'Headline',
        type: 'text',
        x: 30,
        y: 120,
        width: 260,
        height: 80,
        opacity: 1,
        content: 'Mobile App Download',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF'
      },
      {
        id: 'subhead-4',
        name: 'Subheadline',
        type: 'text',
        x: 30,
        y: 210,
        width: 260,
        height: 60,
        opacity: 1,
        content: 'Get exclusive mobile-only deals',
        fontSize: 18,
        color: '#E0F2F1'
      },
      {
        id: 'button-4',
        name: 'CTA Button',
        type: 'button',
        x: 60,
        y: 380,
        width: 200,
        height: 50,
        opacity: 1,
        color: '#FF5722',
        content: 'Download Now',
        borderRadius: 25
      }
    ]
  }
];

export default mockFigmaFrames;