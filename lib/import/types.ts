export type ImportEntity =
  | "category"
  | "subCategory"
  | "product"
  | "coupon"
  | "shippingRate"
  | "physician"
  | "salesRep"
  | "order";

export type ColumnDef = {
  key: string;
  header: string;
  aliases?: string[];
  required: boolean;
  format: string;
  example: string;
  note?: string;
};

export type RawRow = Record<string, unknown>;

export type RowResult = {
  row: number;
  status: "ok" | "error" | "skipped";
  errors?: string[];
  preview?: Record<string, unknown>;
  groupKey?: string;
};

export type ImportPreview = {
  entity: ImportEntity;
  totalRows: number;
  groups?: number;
  okCount: number;
  errorCount: number;
  results: RowResult[];
};

export type ImportSummary = {
  entity: ImportEntity;
  created: number;
  skipped: number;
  failed: number;
  results: RowResult[];
};

export type ImportOptions = {
  commit: boolean;
  rowOffset: number;
  sendEmails?: boolean;
  isLastChunk?: boolean;
};
