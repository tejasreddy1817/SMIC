/**
 * Geo Hierarchy — Country → State → City cascading data
 * Used for structured geo-filtering in News Script pipeline.
 */

export interface GeoCountry {
  code: string;
  name: string;
  languages: string[];
}

export interface GeoState {
  code: string;
  name: string;
  languages?: string[];
}

export interface GeoCity {
  name: string;
  languages?: string[];
}

type Hierarchy = Record<
  string,
  {
    name: string;
    languages: string[];
    states: Record<string, { name: string; languages?: string[]; cities: string[] }>;
  }
>;

const GEO_HIERARCHY: Hierarchy = {
  IN: {
    name: "India",
    languages: ["hi", "en"],
    states: {
      MH: { name: "Maharashtra", languages: ["mr", "hi"], cities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"] },
      KA: { name: "Karnataka", languages: ["kn", "en"], cities: ["Bangalore", "Mysore", "Hubli", "Mangalore"] },
      TN: { name: "Tamil Nadu", languages: ["ta", "en"], cities: ["Chennai", "Coimbatore", "Madurai", "Salem"] },
      DL: { name: "Delhi", languages: ["hi", "en"], cities: ["New Delhi", "Noida", "Gurgaon", "Faridabad"] },
      UP: { name: "Uttar Pradesh", languages: ["hi"], cities: ["Lucknow", "Kanpur", "Agra", "Varanasi", "Prayagraj"] },
      WB: { name: "West Bengal", languages: ["bn", "en"], cities: ["Kolkata", "Howrah", "Durgapur", "Siliguri"] },
      GJ: { name: "Gujarat", languages: ["gu", "hi"], cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"] },
      RJ: { name: "Rajasthan", languages: ["hi"], cities: ["Jaipur", "Jodhpur", "Udaipur", "Kota"] },
      TS: { name: "Telangana", languages: ["te", "en"], cities: ["Hyderabad", "Warangal", "Nizamabad"] },
      AP: { name: "Andhra Pradesh", languages: ["te", "en"], cities: ["Visakhapatnam", "Vijayawada", "Tirupati"] },
      KL: { name: "Kerala", languages: ["ml", "en"], cities: ["Thiruvananthapuram", "Kochi", "Kozhikode"] },
      MP: { name: "Madhya Pradesh", languages: ["hi"], cities: ["Bhopal", "Indore", "Jabalpur", "Gwalior"] },
      PB: { name: "Punjab", languages: ["pa", "hi"], cities: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar"] },
      HR: { name: "Haryana", languages: ["hi"], cities: ["Chandigarh", "Faridabad", "Gurgaon", "Panipat"] },
      BR: { name: "Bihar", languages: ["hi"], cities: ["Patna", "Gaya", "Muzaffarpur"] },
    },
  },
  US: {
    name: "United States",
    languages: ["en", "es"],
    states: {
      CA: { name: "California", cities: ["Los Angeles", "San Francisco", "San Diego", "San Jose"] },
      NY: { name: "New York", cities: ["New York City", "Buffalo", "Albany"] },
      TX: { name: "Texas", cities: ["Houston", "Dallas", "Austin", "San Antonio"] },
      FL: { name: "Florida", cities: ["Miami", "Orlando", "Tampa", "Jacksonville"] },
      IL: { name: "Illinois", cities: ["Chicago", "Springfield", "Naperville"] },
      WA: { name: "Washington", cities: ["Seattle", "Spokane", "Tacoma"] },
      MA: { name: "Massachusetts", cities: ["Boston", "Cambridge", "Worcester"] },
      GA: { name: "Georgia", cities: ["Atlanta", "Savannah", "Augusta"] },
      PA: { name: "Pennsylvania", cities: ["Philadelphia", "Pittsburgh", "Harrisburg"] },
      CO: { name: "Colorado", cities: ["Denver", "Colorado Springs", "Boulder"] },
    },
  },
  GB: {
    name: "United Kingdom",
    languages: ["en"],
    states: {
      ENG: { name: "England", cities: ["London", "Manchester", "Birmingham", "Liverpool", "Leeds"] },
      SCT: { name: "Scotland", cities: ["Edinburgh", "Glasgow", "Aberdeen"] },
      WLS: { name: "Wales", cities: ["Cardiff", "Swansea", "Newport"] },
      NIR: { name: "Northern Ireland", cities: ["Belfast", "Derry", "Lisburn"] },
    },
  },
  BR: {
    name: "Brazil",
    languages: ["pt"],
    states: {
      SP: { name: "São Paulo", cities: ["São Paulo", "Campinas", "Santos"] },
      RJ: { name: "Rio de Janeiro", cities: ["Rio de Janeiro", "Niterói", "Petrópolis"] },
      MG: { name: "Minas Gerais", cities: ["Belo Horizonte", "Uberlândia", "Juiz de Fora"] },
      BA: { name: "Bahia", cities: ["Salvador", "Feira de Santana"] },
      RS: { name: "Rio Grande do Sul", cities: ["Porto Alegre", "Caxias do Sul"] },
      PR: { name: "Paraná", cities: ["Curitiba", "Londrina", "Maringá"] },
    },
  },
  JP: {
    name: "Japan",
    languages: ["ja"],
    states: {
      TK: { name: "Tokyo", cities: ["Shibuya", "Shinjuku", "Akihabara", "Ginza"] },
      OS: { name: "Osaka", cities: ["Osaka", "Sakai", "Higashiosaka"] },
      KY: { name: "Kyoto", cities: ["Kyoto", "Uji"] },
      AI: { name: "Aichi", cities: ["Nagoya", "Toyota", "Okazaki"] },
      FK: { name: "Fukuoka", cities: ["Fukuoka", "Kitakyushu"] },
      HK: { name: "Hokkaido", cities: ["Sapporo", "Asahikawa", "Hakodate"] },
    },
  },
  NG: {
    name: "Nigeria",
    languages: ["en", "yo", "ig", "ha"],
    states: {
      LA: { name: "Lagos", languages: ["yo", "en"], cities: ["Lagos", "Ikeja", "Victoria Island"] },
      AB: { name: "Abuja FCT", cities: ["Abuja", "Gwagwalada"] },
      KN: { name: "Kano", languages: ["ha"], cities: ["Kano", "Wudil"] },
      RV: { name: "Rivers", languages: ["en"], cities: ["Port Harcourt", "Obio-Akpor"] },
      OY: { name: "Oyo", languages: ["yo"], cities: ["Ibadan", "Ogbomosho"] },
    },
  },
  DE: {
    name: "Germany",
    languages: ["de"],
    states: {
      BE: { name: "Berlin", cities: ["Berlin"] },
      BY: { name: "Bavaria", cities: ["Munich", "Nuremberg", "Augsburg"] },
      HH: { name: "Hamburg", cities: ["Hamburg"] },
      NW: { name: "North Rhine-Westphalia", cities: ["Cologne", "Düsseldorf", "Dortmund", "Essen"] },
      HE: { name: "Hesse", cities: ["Frankfurt", "Wiesbaden", "Kassel"] },
      BW: { name: "Baden-Württemberg", cities: ["Stuttgart", "Mannheim", "Karlsruhe"] },
    },
  },
  ID: {
    name: "Indonesia",
    languages: ["id"],
    states: {
      JK: { name: "Jakarta", cities: ["Jakarta", "South Jakarta", "East Jakarta"] },
      JI: { name: "East Java", cities: ["Surabaya", "Malang", "Sidoarjo"] },
      JB: { name: "West Java", cities: ["Bandung", "Bekasi", "Depok", "Bogor"] },
      BA: { name: "Bali", cities: ["Denpasar", "Ubud", "Seminyak"] },
      YO: { name: "Yogyakarta", cities: ["Yogyakarta", "Sleman"] },
    },
  },
  KR: {
    name: "South Korea",
    languages: ["ko"],
    states: {
      SE: { name: "Seoul", cities: ["Seoul", "Gangnam", "Hongdae"] },
      BS: { name: "Busan", cities: ["Busan", "Haeundae"] },
      GG: { name: "Gyeonggi", cities: ["Suwon", "Incheon", "Seongnam"] },
      DJ: { name: "Daejeon", cities: ["Daejeon"] },
      DG: { name: "Daegu", cities: ["Daegu"] },
    },
  },
  AU: {
    name: "Australia",
    languages: ["en"],
    states: {
      NSW: { name: "New South Wales", cities: ["Sydney", "Newcastle", "Wollongong"] },
      VIC: { name: "Victoria", cities: ["Melbourne", "Geelong", "Ballarat"] },
      QLD: { name: "Queensland", cities: ["Brisbane", "Gold Coast", "Cairns"] },
      WA: { name: "Western Australia", cities: ["Perth", "Fremantle"] },
      SA: { name: "South Australia", cities: ["Adelaide", "Mount Gambier"] },
    },
  },
};

// ─── Accessors ───────────────────────────────────────────────────────

export function getCountries(): GeoCountry[] {
  return Object.entries(GEO_HIERARCHY).map(([code, data]) => ({
    code,
    name: data.name,
    languages: data.languages,
  }));
}

export function getStates(countryCode: string): GeoState[] {
  const country = GEO_HIERARCHY[countryCode.toUpperCase()];
  if (!country) return [];
  return Object.entries(country.states).map(([code, data]) => ({
    code,
    name: data.name,
    languages: data.languages,
  }));
}

export function getCities(countryCode: string, stateCode: string): GeoCity[] {
  const country = GEO_HIERARCHY[countryCode.toUpperCase()];
  if (!country) return [];
  const state = country.states[stateCode.toUpperCase()];
  if (!state) return [];
  return state.cities.map((name) => ({
    name,
    languages: state.languages,
  }));
}

export function getCountryName(countryCode: string): string {
  return GEO_HIERARCHY[countryCode.toUpperCase()]?.name || countryCode;
}

export function getStateName(countryCode: string, stateCode: string): string {
  return GEO_HIERARCHY[countryCode.toUpperCase()]?.states[stateCode.toUpperCase()]?.name || stateCode;
}
