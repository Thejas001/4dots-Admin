export interface OrderAttribute {
  AttributeName: string;
  AttributeValue: string;
}

export interface Addon {
  OrderItemAddonId: number;
  OrderItemId: number;
  AddonId: number;
  AddonName: string;
  NumberOfBooks: number;
}

export interface OrderItem {
  OrderItemId: number;
  OrderId: number;
  ProductId: number | null;
  ProductName: string;
  Quantity: number;
  Price: number;
  Documents: Document[];
  Attributes: OrderAttribute[];
  DynamicAttributes: OrderAttribute[];
  Addons?: Addon[];
  IsCustomProduct: boolean;
  CustomProductName: string | null;
  CustomDescription: string | null;
  CustomBasePrice: number | null;
}

export interface Payment {
  PaymentMethod: string;
  PaymentStatus: string;
}

export interface Shipment {
  ShippingStatus: string;
  TrackingNumber?: string;
  TrackingUrl?: string;
  CourierName?: string;
}

export interface UserAddress {
  Id: number;
  Name: string;
  Address: string;
  City: string;
  Country: string;
  PinCode: string;
  IsPrimary: boolean;
  PhoneNumber?: string;
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
  UserId: string;
  UserName: string | null;
  UserAddress: UserAddress | null;
  TotalAmount: number;
  OrderStatus: string;
  CreatedAt: string;
  DeliveryType?: string;
  Payment: {
    OrderPaymentId: number;
    OrderId: number;
    PaymentMethod: string;
    PaymentStatus: string;
    PaymentDate: string;
  } | null;
  Shipment: {
    OrderShipmentId: number;
    OrderId: number;
    ShippingStatus: string;
  } | null;
  Items: OrderItem[];
  Comments: Comment[];
}

export interface OrderResponse {
  Success: boolean;
  Data: Order[];
  TotalCount: number;
  PageNumber: number;
  PageSize: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

export interface Document {
  DocumentId: number;
  DocumentUrl: string;
  FileName: string;
  ContentType: string;
} 