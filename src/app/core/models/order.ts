export interface Order {
  order_id: string;
  account_id: string;
  model_id: string;
  side: 'Sell' | 'Buy';
  ticker: string;
  asset_class: string;
  quantity: number;
  order_type: string;
  time_in_force: string;
  est_price: number;
  est_value: number;
  status: string;
  created_at: string;
}

export const ORDER_COLUMNS: (keyof Order)[] = [
  'order_id',
  'account_id',
  'model_id',
  'side',
  'ticker',
  'asset_class',
  'quantity',
  'order_type',
  'time_in_force',
  'est_price',
  'est_value',
  'status',
  'created_at',
];
