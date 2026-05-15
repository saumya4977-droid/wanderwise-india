export type Audience = "Kids" | "Elders" | "Students" | "Teachers" | "Youth" | "Families";
export type Region = "North" | "West" | "South" | "East" | "Central";
export type Category = "Heritage" | "Nature" | "Adventure" | "Spiritual" | "Beach" | "Wildlife" | "Hill Station" | "Culture";

export interface Place {
  name: string;
  category: Category;
  audiences: Audience[];
  blurb: string;
}
export interface SeasonGuide {
  best: string;
  current: { tempC: number; humidity: number; wind: number; condition: string };
  notes: string;
}
export interface Transport {
  auto: string;
  bus: string;
  taxi: string;
  flightFrom?: string;
}
export interface Stay {
  budget: { name: string; price: string };
  mid: { name: string; price: string };
  luxury: { name: string; price: string };
}

export interface City {
  slug: string;
  name: string;
  state: string;
  region: Region;
  tagline: string;
  vibe: string[];
  hero: string;
  weather: SeasonGuide;
  places: Place[];
  transport: Transport;
  stay: Stay;
  audiences: Audience[];
}

import north from "@/assets/region-north.jpg";
import west from "@/assets/region-west.jpg";
import south from "@/assets/region-south.jpg";
import east from "@/assets/region-east.jpg";
import central from "@/assets/region-central.jpg";

export const regionImage: Record<Region, string> = {
  North: north, West: west, South: south, East: east, Central: central,
};

const cityList = [
  // NORTH
  ["manali","Manali","Himachal Pradesh","North","Snow, adventure & alpine pine","Adventure","Hill Station", ["Kids","Youth","Families","Students"]],
  ["shimla","Shimla","Himachal Pradesh","North","Colonial charm & the toy train","Heritage","Hill Station", ["Elders","Families","Kids"]],
  ["spiti","Spiti Valley","Himachal Pradesh","North","Raw, rugged, monastery-blessed","Adventure","Spiritual", ["Youth","Students"]],
  ["nainital","Nainital","Uttarakhand","North","A peaceful lake town that breathes slow","Nature","Hill Station", ["Elders","Families"]],
  ["rishikesh","Rishikesh","Uttarakhand","North","Yoga, the Ganga & river rafting","Spiritual","Adventure", ["Youth","Students","Teachers"]],
  ["auli","Auli","Uttarakhand","North","India's quiet ski capital","Adventure", "Hill Station",["Youth","Families"]],
  ["jaipur","Jaipur","Rajasthan","North","The Pink City of palaces and courtyards","Heritage","Culture", ["Families","Students","Teachers","Elders"]],
  ["udaipur","Udaipur","Rajasthan","North","City of lakes & lamplit balconies","Heritage","Culture", ["Families","Elders","Youth"]],
  ["jaisalmer","Jaisalmer","Rajasthan","North","Sand dunes, camels & a golden fort","Heritage","Adventure", ["Youth","Families","Students"]],
  ["amritsar","Amritsar","Punjab","North","The Golden Temple & langar of belonging","Spiritual","Culture", ["Families","Elders","Teachers"]],
  ["agra","Agra","Uttar Pradesh","North","The Taj at dawn — a love letter in marble","Heritage","Culture", ["Families","Students","Teachers","Elders"]],
  ["varanasi","Varanasi","Uttar Pradesh","North","Where India prays, sings & lets go","Spiritual","Heritage", ["Elders","Teachers","Students"]],
  ["ladakh","Ladakh","Ladakh","North","High-altitude desert of monasteries & blue lakes","Adventure","Spiritual", ["Youth","Students"]],

  // WEST
  ["baga","Baga Beach, Goa","Goa","West","Goa's loud, neon-lit nightlife strip","Beach","Adventure", ["Youth"]],
  ["palolem","Palolem, Goa","Goa","West","South Goa's slow, calm crescent","Beach","Nature", ["Families","Elders","Youth"]],
  ["mumbai","Mumbai","Maharashtra","West","City of dreams, Bollywood & bhel","Culture","Heritage", ["Youth","Students","Families"]],
  ["lonavala","Lonavala","Maharashtra","West","Monsoon waterfalls a weekend away","Nature","Hill Station", ["Families","Kids","Youth"]],
  ["mahabaleshwar","Mahabaleshwar","Maharashtra","West","Strawberry farms & cool ghats","Nature","Hill Station", ["Families","Elders"]],

  // SOUTH
  ["munnar","Munnar","Kerala","South","Tea gardens combed into the misty hills","Nature","Hill Station", ["Families","Elders","Youth"]],
  ["alleppey","Alleppey","Kerala","South","Houseboat nights on the backwaters","Nature","Culture", ["Families","Elders","Youth"]],
  ["kochi","Kochi","Kerala","South","A spice-port history written in pastel walls","Heritage","Culture", ["Teachers","Students","Families"]],
  ["ooty","Ooty","Tamil Nadu","South","Cool weather and a famous toy train","Hill Station","Nature", ["Families","Kids","Elders"]],
  ["kodaikanal","Kodaikanal","Tamil Nadu","South","Mist on the lake, pine on the breeze","Hill Station","Nature", ["Families","Youth"]],
  ["darjeeling","Darjeeling","West Bengal","South","First-flush tea & a glimpse of Kanchenjunga","Hill Station","Heritage", ["Elders","Families","Teachers"]],

  // EAST
  ["gangtok","Gangtok","Sikkim","East","Mountain capital of monasteries & momos","Culture","Hill Station", ["Families","Youth"]],
  ["tsomgo","Tsomgo Lake","Sikkim","East","A sacred glacial lake at 12,400 ft","Nature","Spiritual", ["Youth","Families"]],
  ["shillong","Shillong","Meghalaya","East","Scotland of India, with rock & roll","Culture","Hill Station", ["Youth","Students"]],
  ["cherrapunji","Cherrapunji","Meghalaya","East","Living root bridges in the rain","Nature","Adventure", ["Youth","Students","Teachers"]],

  // CENTRAL
  ["khajuraho","Khajuraho","Madhya Pradesh","Central","UNESCO temples carved with extraordinary grace","Heritage","Culture", ["Teachers","Students","Elders"]],
  ["bandhavgarh","Bandhavgarh","Madhya Pradesh","Central","India's best chance to meet a tiger","Wildlife","Nature", ["Families","Kids","Youth"]],
] as const;

function buildCity(row: typeof cityList[number]): City {
  const [slug,name,state,region,tagline,catA,catB,audiencesRaw] = row;
  const audiences = audiencesRaw as unknown as Audience[];
  const r = region as Region;
  return {
    slug, name, state, region: r, tagline,
    vibe: [catA, catB] as string[],
    hero: regionImage[r],
    audiences,
    weather: {
      best: r === "North" ? "Mar–Jun & Sep–Nov" : r === "South" ? "Oct–Mar" : r === "West" ? "Nov–Feb" : r === "East" ? "Mar–May & Oct–Dec" : "Oct–Mar",
      current: {
        tempC: r === "North" ? 14 : r === "South" ? 26 : r === "West" ? 28 : r === "East" ? 18 : 24,
        humidity: r === "South" || r === "West" ? 72 : 48,
        wind: 12,
        condition: r === "North" ? "Crisp & clear" : r === "South" ? "Light showers" : r === "West" ? "Sunny" : r === "East" ? "Misty" : "Pleasant",
      },
      notes: `Plan around festivals and the monsoon window. ${r === "South" ? "Avoid Jun–Aug rains." : r === "North" ? "Winter snow Dec–Feb." : "Comfortable most of the year."}`,
    },
    places: [
      { name: `${name} Old Town Walk`, category: "Heritage", audiences: ["Elders","Teachers","Families"], blurb: "A morning ramble through the historic core." },
      { name: `${name} Viewpoint`, category: "Nature", audiences: ["Youth","Families","Kids"], blurb: "The classic sunrise/sunset spot." },
      { name: `Local Bazaar`, category: "Culture", audiences: ["Families","Students","Youth"], blurb: "Spices, textiles and chai by the cup." },
      { name: `Sacred Site`, category: "Spiritual", audiences: ["Elders","Teachers","Families"], blurb: "Quiet, reverent, photo-worthy." },
      { name: `Adventure Trail`, category: "Adventure", audiences: ["Youth","Students","Kids"], blurb: "Half-day trek or activity nearby." },
      { name: `Family Park`, category: "Nature", audiences: ["Kids","Families","Elders"], blurb: "Easy, green, gentle for everyone." },
    ],
    transport: {
      auto: "₹25 base + ₹14/km",
      bus: "₹15–₹120 (city/AC)",
      taxi: "₹150 base + ₹18/km",
      flightFrom: r === "North" ? "Delhi" : r === "South" ? "Bengaluru" : r === "West" ? "Mumbai" : r === "East" ? "Kolkata" : "Bhopal",
    },
    stay: {
      budget: { name: "Hostel / Homestay", price: "₹600–₹1,400" },
      mid: { name: "3★ Hotel / OYO Premium", price: "₹2,200–₹4,800" },
      luxury: { name: "Boutique / 5★ Resort", price: "₹8,000–₹24,000" },
    },
  };
}

export const cities: City[] = cityList.map(buildCity);
export const cityBySlug = (s: string) => cities.find(c => c.slug === s);

export const regions: Region[] = ["North","West","South","East","Central"];
export const audiences: Audience[] = ["Kids","Elders","Students","Teachers","Youth","Families"];
