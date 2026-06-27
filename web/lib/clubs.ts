/** NBL club colours, keyed by the club nickname (a substring of the full name).
 *  Primary/secondary are the clubs' real brand colours, harvested from the NBL
 *  API's per-team `color_primary`/`color_secondary` fields. */
const CLUB_COLORS: [match: string, primary: string, secondary: string][] = [
  ["36ers", "#182360", "#e1261c"],          // Adelaide — navy / red
  ["Bullets", "#164ca8", "#fab81b"],         // Brisbane — blue / gold
  ["Taipans", "#021d59", "#f68b1f"],         // Cairns — navy / orange
  ["Hawks", "#e11837", "#0b0b0b"],           // Illawarra — red / black
  ["United", "#05103a", "#b9c2d0"],          // Melbourne — navy / silver
  ["Breakers", "#000000", "#ffffff"],        // New Zealand — black / white
  ["Wildcats", "#d8282f", "#000000"],        // Perth — red / black
  ["Phoenix", "#69be28", "#303030"],         // South East Melbourne — green / charcoal
  ["Kings", "#5f259f", "#fec527"],           // Sydney — purple / gold
  ["JackJumpers", "#004c45", "#f4b64c"],     // Tasmania — teal / amber
];

export function clubColors(club: string): [string, string] {
  const hit = CLUB_COLORS.find(([m]) => club.includes(m));
  return hit ? [hit[1], hit[2]] : ["#26263a", "#9b9bad"];
}

/** A short 3-letter abbreviation for a club (the NBL's own team codes). */
export function clubAbbr(club: string): string {
  const map: Record<string, string> = {
    "36ers": "ADL", Bullets: "BRI", Taipans: "CNS", Hawks: "ILL", United: "MEL",
    Breakers: "NZL", Wildcats: "PER", Phoenix: "SEM", Kings: "SYD", JackJumpers: "TAS",
  };
  for (const [k, v] of Object.entries(map)) if (club.includes(k)) return v;
  return club.slice(0, 3).toUpperCase();
}
