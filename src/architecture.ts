import type { MapId } from "./maps.ts";
export interface HouseStyle {
  stories: 1 | 2;
  log: string;
  light: string;
  roof: string;
  roofLight: string;
  porch: boolean;
}
export const houseStyles: Partial<Record<MapId, HouseStyle>> = {
  CHIEF: {
    stories: 2,
    log: "#936544",
    light: "#bd9565",
    roof: "#855044",
    roofLight: "#b77b5b",
    porch: true,
  },
  FARM: {
    stories: 2,
    log: "#a47a49",
    light: "#c9a36a",
    roof: "#817046",
    roofLight: "#bca16d",
    porch: true,
  },
  RANCH: {
    stories: 1,
    log: "#8d6343",
    light: "#bc986b",
    roof: "#59776c",
    roofLight: "#85a08a",
    porch: true,
  },
  HOME: {
    stories: 1,
    log: "#a07950",
    light: "#c7a573",
    roof: "#80674e",
    roofLight: "#b79a6d",
    porch: false,
  },
  SMITH: {
    stories: 1,
    log: "#765642",
    light: "#a17b56",
    roof: "#52636b",
    roofLight: "#829295",
    porch: false,
  },
  APOTHECARY: {
    stories: 1,
    log: "#9b7855",
    light: "#c4a379",
    roof: "#4f7774",
    roofLight: "#83a79b",
    porch: true,
  },
};
