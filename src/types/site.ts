export interface Banner {
  id: string;
  imageUrl: string;
  altText: string;
  clickUrl: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface SiteSettings {
  codEnabled: boolean;
  maintenanceMode: boolean;
  contactEmail: string;
  contactPhone: string;
  siteTitle?: string;
  siteDescription?: string;
  banners: Banner[];
}

export interface SiteStatus {
  isOnline: boolean;
  lastUpdated: string;
  version: string;
}
