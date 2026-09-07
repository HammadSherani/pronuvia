import { Country } from "country-state-city";

export const CONTINENTS = ["Africa", "Americas", "Antarctica", "Asia", "Europe", "Oceania"];

// Continent → ISO country codes mapping
export const CONTINENT_CODES: Record<string, string[]> = {
  Africa: ["DZ","AO","BJ","BW","BF","BI","CM","CV","CF","TD","KM","CD","CG","CI","DJ","EG","GQ","ER","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","YT","MA","MZ","NA","NE","NG","RE","RW","SH","ST","SN","SC","SL","SO","ZA","SS","SD","SZ","TZ","TG","TN","UG","ZM","ZW"],
  Americas: ["AI","AG","AR","AW","BS","BB","BZ","BM","BO","BQ","BR","VG","CA","KY","CL","CO","CR","CU","CW","DM","DO","EC","SV","FK","GF","GL","GD","GP","GT","GY","HT","HN","JM","MQ","MX","MS","NI","PA","PY","PE","PR","BL","KN","LC","MF","PM","VC","SX","SR","TT","TC","US","UY","VE","VI"],
  Antarctica: ["AQ"],
  Asia: ["AF","AM","AZ","BH","BD","BT","BN","KH","CN","CY","GE","IN","ID","IR","IQ","IL","JP","JO","KZ","KW","KG","LA","LB","MO","MY","MV","MN","MM","NP","KP","OM","PK","PS","PH","QA","SA","SG","KR","LK","SY","TW","TJ","TH","TL","TR","TM","AE","UZ","VN","YE"],
  Europe: ["AL","AD","AT","BY","BE","BA","BG","HR","CZ","DK","EE","FI","FR","DE","GI","GR","GG","HU","IS","IE","IM","IT","JE","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","RU","SM","RS","SK","SI","ES","SJ","SE","CH","UA","GB","VA"],
  Oceania: ["AS","AU","CX","CC","CK","FJ","PF","GU","HM","KI","MH","FM","NR","NC","NZ","NU","NF","MP","PW","PG","PN","WS","SB","TK","TO","TV","UM","VU","WF"],
};

export function getCountriesForContinent(continent: string) {
  const all = Country.getAllCountries();
  if (!continent) return all;
  const codes = CONTINENT_CODES[continent];
  if (!codes) return all;
  return all.filter((c) => codes.includes(c.isoCode));
}

export function continentForCountryCode(code: string): string | null {
  const upper = code.toUpperCase();
  for (const [continent, codes] of Object.entries(CONTINENT_CODES)) {
    if (codes.includes(upper)) return continent;
  }
  return null;
}
