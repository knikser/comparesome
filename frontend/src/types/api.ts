export type User = {
  id: number;
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

export type FeatureFlag = {
  key: string;
  enabled: boolean;
};

export type Settings = {
  maxVariantsPerUser: number;
};

export type Comparison = {
  id: number;
  name: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  variantsCount: number;
};

export type ComparisonParticipant = {
  userId: number;
  username: string;
};

export type VariantRating = {
  variantId: number;
  userId: number;
  username: string;
  pros: string;
  cons: string;
  rank: number;
  updatedAt: string;
};

export type Variant = {
  id: number;
  comparisonId: number;
  title: string;
  description: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  averageRank: number;
  ratingCount: number;
  ratings: VariantRating[];
};

export type ComparisonDetail = {
  comparison: Comparison;
  participants: ComparisonParticipant[];
  variants: Variant[];
};

export type DashboardVariant = {
  variantId: number;
  variantTitle: string;
  comparisonId: number;
  comparisonName: string;
  averageRank: number;
  ratingCount: number;
};

export type DashboardComparison = {
  comparison: Comparison;
  topVariants: DashboardVariant[];
};

export type DashboardData = {
  lastComparisons: DashboardComparison[];
  topRatedVariants: DashboardVariant[];
};
