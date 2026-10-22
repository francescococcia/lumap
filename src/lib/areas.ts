export type LondonArea = {
  name: string;
  lat: number;
  lng: number;
};

export const LONDON_CENTER: LondonArea = { name: "London", lat: 51.5074, lng: -0.1278 };

export const LONDON_AREAS: LondonArea[] = [
  { name: "Old Street", lat: 51.5258, lng: -0.0877 },
  { name: "Shoreditch", lat: 51.526, lng: -0.078 },
  { name: "King's Cross", lat: 51.5308, lng: -0.1238 },
  { name: "Soho", lat: 51.5136, lng: -0.1365 },
  { name: "London Bridge", lat: 51.5055, lng: -0.0865 },
  { name: "Marylebone", lat: 51.5186, lng: -0.149 },
  { name: "Bethnal Green", lat: 51.527, lng: -0.055 },
];

export const SEARCH_RADIUS_M = 2000;
