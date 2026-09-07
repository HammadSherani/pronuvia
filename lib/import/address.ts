import "server-only";
import { Country, State } from "country-state-city";

export type FlatAddress = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export function resolveCountry(input?: string): { code: string; name: string } | null {
  if (!input) return null;
  const all = Country.getAllCountries();
  const byCode = all.find((c) => c.isoCode.toLowerCase() === input.toLowerCase());
  if (byCode) return { code: byCode.isoCode, name: byCode.name };
  const byName = all.find((c) => c.name.toLowerCase() === input.toLowerCase());
  if (byName) return { code: byName.isoCode, name: byName.name };
  return null;
}

export function resolveState(input: string | undefined, countryCode: string): { code: string; name: string } {
  if (!input) return { code: "", name: "" };
  const list = State.getStatesOfCountry(countryCode);
  const byCode = list.find((s) => s.isoCode.toLowerCase() === input.toLowerCase());
  if (byCode) return { code: byCode.isoCode, name: byCode.name };
  const byName = list.find((s) => s.name.toLowerCase() === input.toLowerCase());
  if (byName) return { code: byName.isoCode, name: byName.name };
  return { code: input, name: input };
}

/**
 * Assembles the exact AddressData JSON shape used everywhere else in the app
 * (components/shared/address-fields.tsx `serializeAddress`) from flat import
 * columns. Returns null when every field is blank (no address to store).
 */
export function buildAddressJson(flat: FlatAddress): string | null {
  const hasAny = Object.values(flat).some((v) => v !== undefined && v !== "");
  if (!hasAny) return null;

  const country = resolveCountry(flat.country) ?? { code: flat.country ?? "US", name: flat.country ?? "United States" };
  const state = resolveState(flat.state, country.code);

  return JSON.stringify({
    firstName: flat.firstName ?? "",
    lastName: flat.lastName ?? "",
    phone: flat.phone ?? "",
    address1: flat.address1 ?? "",
    address2: flat.address2 ?? "",
    city: flat.city ?? "",
    state: state.code,
    stateName: state.name,
    zip: flat.zip ?? "",
    country: country.code,
    countryName: country.name,
  });
}
