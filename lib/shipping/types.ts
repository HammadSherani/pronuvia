export type CarrierCode = "fedex" | "ups" | "usps";

export interface ShipAddress {
  name:     string;
  company?: string;
  street1:  string;
  street2?: string;
  city:     string;
  state:    string;
  zip:      string;
  country:  string;
  phone?:   string;
}

export interface PackageInfo {
  weightLbs: number;
  lengthIn?: number;
  widthIn?:  number;
  heightIn?: number;
}

export interface RateResult {
  carrier:       CarrierCode;
  carrierLabel:  string;
  service:       string;
  serviceCode:   string;
  totalCost:     number;
  currency:      string;
  deliveryDays?: number;
  deliveryDate?: string;
}

export interface LabelResult {
  carrier:        CarrierCode;
  carrierLabel:   string;
  service:        string;
  serviceCode:    string;
  trackingNumber: string;
  labelBase64:    string;
  labelFormat:    "PNG" | "PDF" | "GIF";
  cost:           number;
  currency:       string;
}
