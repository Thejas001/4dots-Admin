export interface OrderAttribute {
  AttributeName: string;
  AttributeValue: string;
}

export interface OrderItem {
  OrderItemId: number;
  OrderId: number;
  ProductId: number;
  ProductName: string;
  Quantity: number;
  Price: number;
  Documents: Document[];
  Attributes: OrderAttribute[];
  DynamicAttributes: OrderAttribute[];
}

export interface Payment {
  PaymentMethod: string;
  PaymentStatus: string;
}

export interface Shipment {
  ShippingStatus: string;
}

export interface Address {
  Street: string;
  City: string;
  State: string;
  Pincode: string;
  Country: string;
}

export interface Comment {
  CommentId: number;
  OrderId: number;
  Text: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Order {
  OrderId: number;
  UserId: number;
  TotalAmount: number;
  OrderStatus: string;
  CreatedAt: string;
  UpdatedAt: string;
  Payment: Payment | null;
  Shipment: Shipment | null;
  Items: OrderItem[];
  Address: Address | null;
  Comments: Comment[];
}

export interface OrderResponse {
  Success: boolean;
  Data: Order[];
}

export interface Document {
  DocumentId: number;
  DocumentUrl: string;
  FileName: string;
  ContentType: string;
} 