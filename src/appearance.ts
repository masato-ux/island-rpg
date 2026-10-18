export interface Appearance {
  age: "child" | "young" | "adult" | "elder";
  gender: "woman" | "man" | "girl" | "boy";
  hair: string;
  style:
    | "short"
    | "bun"
    | "twintails"
    | "ponytail"
    | "braid"
    | "curls"
    | "bald"
    | "long"
    | "hero";
  outfit: string;
  accent: string;
  build: number;
  height: number;
  detail: string;
}
export const appearances: Appearance[] = [
  {
    age: "young",
    gender: "man",
    hair: "#302b30",
    style: "hero",
    outfit: "#314b60",
    accent: "#528c8c",
    build: 1.02,
    height: 1.12,
    detail: "hero",
  },
  {
    age: "elder",
    gender: "man",
    hair: "#c4c0b3",
    style: "short",
    outfit: "#485d7e",
    accent: "#c0a66e",
    build: 0.94,
    height: 0.96,
    detail: "cane",
  },
  {
    age: "adult",
    gender: "woman",
    hair: "#786d65",
    style: "bun",
    outfit: "#825b7f",
    accent: "#d8c3a0",
    build: 1,
    height: 1.03,
    detail: "brooch",
  },
  {
    age: "child",
    gender: "girl",
    hair: "#805534",
    style: "twintails",
    outfit: "#c09365",
    accent: "#bd5261",
    build: 0.86,
    height: 0.7,
    detail: "ribbon",
  },
  {
    age: "adult",
    gender: "man",
    hair: "#61412c",
    style: "short",
    outfit: "#64754c",
    accent: "#b99a60",
    build: 1.15,
    height: 1.04,
    detail: "straw",
  },
  {
    age: "adult",
    gender: "woman",
    hair: "#7a4a2c",
    style: "ponytail",
    outfit: "#a56b53",
    accent: "#e0c797",
    build: 0.98,
    height: 1.01,
    detail: "kerchief",
  },
  {
    age: "child",
    gender: "boy",
    hair: "#6a422b",
    style: "short",
    outfit: "#7f9c70",
    accent: "#d6bb79",
    build: 0.85,
    height: 0.68,
    detail: "shorts",
  },
  {
    age: "adult",
    gender: "man",
    hair: "#49352c",
    style: "short",
    outfit: "#786047",
    accent: "#d2b18a",
    build: 1.24,
    height: 1.09,
    detail: "rancher",
  },
  {
    age: "adult",
    gender: "woman",
    hair: "#8b4f38",
    style: "braid",
    outfit: "#627e8b",
    accent: "#dfceb1",
    build: 1.04,
    height: 1.02,
    detail: "apron",
  },
  {
    age: "child",
    gender: "girl",
    hair: "#c49a55",
    style: "curls",
    outfit: "#769b8a",
    accent: "#e7cf81",
    build: 0.89,
    height: 0.66,
    detail: "pinafore",
  },
  {
    age: "adult",
    gender: "man",
    hair: "#4b3832",
    style: "bald",
    outfit: "#5d6268",
    accent: "#8a5b3c",
    build: 1.34,
    height: 1.1,
    detail: "smith",
  },
  {
    age: "young",
    gender: "woman",
    hair: "#423848",
    style: "long",
    outfit: "#819e91",
    accent: "#e1dfbc",
    build: 0.88,
    height: 1.08,
    detail: "herbalist",
  },
  {
    age: "elder",
    gender: "man",
    hair: "#d2ccbb",
    style: "short",
    outfit: "#526c76",
    accent: "#879d9a",
    build: 0.92,
    height: 0.92,
    detail: "fisher",
  },
];
