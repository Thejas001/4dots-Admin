import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';
import ProductPreviewModal from '@/components/ProductPreviewModal';
import toast, { Toaster } from 'react-hot-toast';

type AttributeEditor = {
  name: string;
  affectsPricing: boolean;
  values: string[];
};

type SavedAttributeValue = {
  ValueID: number;
  ValueName: string;
};

type SavedAttribute = {
  AttributeID: number;
  AttributeName: string;
  AffectsPricing: boolean;
  AttributeValues: SavedAttributeValue[];
};

type RuleDraft = {
  conditions: Array<{
    attributeId: number | '';
    attributeValueId: number | '';
  }>;
  unitPrice: string;
  priority: string;
  priceType: number;
};

type ProductDetailsResponse = {
  ProductID: number;
  ProductName: string;
  Description?: string | null;
  PricingStrategy?: number;
  UiMode?: number;
  ListingStatus?: number;
  IsEnabled?: boolean;
  Attributes?: Array<{
    AttributeID?: number;
    AttributeName: string;
    AffectsPricing?: boolean;
    AttributeValues?: SavedAttributeValue[];
    Values?: string[];
  }>;
  PricingRules?: any[];
};

type DocumentTypeOption = {
  DocumentTypeId: number;
  Code: string;
  DisplayName: string;
  MimeType?: string | null;
  Extension: string;
};

type MetaConfigResponse = {
  ProductId: number;
  UploadConfig?: {
    IsUploadMandatory?: boolean;
    MinUploads?: number | null;
    MaxUploads?: number | null;
    EnableOrderQuantity?: boolean;
    MinOrderQuantity?: number | null;
    MaxOrderQuantity?: number | null;
    EnableCustomDescription?: boolean;
    IsCustomDescriptionRequired?: boolean;
    CustomDescriptionLabel?: string | null;
    CustomDescriptionPlaceholder?: string | null;
    AllowedDocumentTypeIds?: number[];
  };
  InfoItems?: Array<{
    ProductInfoItemId?: number;
    Title?: string;
    Value?: string;
    SortOrder?: number;
    IsActive?: boolean;
  }>;
};

type InfoItemDraft = {
  key: string;
  title: string;
  value: string;
  sortOrder: string;
  isActive: boolean;
};

type ProductMediaItem = {
  ProductMediaId: number;
  ProductId: number;
  MediaType: number;
  MediaUrl: string;
  ThumbnailUrl?: string | null;
  FileName?: string | null;
  ContentType?: string | null;
  SortOrder: number;
  IsPrimary: boolean;
  IsActive: boolean;
};

type PricingValidationState = {
  priceType?: string;
  factorInput?: string;
  minFactor?: string;
  maxFactor?: string;
  uploadPolicy?: string;
  rules?: string;
};

const PRICING_STRATEGIES = [{ value: 0, label: 'Generic Matrix' }];
const UI_MODES = [
  { value: 1, label: 'Dynamic' },
  { value: 0, label: 'Dedicated' },
];
const PRICE_TYPES = [
  { value: 0, label: 'Flat' },
  { value: 1, label: 'Per Unit' },
  { value: 2, label: 'Per Area' },
  { value: 3, label: 'Per Page' },
];
const UPLOAD_COUNT_INPUT_KEY = 'UploadCount';

const createEmptyRule = (index: number): RuleDraft => ({
  conditions: [{ attributeId: '', attributeValueId: '' }],
  unitPrice: '',
  priority: String(index + 1),
  priceType: 0,
});

const normalizeRuleToken = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'UNSPECIFIED';

const isQuantityLikeInputKey = (value: string): boolean => {
  const normalized = (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized === 'quantity' || normalized === 'qty' || normalized === 'orderquantity' || normalized === 'copies' || normalized === 'copycount';
};

const buildUniqueRuleName = (tokens: string[], usedNames: Set<string>): string => {
  const base = `RULE_${tokens.map(normalizeRuleToken).join('__') || 'UNSPECIFIED'}`;
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  let suffix = 2;
  let candidate = `${base}_${suffix}`;
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
  usedNames.add(candidate);
  return candidate;
};

const dedupeCaseInsensitive = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
  }
  return result;
};

const toMetaInfoPayload = (items: InfoItemDraft[]) =>
  items
    .map((item, index) => ({
      Title: item.title.trim(),
      Value: item.value.trim(),
      SortOrder: Number(item.sortOrder || index + 1),
      IsActive: item.isActive,
    }))
    .filter((item) => item.Title.length > 0 && item.Value.length > 0);

const recoverConditionsFromRuleName = (
  ruleName: string | undefined,
  availableAttributes: SavedAttribute[],
): Array<{ attributeId: number | ''; attributeValueId: number | '' }> => {
  if (!ruleName || !ruleName.startsWith('RULE_')) return [];

  const body = ruleName.slice(5);
  const segments = body.split('__').filter(Boolean);
  const recovered: Array<{ attributeId: number | ''; attributeValueId: number | '' }> = [];

  for (const segment of segments) {
    const match = availableAttributes.find((attribute) => {
      const attrToken = normalizeRuleToken(attribute.AttributeName);
      return segment.startsWith(`${attrToken}_`);
    });
    if (!match) continue;

    const attrToken = normalizeRuleToken(match.AttributeName);
    const valueToken = segment.slice(attrToken.length + 1);
    const valueMatch = match.AttributeValues.find(
      (value) => normalizeRuleToken(value.ValueName) === valueToken,
    );
    if (!valueMatch) continue;

    if (!recovered.some((item) => item.attributeId === match.AttributeID)) {
      recovered.push({
        attributeId: match.AttributeID,
        attributeValueId: valueMatch.ValueID,
      });
    }
  }

  return recovered;
};

const recoverConditionsFromOrdinalIds = (
  conditions: Array<{ attributeId: number | ''; attributeValueId: number | '' }>,
  availableAttributes: SavedAttribute[],
): Array<{ attributeId: number | ''; attributeValueId: number | '' }> => {
  const recovered: Array<{ attributeId: number | ''; attributeValueId: number | '' }> = [];

  for (const condition of conditions) {
    if (typeof condition.attributeId !== 'number' || condition.attributeId <= 0) continue;
    if (typeof condition.attributeValueId !== 'number' || condition.attributeValueId <= 0) continue;

    const attributeById = availableAttributes.find((item) => item.AttributeID === condition.attributeId);
    if (attributeById) {
      const valueById = attributeById.AttributeValues.find((value) => value.ValueID === condition.attributeValueId);
      if (valueById) {
        recovered.push({
          attributeId: attributeById.AttributeID,
          attributeValueId: valueById.ValueID,
        });
        continue;
      }
    }

    // Backward-compatibility path: some migrated rules use 1-based ordinals
    // for attribute/value instead of persisted DB IDs.
    const attributeByOrdinal = availableAttributes[condition.attributeId - 1];
    if (!attributeByOrdinal) continue;
    const valueByOrdinal = attributeByOrdinal.AttributeValues[condition.attributeValueId - 1];
    if (!valueByOrdinal) continue;

    recovered.push({
      attributeId: attributeByOrdinal.AttributeID,
      attributeValueId: valueByOrdinal.ValueID,
    });
  }

  return recovered;
};

const readNumericField = (source: any, primaryKeys: string[], normalizedKey: string): number => {
  for (const key of primaryKeys) {
    const raw = source?.[key];
    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  const dynamicKey = Object.keys(source || {}).find(
    (key) => key.replace(/[^a-z0-9]/gi, '').toLowerCase() === normalizedKey,
  );
  if (dynamicKey) {
    const parsed = Number(source[dynamicKey]);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
};

export default function EditProductPage() {
  const router = useRouter();
  const idParam = router.query.id;
  const productId = Number(idParam);
  const hasValidId = Number.isInteger(productId) && productId > 0;



  const [loading, setLoading] = useState(true);
  const [savingBasics, setSavingBasics] = useState(false);
  const [savingAttributes, setSavingAttributes] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingStrategy, setPricingStrategy] = useState(0);
  const [uiMode, setUiMode] = useState(1);
  const [listingStatus, setListingStatus] = useState(0);
  const [isEnabled, setIsEnabled] = useState(false);

  const [attributes, setAttributes] = useState<AttributeEditor[]>([]);
  const [savedAttributes, setSavedAttributes] = useState<SavedAttribute[]>([]);
  const [attributeNameInput, setAttributeNameInput] = useState('');
  const [selectedAttributeName, setSelectedAttributeName] = useState('');
  const [attributeValueInput, setAttributeValueInput] = useState('');

  const [rules, setRules] = useState<RuleDraft[]>([createEmptyRule(0)]);
  const [replaceRules, setReplaceRules] = useState(true);
  const [priceType, setPriceType] = useState(0);
  const [multiplierMode, setMultiplierMode] = useState<'manual' | 'upload_count'>('manual');
  const [multiplierInputKey, setMultiplierInputKey] = useState('PricingFactor');
  const [minMultiplier, setMinMultiplier] = useState('');
  const [maxMultiplier, setMaxMultiplier] = useState('');
  const [pricingValidation, setPricingValidation] = useState<PricingValidationState>({});

  const [error, setError] = useState<string | null>(null);
  const [basicsMessage, setBasicsMessage] = useState<string | null>(null);
  const [attributesMessage, setAttributesMessage] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [metaMessage, setMetaMessage] = useState<string | null>(null);

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [isUploadMandatory, setIsUploadMandatory] = useState(false);
  const [minUploads, setMinUploads] = useState('');
  const [maxUploads, setMaxUploads] = useState('');
  const [enableOrderQuantity, setEnableOrderQuantity] = useState(false);
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
  const [maxOrderQuantity, setMaxOrderQuantity] = useState('');
  const [enableCustomDescription, setEnableCustomDescription] = useState(false);
  const [isCustomDescriptionRequired, setIsCustomDescriptionRequired] = useState(false);
  const [customDescriptionLabel, setCustomDescriptionLabel] = useState('');
  const [customDescriptionPlaceholder, setCustomDescriptionPlaceholder] = useState('');
  const [allowedDocumentTypeIds, setAllowedDocumentTypeIds] = useState<number[]>([]);
  const [infoItems, setInfoItems] = useState<InfoItemDraft[]>([
    { key: 'info-1', title: '', value: '', sortOrder: '1', isActive: true },
  ]);
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingImageMedia, setUploadingImageMedia] = useState(false);
  const [uploadingVideoMedia, setUploadingVideoMedia] = useState(false);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const selectedAttributeEditor = useMemo(
    () => attributes.find((attribute) => attribute.name === selectedAttributeName),
    [attributes, selectedAttributeName],
  );

  const effectivePricingStrategy = pricingStrategy === 1 ? 0 : pricingStrategy;
  const canManageMedia = effectivePricingStrategy === 0;

  const toSavedAttributes = (details: ProductDetailsResponse): SavedAttribute[] => {
    const rawAttributes = Array.isArray(details.Attributes) ? details.Attributes : [];
    return rawAttributes.map((attribute, index) => {
      const explicitValues = Array.isArray(attribute.AttributeValues) ? attribute.AttributeValues : [];
      const fallbackValues = Array.isArray(attribute.Values)
        ? attribute.Values.map((value, valueIndex) => ({
          ValueID: valueIndex + 1,
          ValueName: value,
        }))
        : [];
      return {
        AttributeID: Number(attribute.AttributeID || index + 1),
        AttributeName: attribute.AttributeName,
        AffectsPricing: attribute.AffectsPricing ?? true,
        AttributeValues: explicitValues.length > 0 ? explicitValues : fallbackValues,
      };
    });
  };

  const parseRulesFromDetails = (
    details: ProductDetailsResponse,
    availableAttributes: SavedAttribute[],
  ): RuleDraft[] => {
    const rawRules = Array.isArray(details.PricingRules) ? details.PricingRules : [];
    const parsed = rawRules
      .map((rule: any, index: number) => {
        const conditions = Array.isArray(rule?.Conditions)
          ? rule.Conditions
          : Array.isArray(rule?.conditions)
            ? rule.conditions
            : [];
        const mappedConditions = conditions
          .map((condition: any) => {
            const attributeId = readNumericField(
              condition,
              ['AttributeId', 'attributeId', 'AttributeID', 'attributeID', 'Attribute_Id', 'attribute_id'],
              'attributeid',
            );
            const attributeValueId = readNumericField(
              condition,
              ['AttributeValueId', 'attributeValueId', 'AttributeValueID', 'attributeValueID', 'Attribute_Value_Id', 'attribute_value_id'],
              'attributevalueid',
            );
            return {
              attributeId: attributeId > 0 ? attributeId : '',
              attributeValueId: attributeValueId > 0 ? attributeValueId : '',
            };
          })
          .filter((condition: { attributeId: number | ''; attributeValueId: number | '' }) => condition.attributeId !== '');
        const unitPrice = rule?.UnitPrice ?? rule?.unitPrice;
        const priority = rule?.Priority ?? rule?.priority;
        const priceType = rule?.PriceType ?? rule?.priceType ?? 0;

        const mappedAreResolvable =
          mappedConditions.length > 0 &&
          mappedConditions.every((condition: { attributeId: number | ''; attributeValueId: number | '' }) => {
            const attribute = availableAttributes.find((item) => item.AttributeID === condition.attributeId);
            if (!attribute) return false;
            return attribute.AttributeValues.some((value) => value.ValueID === condition.attributeValueId);
          });

        const recoveredConditions = recoverConditionsFromRuleName(
          rule?.RuleName ?? rule?.ruleName,
          availableAttributes,
        );
        const ordinalRecoveredConditions = recoverConditionsFromOrdinalIds(
          mappedConditions,
          availableAttributes,
        );

        return {
          conditions:
            mappedAreResolvable
              ? mappedConditions
              : recoveredConditions.length > 0
                ? recoveredConditions
                : ordinalRecoveredConditions.length > 0
                  ? ordinalRecoveredConditions
                  : mappedConditions.length > 0
                    ? mappedConditions
                    : [{ attributeId: '', attributeValueId: '' }],
          unitPrice: unitPrice !== undefined && unitPrice !== null ? String(unitPrice) : '',
          priority: priority !== undefined && priority !== null ? String(priority) : String(index + 1),
          priceType: Number(priceType),
        } as RuleDraft;
      })
      .filter(
        (rule) =>
          rule.unitPrice !== '' ||
          rule.conditions.some(
            (condition) => condition.attributeId !== '' || condition.attributeValueId !== '',
          ),
      );

    return parsed.length > 0 ? parsed : [createEmptyRule(0)];
  };

  const fetchDocumentTypes = async () => {
    try {
      const res = await api.get<DocumentTypeOption[]>('/api/products/master/document-types');
      setDocumentTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDocumentTypes([]);
    }
  };

  const loadMetaConfig = async () => {
    if (!hasValidId) return;

    setLoadingMeta(true);
    try {
      const res = await api.get<MetaConfigResponse>(`/api/products/${productId}/meta-config`);
      const upload = res.data?.UploadConfig;
      setIsUploadMandatory(Boolean(upload?.IsUploadMandatory));
      setMinUploads(upload?.MinUploads !== undefined && upload?.MinUploads !== null ? String(upload.MinUploads) : '');
      setMaxUploads(upload?.MaxUploads !== undefined && upload?.MaxUploads !== null ? String(upload.MaxUploads) : '');
      setEnableOrderQuantity(Boolean(upload?.EnableOrderQuantity));
      setMinOrderQuantity(
        upload?.MinOrderQuantity !== undefined && upload?.MinOrderQuantity !== null
          ? String(upload.MinOrderQuantity)
          : '',
      );
      setMaxOrderQuantity(
        upload?.MaxOrderQuantity !== undefined && upload?.MaxOrderQuantity !== null
          ? String(upload.MaxOrderQuantity)
          : '',
      );
      setEnableCustomDescription(Boolean(upload?.EnableCustomDescription));
      setIsCustomDescriptionRequired(Boolean(upload?.IsCustomDescriptionRequired));
      setCustomDescriptionLabel(typeof upload?.CustomDescriptionLabel === 'string' ? upload.CustomDescriptionLabel : '');
      setCustomDescriptionPlaceholder(typeof upload?.CustomDescriptionPlaceholder === 'string' ? upload.CustomDescriptionPlaceholder : '');
      setAllowedDocumentTypeIds(
        Array.isArray(upload?.AllowedDocumentTypeIds) ? upload?.AllowedDocumentTypeIds ?? [] : [],
      );

      const mappedInfo = Array.isArray(res.data?.InfoItems)
        ? res.data.InfoItems.map((item, index) => ({
          key: `info-${item.ProductInfoItemId || index + 1}`,
          title: item.Title || '',
          value: item.Value || '',
          sortOrder: String(item.SortOrder ?? index + 1),
          isActive: item.IsActive ?? true,
        }))
        : [];

      setInfoItems(
        mappedInfo.length > 0
          ? mappedInfo
          : [{ key: 'info-1', title: '', value: '', sortOrder: '1', isActive: true }],
      );
    } catch {
      setInfoItems([{ key: 'info-1', title: '', value: '', sortOrder: '1', isActive: true }]);
    } finally {
      setLoadingMeta(false);
    }
  };

  const extractServiceDataArray = <T,>(payload: any): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (Array.isArray(payload?.Data)) return payload.Data as T[];
    if (Array.isArray(payload?.data)) return payload.data as T[];
    return [];
  };

  const loadMedia = async () => {
    if (!hasValidId) return;
    setLoadingMedia(true);
    try {
      const res = await api.get(`/api/products/${productId}/media`);
      const items = extractServiceDataArray<ProductMediaItem>(res.data);
      setMediaItems(items);
    } catch {
      setMediaItems([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const uploadMediaFiles = async (files: FileList | null, mediaType: 0 | 1) => {
    if (!hasValidId || !files || files.length === 0) return;
    setError(null);
    setMediaMessage(null);
    mediaType === 0 ? setUploadingImageMedia(true) : setUploadingVideoMedia(true);
    try {
      const formData = new FormData();
      formData.append('MediaType', String(mediaType));
      formData.append('SetAsPrimary', 'false');
      Array.from(files).forEach((file) => formData.append('Files', file));

      await api.post(`/api/products/${productId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadMedia();
      await loadProduct();
      showMessage(setMediaMessage, mediaType === 0 ? 'Images uploaded.' : 'Videos uploaded.');
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to upload media.');
    } finally {
      mediaType === 0 ? setUploadingImageMedia(false) : setUploadingVideoMedia(false);
    }
  };

  const setPrimaryMedia = async (mediaId: number) => {
    setError(null);
    setMediaMessage(null);
    try {
      await api.put(`/api/products/${productId}/media/${mediaId}/primary`);
      await loadMedia();
      await loadProduct();
      showMessage(setMediaMessage, 'Primary media updated.');
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to update primary media.');
    }
  };

  const deleteMedia = async (mediaId: number, fileName?: string | null) => {
    const confirmed = window.confirm(
      `Delete media${fileName ? ` "${fileName}"` : ''}?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    setMediaMessage(null);
    try {
      await api.delete(`/api/products/${productId}/media/${mediaId}`);
      await loadMedia();
      await loadProduct();
      showMessage(setMediaMessage, 'Media deleted.');
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to delete media.');
    }
  };

  const loadProduct = async () => {
    if (!hasValidId) return;
    setLoading(true);
    setError(null);
    try {
      const detailsRes = await api.get<ProductDetailsResponse>(`/api/products/details-with-pricing-v2/${productId}`);
      const details = detailsRes.data;

      setProductName(details.ProductName || '');
      setDescription(details.Description || '');
      setPricingStrategy(Number(details.PricingStrategy ?? 0));
      setUiMode(Number(details.UiMode ?? 1));
      setListingStatus(Number(details.ListingStatus ?? 0));
      setIsEnabled(Boolean(details.IsEnabled));

      const mappedAttributes = toSavedAttributes(details);
      setSavedAttributes(mappedAttributes);
      const editor = mappedAttributes.map((attribute) => ({
        name: attribute.AttributeName,
        affectsPricing: attribute.AffectsPricing,
        values: attribute.AttributeValues.map((value) => value.ValueName),
      }));
      setAttributes(editor);
      setSelectedAttributeName(editor[0]?.name || '');

      const parsedRules = parseRulesFromDetails(details, mappedAttributes);
      setRules(parsedRules);

      const rawRules = Array.isArray(details.PricingRules) ? details.PricingRules : [];
      const firstRule = rawRules[0];
      const inferredPriceType = Number(firstRule?.PriceType ?? firstRule?.priceType ?? 0);
      setPriceType(Number.isNaN(inferredPriceType) ? 0 : inferredPriceType);

      const inferredInputKey = String(
        firstRule?.MultiplierInputKey ?? firstRule?.multiplierInputKey ?? '',
      ).trim();
      if (inferredInputKey) {
        const normalized = inferredInputKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        setMultiplierMode(normalized === 'uploadcount' ? 'upload_count' : 'manual');
        setMultiplierInputKey(inferredInputKey);
      } else {
        setMultiplierMode('manual');
        setMultiplierInputKey('PricingFactor');
      }

      const inferredMin = firstRule?.MinMultiplier ?? firstRule?.minMultiplier;
      const inferredMax = firstRule?.MaxMultiplier ?? firstRule?.maxMultiplier;
      setMinMultiplier(inferredMin !== undefined && inferredMin !== null ? String(inferredMin) : '');
      setMaxMultiplier(inferredMax !== undefined && inferredMax !== null ? String(inferredMax) : '');
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to load product.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!hasValidId) {
      setError('Invalid product id.');
      setLoading(false);
      return;
    }
    loadProduct();
    loadMetaConfig();
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, productId]);

  const showMessage = (setter: React.Dispatch<React.SetStateAction<string | null>>, msg: string) => {
    setter(msg);
    setTimeout(() => {
      setter(null);
    }, 3000);
  };

  const handleSaveBasics = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBasicsMessage(null);
    const cleanName = productName.trim();
    if (!cleanName) {
      toast.error('Product name is required.', { position: 'bottom-right' });
      setError('Product name is required.');
      return;
    }

    setSavingBasics(true);
    try {
      await api.put('/api/products', {
        ProductID: productId,
        ProductName: cleanName,
        Description: description.trim() || null,
        UiMode: uiMode,
        ListingStatus: listingStatus,
        IsEnabled: isEnabled,
      });
      showMessage(setBasicsMessage, 'Basics and status updated.');
      toast.success('Basics and status updated.', { position: 'bottom-right' });
      await loadProduct();
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to update basics.');
    } finally {
      setSavingBasics(false);
    }
  };

  const addAttributeName = () => {
    const name = attributeNameInput.trim();
    if (!name) {
      toast.error('Attribute name is required.');
      return;
    }
    const exists = attributes.some((attribute) => attribute.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setError(`Attribute '${name}' already exists.`);
      return;
    }
    setError(null);
    setAttributes((prev) => [...prev, { name, affectsPricing: true, values: [] }]);
    setSelectedAttributeName(name);
    setAttributeNameInput('');
  };

  const toggleAttributeAffectsPricing = (name: string, affectsPricing: boolean) => {
    if (!affectsPricing) {
      const savedAttribute = getSavedAttributeByName(name);
      if (savedAttribute && isAttributeUsedInRules(savedAttribute.AttributeID)) {
        setError(
          `Cannot mark "${name}" as non-pricing because it is used in pricing rules. Update rules first.`,
        );
        return;
      }
    }

    setError(null);
    setAttributes((prev) =>
      prev.map((attribute) =>
        attribute.name === name ? { ...attribute, affectsPricing } : attribute,
      ),
    );
  };

  const removeAttributeName = (name: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove the attribute "${name}"?`);
    if (!confirmed) return;

    const savedAttribute = getSavedAttributeByName(name);
    if (savedAttribute && isAttributeUsedInRules(savedAttribute.AttributeID)) {
      setError(
        `Cannot remove attribute "${name}" because it is used in pricing rules. Remove or update related pricing conditions first.`,
      );
      return;
    }

    setError(null);
    setAttributes((prev) => prev.filter((attribute) => attribute.name !== name));
    if (selectedAttributeName === name) {
      const next = attributes.find((attribute) => attribute.name !== name)?.name || '';
      setSelectedAttributeName(next);
    }
  };

  const addValueToSelectedAttribute = () => {
    const value = attributeValueInput.trim();
    if (!selectedAttributeName) {
      toast.error('Please select an attribute first.');
      return;
    }
    if (!value) {
      toast.error('Attribute value is required.');
      return;
    }

    let exists = false;
    attributes.forEach((attr) => {
      if (attr.name === selectedAttributeName) {
        if (attr.values.some((item) => item.toLowerCase() === value.toLowerCase())) {
          exists = true;
        }
      }
    });

    if (exists) {
      setError(`Value '${value}' already exists for this attribute.`);
      return;
    }

    setError(null);
    setAttributes((prev) =>
      prev.map((attribute) => {
        if (attribute.name !== selectedAttributeName) return attribute;
        return { ...attribute, values: [...attribute.values, value] };
      }),
    );
    setAttributeValueInput('');
  };

  const removeValueFromSelectedAttribute = (value: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove the value "${value}"?`);
    if (!confirmed) return;

    if (!selectedAttributeName) return;
    const savedAttribute = getSavedAttributeByName(selectedAttributeName);
    const savedValue = savedAttribute?.AttributeValues.find(
      (item) => item.ValueName.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (
      savedAttribute &&
      savedValue &&
      isAttributeValueUsedInRules(savedAttribute.AttributeID, savedValue.ValueID)
    ) {
      setError(
        `Cannot remove value "${selectedAttributeName}=${value}" because it is used in pricing rules. Remove or update related pricing conditions first.`,
      );
      return;
    }

    setError(null);
    setAttributes((prev) =>
      prev.map((attribute) =>
        attribute.name === selectedAttributeName
          ? { ...attribute, values: attribute.values.filter((item) => item !== value) }
          : attribute,
      ),
    );
  };

  const handleSaveAttributesAndValues = async () => {
    setError(null);
    setAttributesMessage(null);
    if (attributes.length === 0) {
      toast.error('Add at least one attribute.');
      setError('Add at least one attribute.');
      return;
    }

    for (const savedAttribute of savedAttributes) {
      const editedAttribute = attributes.find(
        (attribute) =>
          attribute.name.trim().toLowerCase() === savedAttribute.AttributeName.trim().toLowerCase(),
      );

      if (!editedAttribute) {
        if (isAttributeUsedInRules(savedAttribute.AttributeID)) {
          setError(
            `Cannot save changes. Attribute "${savedAttribute.AttributeName}" is used in pricing rules.`,
          );
          return;
        }
        continue;
      }

      const editedValueSet = new Set(
        editedAttribute.values.map((value) => value.trim().toLowerCase()).filter(Boolean),
      );
      for (const savedValue of savedAttribute.AttributeValues) {
        const savedValueKey = savedValue.ValueName.trim().toLowerCase();
        if (!editedValueSet.has(savedValueKey)) {
          if (isAttributeValueUsedInRules(savedAttribute.AttributeID, savedValue.ValueID)) {
            setError(
              `Cannot save changes. Value "${savedAttribute.AttributeName}=${savedValue.ValueName}" is used in pricing rules.`,
            );
            return;
          }
        }
      }
    }

    const payloadAttributes = attributes
      .map((attribute) => ({
        AttributeName: attribute.name.trim(),
        AffectsPricing: attribute.affectsPricing,
        Values: dedupeCaseInsensitive(attribute.values),
      }))
      .filter((attribute) => attribute.AttributeName.length > 0);

    setSavingAttributes(true);
    try {
      await api.put(`/api/products/${productId}/catalog-config`, {
        ProductName: productName.trim(),
        Description: description.trim() || null,
        PricingStrategy: effectivePricingStrategy,
        ReplaceAttributes: true,
        ReplaceAddons: false,
        Attributes: payloadAttributes,
        Addons: [],
      });
      showMessage(setAttributesMessage, 'Attributes and values updated.');
      toast.success('Attributes and values updated.', { position: 'bottom-right' });
      await loadProduct();
      setRules([createEmptyRule(0)]);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save attributes and values.');
    } finally {
      setSavingAttributes(false);
    }
  };

  const getAttributeById = (id: number | '') =>
    savedAttributes.find((attribute) => attribute.AttributeID === id);

  const pricingAttributes = useMemo(
    () => savedAttributes.filter((attribute) => attribute.AffectsPricing),
    [savedAttributes],
  );
  const nonPricingAttributes = useMemo(
    () => savedAttributes.filter((attribute) => !attribute.AffectsPricing),
    [savedAttributes],
  );
  const hasPricingAttributes = pricingAttributes.length > 0;
  const requiresPricingFactor = priceType !== 0;
  const trimmedPricingFactorInput = multiplierInputKey.trim();
  const completeRuleCount = useMemo(
    () =>
      rules.filter(
        (rule) =>
          rule.unitPrice !== '' &&
          rule.conditions.length > 0 &&
          rule.conditions.every(
            (condition) => condition.attributeId !== '' && condition.attributeValueId !== '',
          ),
      ).length,
    [rules],
  );
  const hasAnyRuleContent = useMemo(
    () =>
      rules.some(
        (rule) =>
          rule.unitPrice.trim() !== '' ||
          rule.conditions.some(
            (condition) =>
              condition.attributeId !== '' || condition.attributeValueId !== '',
          ),
      ),
    [rules],
  );
  const sampleQuantity = enableOrderQuantity
    ? Math.max(Number(minOrderQuantity || '1') || 1, 1)
    : 1;
  const samplePricingFactor = !requiresPricingFactor
    ? 1
    : multiplierMode === 'upload_count'
      ? Math.max(Number(minUploads || '1') || 1, 1)
      : Math.max(Number(minMultiplier || '1') || 1, 1);
  const sampleUnitPrice = 100;
  const sampleTotal = sampleUnitPrice * sampleQuantity * samplePricingFactor;
  const pricingHealthChecks = [
    {
      label: 'Pricing attributes available',
      valid: hasPricingAttributes,
    },
    {
      label: 'Pricing factor input configured',
      valid:
        !requiresPricingFactor ||
        multiplierMode === 'upload_count' ||
        (trimmedPricingFactorInput.length > 0 &&
          !isQuantityLikeInputKey(trimmedPricingFactorInput)),
    },
    {
      label: 'Upload linkage valid',
      valid:
        !requiresPricingFactor ||
        multiplierMode !== 'upload_count' ||
        ((Number(maxUploads || '0') || 0) > 0),
    },
    {
      label: 'At least one complete pricing rule',
      valid: completeRuleCount > 0 || (replaceRules && !hasAnyRuleContent),
    },
  ];

  const getSavedAttributeByName = (name: string) =>
    savedAttributes.find(
      (attribute) => attribute.AttributeName.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  const isAttributeUsedInRules = (attributeId: number) =>
    rules.some((rule) => rule.conditions.some((condition) => condition.attributeId === attributeId));

  const isAttributeValueUsedInRules = (attributeId: number, attributeValueId: number) =>
    rules.some((rule) =>
      rule.conditions.some(
        (condition) =>
          condition.attributeId === attributeId && condition.attributeValueId === attributeValueId,
      ),
    );

  const getAttributeRuleUsageCount = (attributeId: number) =>
    rules.reduce(
      (count, rule) =>
        count + (rule.conditions.some((condition) => condition.attributeId === attributeId) ? 1 : 0),
      0,
    );

  const getAttributeValueRuleUsageCount = (attributeId: number, attributeValueId: number) =>
    rules.reduce(
      (count, rule) =>
        count +
        (rule.conditions.some(
          (condition) =>
            condition.attributeId === attributeId && condition.attributeValueId === attributeValueId,
        )
          ? 1
          : 0),
      0,
    );

  const updateRule = (index: number, patch: Partial<RuleDraft>) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const updateRuleCondition = (
    ruleIndex: number,
    conditionIndex: number,
    patch: Partial<{ attributeId: number | ''; attributeValueId: number | '' }>,
  ) => {
    setRules((prev) =>
      prev.map((rule, i) => {
        if (i !== ruleIndex) return rule;
        const nextConditions = rule.conditions.map((condition, ci) => {
          if (ci !== conditionIndex) return condition;
          const next = { ...condition, ...patch };
          if (patch.attributeId !== undefined && patch.attributeId !== condition.attributeId) {
            next.attributeValueId = '';
          }
          return next;
        });
        return { ...rule, conditions: nextConditions };
      }),
    );
  };

  const addConditionToRule = (ruleIndex: number) => {
    setRules((prev) =>
      prev.map((rule, index) =>
        index === ruleIndex
          ? {
            ...rule,
            conditions: [...rule.conditions, { attributeId: '', attributeValueId: '' }],
          }
          : rule,
      ),
    );
  };

  const removeConditionFromRule = (ruleIndex: number, conditionIndex: number) => {
    setRules((prev) =>
      prev.map((rule, index) => {
        if (index !== ruleIndex) return rule;
        if (rule.conditions.length === 1) return rule;
        return {
          ...rule,
          conditions: rule.conditions.filter((_, ci) => ci !== conditionIndex),
        };
      }),
    );
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePricing = async () => {
    setError(null);
    setPricingMessage(null);
    setPricingValidation({});
    if (savedAttributes.length === 0) {
      setError('Save attributes first before configuring pricing.');
      setPricingValidation({ priceType: 'Save attributes first before configuring pricing.' });
      return;
    }
    if (!hasPricingAttributes) {
      setSavingPricing(true);
      try {
        await api.put(`/api/products/${productId}/pricing-config`, {
          PricingStrategy: effectivePricingStrategy,
          ReplaceRules: true,
          InputDefinitions: [],
          Rules: [],
        });
        setPricingMessage('No pricing attributes configured. Pricing rules were cleared/skipped.');
        await loadProduct();
      } catch (err: any) {
        const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
        setError(apiMessage || err?.message || 'Failed to update pricing configuration.');
      } finally {
        setSavingPricing(false);
      }
      return;
    }
    const requiresMultiplier = priceType !== 0;
    const trimmedManualInputKey = multiplierInputKey.trim();
    const parsedMinMultiplier = minMultiplier.trim() === '' ? null : Number(minMultiplier);
    const parsedMaxMultiplier = maxMultiplier.trim() === '' ? null : Number(maxMultiplier);
    const uploadMin = minUploads.trim() === '' ? null : Number(minUploads);
    const uploadMax = maxUploads.trim() === '' ? null : Number(maxUploads);

    if (requiresMultiplier && multiplierMode === 'manual' && !trimmedManualInputKey) {
      setError('Pricing factor input is required for non-flat price types.');
      setPricingValidation({ factorInput: 'Pricing factor input is required for non-flat price types.' });
      return;
    }
    if (requiresMultiplier && multiplierMode === 'manual' && isQuantityLikeInputKey(trimmedManualInputKey)) {
      setError('Use Upload Policy order quantity for copies. Variable factor input key cannot be Quantity/Qty.');
      setPricingValidation({ factorInput: 'Use a non-quantity pricing factor input (for example: Pages, Area, UploadCount).' });
      return;
    }

    if (requiresMultiplier && multiplierMode === 'upload_count') {
      if (uploadMax === null || Number.isNaN(uploadMax) || uploadMax <= 0) {
        setError('Configure upload policy (maximum uploads > 0) before using upload-count based pricing.');
        setPricingValidation({ uploadPolicy: 'Set Upload Policy max uploads greater than 0 for upload-count based pricing.' });
        return;
      }
      if (uploadMin !== null && Number.isNaN(uploadMin)) {
        setError('Minimum uploads must be a valid number.');
        setPricingValidation({ uploadPolicy: 'Minimum uploads must be a valid number.' });
        return;
      }
    }

    if (
      requiresMultiplier &&
      parsedMinMultiplier !== null &&
      parsedMaxMultiplier !== null &&
      !Number.isNaN(parsedMinMultiplier) &&
      !Number.isNaN(parsedMaxMultiplier) &&
      parsedMaxMultiplier < parsedMinMultiplier
    ) {
      setError('Maximum pricing factor must be greater than or equal to minimum pricing factor.');
      setPricingValidation({ maxFactor: 'Maximum pricing factor must be greater than or equal to minimum pricing factor.' });
      return;
    }
    const validRules = rules.filter(
      (rule) =>
        rule.unitPrice !== '' &&
        rule.conditions.length > 0 &&
        rule.conditions.every(
          (condition) => condition.attributeId !== '' && condition.attributeValueId !== '',
        ),
    );
    if (validRules.length === 0) {
      // Allow clearing existing pricing rules when editor intentionally leaves the
      // rule list empty/incomplete and chooses replace mode.
      if (replaceRules && !hasAnyRuleContent) {
        setSavingPricing(true);
        try {
          await api.put(`/api/products/${productId}/pricing-config`, {
            PricingStrategy: effectivePricingStrategy,
            ReplaceRules: true,
            InputDefinitions: [],
            Rules: [],
          });
          setPricingMessage('Pricing rules cleared.');
          await loadProduct();
        } catch (err: any) {
          const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
          setError(apiMessage || err?.message || 'Failed to clear pricing rules.');
        } finally {
          setSavingPricing(false);
        }
        return;
      }

      setError('Add at least one complete pricing rule.');
      setPricingValidation({ rules: 'Add at least one complete pricing rule.' });
      return;
    }

    const rulePriorities = validRules.map((r) => Number(r.priority));
    const uniquePriorities = new Set(rulePriorities);
    if (uniquePriorities.size !== rulePriorities.length) {
      setError('Pricing rules cannot share the same priority. Please assign unique priorities.');
      setPricingValidation({ rules: 'Pricing rules cannot share the same priority. Please assign unique priorities.' });
      return;
    }

    const hasDuplicateConditions = validRules.some((rule) => {
      const attributeIds = rule.conditions.map((condition) => condition.attributeId);
      return new Set(attributeIds).size !== attributeIds.length;
    });
    if (hasDuplicateConditions) {
      setError('A rule cannot contain the same attribute more than once.');
      setPricingValidation({ rules: 'A rule cannot contain the same attribute more than once.' });
      return;
    }

    const ruleSignatures = validRules.map((rule) => {
      return rule.conditions
        .map((c) => `${c.attributeId}:${c.attributeValueId}`)
        .sort()
        .join('|');
    });
    const uniqueSignatures = new Set(ruleSignatures);
    if (uniqueSignatures.size !== ruleSignatures.length) {
      toast.error('You cannot have multiple rules with the exact same combination of attributes and values.', { position: 'bottom-right' });
      setError('You cannot have multiple rules with the exact same combination of attributes and values.');
      setPricingValidation({ rules: 'You cannot have multiple rules with the exact same combination of attributes and values.' });
      return;
    }
    const pricingAttributeIdSet = new Set(pricingAttributes.map((attribute) => attribute.AttributeID));
    const hasNonPricingCondition = validRules.some((rule) =>
      rule.conditions.some((condition) => !pricingAttributeIdSet.has(Number(condition.attributeId))),
    );
    if (hasNonPricingCondition) {
      setError('Pricing rules can only use attributes marked as "Affects pricing".');
      setPricingValidation({ rules: 'Pricing rules can only use attributes marked as "Affects pricing".' });
      return;
    }

    setSavingPricing(true);
    try {
      const activeInputKey =
        requiresMultiplier
          ? multiplierMode === 'upload_count'
            ? UPLOAD_COUNT_INPUT_KEY
            : trimmedManualInputKey
          : null;

      const effectiveMinMultiplier =
        !requiresMultiplier
          ? null
          : multiplierMode === 'upload_count'
            ? uploadMin
            : parsedMinMultiplier;
      const effectiveMaxMultiplier =
        !requiresMultiplier
          ? null
          : multiplierMode === 'upload_count'
            ? uploadMax
            : parsedMaxMultiplier;

      const usedRuleNames = new Set<string>();
      const payloadRules = validRules.map((rule) => {
        const ruleNameTokens = rule.conditions.map((condition) => {
          const selectedAttribute = savedAttributes.find(
            (attribute) => attribute.AttributeID === Number(condition.attributeId),
          );
          const selectedValue = selectedAttribute?.AttributeValues.find(
            (value) => value.ValueID === Number(condition.attributeValueId),
          );
          return `${selectedAttribute?.AttributeName || 'ATTRIBUTE'}_${selectedValue?.ValueName || 'VALUE'}`;
        });
        return {
          RuleName: buildUniqueRuleName(ruleNameTokens, usedRuleNames),
          PriceType: Number(priceType),
          UnitPrice: Number(rule.unitPrice),
          MultiplierInputKey: activeInputKey,
          MinMultiplier: effectiveMinMultiplier,
          MaxMultiplier: effectiveMaxMultiplier,
          IsActive: true,
          Priority: Number(rule.priority || 100),
          ValidFrom: null,
          ValidTo: null,
          Conditions: rule.conditions.map((condition) => ({
            AttributeId: Number(condition.attributeId),
            AttributeValueId: Number(condition.attributeValueId),
          })),
        };
      });

      await api.put(`/api/products/${productId}/pricing-config`, {
        PricingStrategy: effectivePricingStrategy,
        ReplaceRules: replaceRules,
        InputDefinitions:
          requiresMultiplier && activeInputKey
            ? [
              {
                InputKey: activeInputKey,
                DataType: 0, // Int
                IsRequired: true,
                MinValue: effectiveMinMultiplier,
                MaxValue: effectiveMaxMultiplier,
              },
            ]
            : [],
        Rules: payloadRules,
      });
      showMessage(setPricingMessage, payloadRules.length === 0 ? 'Pricing rules cleared.' : 'Pricing rules updated.');
      toast.success(payloadRules.length === 0 ? 'Pricing rules cleared.' : 'Pricing rules updated.', { position: 'bottom-right' });
      await loadProduct();
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save pricing rules.');
    } finally {
      setSavingPricing(false);
    }
  };

  const toggleAllowedDocumentType = (documentTypeId: number) => {
    setAllowedDocumentTypeIds((prev) =>
      prev.includes(documentTypeId)
        ? prev.filter((id) => id !== documentTypeId)
        : [...prev, documentTypeId],
    );
  };

  const updateInfoItem = (key: string, patch: Partial<InfoItemDraft>) => {
    setInfoItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const addInfoItem = () => {
    setInfoItems((prev) => [
      ...prev,
      {
        key: `info-${Date.now()}-${prev.length + 1}`,
        title: '',
        value: '',
        sortOrder: String(prev.length + 1),
        isActive: true,
      },
    ]);
  };

  const removeInfoItem = (key: string) => {
    setInfoItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.key !== key);
    });
  };

  const handleSaveMetaConfig = async () => {
    setError(null);
    setMetaMessage(null);

    const minValue = minUploads.trim() === '' ? null : Number(minUploads);
    const maxValue = maxUploads.trim() === '' ? null : Number(maxUploads);
    const minOrderValue = minOrderQuantity.trim() === '' ? null : Number(minOrderQuantity);
    const maxOrderValue = maxOrderQuantity.trim() === '' ? null : Number(maxOrderQuantity);

    if (isUploadMandatory) {
      if (minValue === null || maxValue === null) {
        setError('Min and Max uploads are required when upload is mandatory.');
        return;
      }
      if (minValue < 1) {
        setError('Min uploads must be at least 1 when upload is mandatory.');
        return;
      }
      if (maxValue < minValue) {
        setError('Max uploads must be greater than or equal to Min uploads.');
        return;
      }
      if (allowedDocumentTypeIds.length === 0) {
        setError('Select at least one allowed document type when upload is mandatory.');
        return;
      }
    }

    if (isCustomDescriptionRequired && !enableCustomDescription) {
      setError('Enable custom description before marking it as required.');
      return;
    }

    if (enableOrderQuantity) {
      if (minOrderValue === null || maxOrderValue === null) {
        toast.error('Min and Max order quantity are required when order quantity is enabled.');
        setError('Min and Max order quantity are required when order quantity is enabled.');
        return;
      }
      if (minOrderValue < 1) {
        toast.error('Minimum order quantity must be at least 1.');
        setError('Minimum order quantity must be at least 1.');
        return;
      }
      if (maxOrderValue < minOrderValue) {
        toast.error('Maximum order quantity must be greater than or equal to minimum order quantity.');
        setError('Maximum order quantity must be greater than or equal to minimum order quantity.');
        return;
      }
    }

    setSavingMeta(true);
    try {
      const payload = {
        UploadConfig: {
          IsUploadMandatory: isUploadMandatory,
          MinUploads: minValue,
          MaxUploads: maxValue,
          EnableOrderQuantity: enableOrderQuantity,
          MinOrderQuantity: enableOrderQuantity ? minOrderValue : null,
          MaxOrderQuantity: enableOrderQuantity ? maxOrderValue : null,
          EnableCustomDescription: enableCustomDescription,
          IsCustomDescriptionRequired: enableCustomDescription && isCustomDescriptionRequired,
          CustomDescriptionLabel: enableCustomDescription ? customDescriptionLabel.trim() || null : null,
          CustomDescriptionPlaceholder: enableCustomDescription ? customDescriptionPlaceholder.trim() || null : null,
          AllowedDocumentTypeIds: allowedDocumentTypeIds,
        },
        InfoItems: toMetaInfoPayload(infoItems),
      };

      await api.put(`/api/products/${productId}/meta-config`, payload);
      showMessage(setMetaMessage, 'Upload policy and info items updated.');
      await loadMetaConfig();
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to update upload policy and info.');
    } finally {
      setSavingMeta(false);
    }
  };

  const duplicatePriorities = useMemo(() => {
    const priorities = rules.map(r => r.priority).filter(p => p !== '');
    const duplicates = priorities.filter((item, index) => priorities.indexOf(item) !== index);
    return new Set(duplicates);
  }, [rules]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6 text-gray-500">Loading product...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-8">
        <div className="sticky top-[52px] sm:top-[60px] z-30 flex items-center justify-between gap-4 bg-gray-100 py-4 -mx-6 px-6 border-b border-gray-200 shadow-sm mb-6 -mt-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Product #{productId}</h1>
            <p className="text-xs sm:text-sm text-gray-500">Update basics, attributes/values, pricing, and listing status.</p>
          </div>
          <Link href="/products" className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
            Back to Products
          </Link>
        </div>

        <div className="flex items-start gap-6">
          <div className="flex-1 space-y-6 min-w-0">

            <form onSubmit={handleSaveBasics} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Basics & Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Strategy</label>
                  <select value={pricingStrategy} onChange={(e) => setPricingStrategy(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">
                    {PRICING_STRATEGIES.map((strategy) => (
                      <option key={strategy.value} value={strategy.value}>{strategy.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product UI Mode</label>
                  <select value={uiMode} onChange={(e) => setUiMode(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">
                    {UI_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>{mode.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Listing Status</label>
                  <select value={listingStatus} onChange={(e) => setListingStatus(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">
                    <option value={0}>Draft</option>
                    <option value={1}>Ready For Listing</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="rounded border-gray-300" />
                    Enabled for end users
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap justify-end items-center gap-3">
                {basicsMessage && <span className="text-sm font-medium text-green-600">{basicsMessage}</span>}

                <button type="submit" disabled={savingBasics} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {savingBasics ? 'Saving...' : 'Save Basics'}
                </button>
              </div>
            </form>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Attributes & Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Add Attribute Name</label>
                  <div className="flex gap-2">
                    <input value={attributeNameInput} onChange={(e) => setAttributeNameInput(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                    <button type="button" onClick={addAttributeName} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Add</button>
                  </div>
                  <div className="space-y-2">
                    {attributes.map((attribute) => (
                      <div key={attribute.name} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setSelectedAttributeName(attribute.name)} className={`text-sm font-medium ${selectedAttributeName === attribute.name ? 'text-blue-700' : 'text-gray-700'}`}>{attribute.name}</button>
                          <label className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                            <input
                              type="checkbox"
                              checked={attribute.affectsPricing}
                              onChange={(e) => toggleAttributeAffectsPricing(attribute.name, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            Affects pricing
                          </label>
                          {(() => {
                            const savedAttribute = getSavedAttributeByName(attribute.name);
                            const usageCount = savedAttribute ? getAttributeRuleUsageCount(savedAttribute.AttributeID) : 0;
                            if (usageCount <= 0) return null;
                            return (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                Used in {usageCount} rule{usageCount > 1 ? 's' : ''}
                              </span>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttributeName(attribute.name)}
                          className="text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                          disabled={(() => {
                            const savedAttribute = getSavedAttributeByName(attribute.name);
                            if (!savedAttribute) return false;
                            return getAttributeRuleUsageCount(savedAttribute.AttributeID) > 0;
                          })()}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Manage Values for Selected Attribute</label>
                  <select value={selectedAttributeName} onChange={(e) => setSelectedAttributeName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">
                    <option value="">Select attribute</option>
                    {attributes.map((attribute) => (
                      <option key={attribute.name} value={attribute.name}>{attribute.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input value={attributeValueInput} onChange={(e) => setAttributeValueInput(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                    <button type="button" onClick={addValueToSelectedAttribute} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Add</button>
                  </div>
                  <div className="space-y-2">
                    {selectedAttributeEditor?.values.map((value) => (
                      <div key={value} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{value}</span>
                          {(() => {
                            const savedAttribute = getSavedAttributeByName(selectedAttributeName);
                            const savedValue = savedAttribute?.AttributeValues.find(
                              (item) => item.ValueName.trim().toLowerCase() === value.trim().toLowerCase(),
                            );
                            const usageCount =
                              savedAttribute && savedValue
                                ? getAttributeValueRuleUsageCount(savedAttribute.AttributeID, savedValue.ValueID)
                                : 0;
                            if (usageCount <= 0) return null;
                            return (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                Used in {usageCount} rule{usageCount > 1 ? 's' : ''}
                              </span>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeValueFromSelectedAttribute(value)}
                          className="text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                          disabled={(() => {
                            const savedAttribute = getSavedAttributeByName(selectedAttributeName);
                            const savedValue = savedAttribute?.AttributeValues.find(
                              (item) => item.ValueName.trim().toLowerCase() === value.trim().toLowerCase(),
                            );
                            if (!savedAttribute || !savedValue) return false;
                            return getAttributeValueRuleUsageCount(savedAttribute.AttributeID, savedValue.ValueID) > 0;
                          })()}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end items-center gap-3">
                {attributesMessage && <span className="text-sm font-medium text-green-600">{attributesMessage}</span>}

                <button type="button" onClick={handleSaveAttributesAndValues} disabled={savingAttributes} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {savingAttributes ? 'Saving...' : 'Save Attributes & Values'}
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Pricing Rules</h2>
              <p className="text-sm text-gray-600">Configure pricing only with attributes marked as pricing-relevant.</p>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-900">How Price Is Calculated</p>
                <p className="mt-1 text-xs text-blue-800">
                  Final price = Unit Price x Quantity x Pricing Factor
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Example: {sampleUnitPrice} x {sampleQuantity} x {samplePricingFactor} = {sampleTotal}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
                Pricing attributes: {pricingAttributes.length} | Non-pricing attributes: {nonPricingAttributes.length}
              </div>
              {!hasPricingAttributes ? (
                <p className="text-sm text-amber-700">
                  No pricing attributes are configured. You can skip pricing rules for this product.
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <input id="replace-rules" type="checkbox" checked={replaceRules} onChange={(e) => setReplaceRules(e.target.checked)} className="rounded border-gray-300" />
                <label htmlFor="replace-rules" className="text-sm text-gray-700">Replace existing rules on save</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(Number(e.target.value))}
                    disabled={!hasPricingAttributes}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50"
                  >
                    {PRICE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {pricingValidation.priceType ? (
                    <p className="mt-1 text-xs text-red-600">{pricingValidation.priceType}</p>
                  ) : null}
                </div>
              </div>
              {priceType !== 0 ? (
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-800">Pricing Factor Source</p>
                  <p className="text-xs text-gray-600">
                    This is an additional factor beyond order quantity. Final price = unit price x quantity x pricing factor.
                    Example: unit 100, order qty 2, pricing factor 3 = total 600.
                    Choose <span className="font-medium">Number of uploads</span> when each uploaded file should add to pricing.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        checked={multiplierMode === 'manual'}
                        onChange={() => setMultiplierMode('manual')}
                        disabled={!hasPricingAttributes}
                      />
                      Manual pricing factor
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        checked={multiplierMode === 'upload_count'}
                        onChange={() => setMultiplierMode('upload_count')}
                        disabled={!hasPricingAttributes}
                      />
                      Number of uploads
                    </label>
                  </div>

                  {multiplierMode === 'manual' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Pricing Factor Input</label>
                        <input
                          value={multiplierInputKey}
                          onChange={(e) => setMultiplierInputKey(e.target.value)}
                          placeholder="Pages / Area / PricingFactor"
                          disabled={!hasPricingAttributes}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">
                          Do not use Quantity here. Order quantity is configured in Upload Policy.
                        </p>
                        {pricingValidation.factorInput ? (
                          <p className="mt-1 text-xs text-red-600">{pricingValidation.factorInput}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Pricing Factor</label>
                        <input
                          type="number"
                          value={minMultiplier}
                          onChange={(e) => setMinMultiplier(e.target.value)}
                          placeholder="Optional"
                          disabled={!hasPricingAttributes}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                        {pricingValidation.minFactor ? (
                          <p className="mt-1 text-xs text-red-600">{pricingValidation.minFactor}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Maximum Pricing Factor</label>
                        <input
                          type="number"
                          value={maxMultiplier}
                          onChange={(e) => setMaxMultiplier(e.target.value)}
                          placeholder="Optional"
                          disabled={!hasPricingAttributes}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                        {pricingValidation.maxFactor ? (
                          <p className="mt-1 text-xs text-red-600">{pricingValidation.maxFactor}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Linked to Upload Policy: upload count is used as the pricing factor input.
                      </div>
                      <div className="text-xs text-gray-700">
                        Uses upload count from meta config as pricing factor input <span className="font-semibold">{UPLOAD_COUNT_INPUT_KEY}</span>.
                        Current upload policy bounds: min <span className="font-semibold">{minUploads || '0'}</span>, max{' '}
                        <span className="font-semibold">{maxUploads || 'not set'}</span>.
                      </div>
                      {pricingValidation.uploadPolicy ? (
                        <p className="text-xs text-red-600">{pricingValidation.uploadPolicy}</p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Rule List</h3>
                  <button type="button" onClick={() => setRules((prev) => [...prev, createEmptyRule(prev.length)])} disabled={!hasPricingAttributes} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">+ Add Rule</button>
                </div>
                {pricingValidation.rules ? (
                  <p className="text-xs text-red-600">{pricingValidation.rules}</p>
                ) : null}
                {rules.map((rule, index) => {
                  const ruleNameTokens = rule.conditions
                    .map((condition) => {
                      if (condition.attributeId === '' || condition.attributeValueId === '') return null;
                      const attribute = getAttributeById(condition.attributeId);
                      const value = attribute?.AttributeValues.find(
                        (item) => item.ValueID === condition.attributeValueId,
                      );
                      if (!attribute || !value) return null;
                      return `${attribute.AttributeName}_${value.ValueName}`;
                    })
                    .filter((token): token is string => Boolean(token));
                  const hasCompleteConditions =
                    rule.conditions.length > 0 &&
                    rule.conditions.every(
                      (condition) => condition.attributeId !== '' && condition.attributeValueId !== '',
                    );
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl border border-gray-100 p-3 bg-white">
                      <div className="md:col-span-12 lg:col-span-6 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Conditions</label>
                        {rule.conditions.map((condition, conditionIndex) => {
                          const selectedAttribute = getAttributeById(condition.attributeId);
                          const valueOptions = selectedAttribute?.AttributeValues || [];

                          return (
                            <div key={conditionIndex} className="flex flex-wrap items-start gap-2">
                              <div className="flex-1 min-w-[140px]">
                                <select
                                  value={condition.attributeId}
                                  onChange={(e) =>
                                    updateRuleCondition(index, conditionIndex, {
                                      attributeId: e.target.value ? Number(e.target.value) : '',
                                    })
                                  }
                                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-4 transition-all ${
                                    pricingValidation.rules && condition.attributeId === ''
                                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10'
                                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/10'
                                  }`}
                                  disabled={!hasPricingAttributes}
                                >
                                  <option value="">Attribute</option>
                                  {pricingAttributes.map((attribute) => (
                                    <option key={attribute.AttributeID} value={attribute.AttributeID}>
                                      {attribute.AttributeName}
                                    </option>
                                  ))}
                                </select>
                                {pricingValidation.rules && condition.attributeId === '' ? (
                                  <p className="mt-1 text-[11px] text-red-600 font-medium">Please select an attribute.</p>
                                ) : null}
                              </div>
                              <div className="flex-1 min-w-[140px]">
                                <select
                                  value={condition.attributeValueId}
                                  onChange={(e) =>
                                    updateRuleCondition(index, conditionIndex, {
                                      attributeValueId: e.target.value ? Number(e.target.value) : '',
                                    })
                                  }
                                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-4 transition-all ${
                                    pricingValidation.rules && condition.attributeId !== '' && condition.attributeValueId === ''
                                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10'
                                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/10'
                                  }`}
                                  disabled={!hasPricingAttributes || condition.attributeId === ''}
                                >
                                  <option value="">Value</option>
                                  {valueOptions.map((value) => (
                                    <option key={value.ValueID} value={value.ValueID}>
                                      {value.ValueName}
                                    </option>
                                  ))}
                                </select>
                                {pricingValidation.rules && condition.attributeId !== '' && condition.attributeValueId === '' ? (
                                  <p className="mt-1 text-[11px] text-red-600 font-medium">Please select a value.</p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeConditionFromRule(index, conditionIndex)}
                                disabled={rule.conditions.length === 1}
                                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 mt-0.5"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => addConditionToRule(index)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          disabled={!hasPricingAttributes}
                        >
                          + Add Condition
                        </button>
                      </div>
                      <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {priceType === 0 ? 'Price' : 'Rate per item'}
                        </label>
                        <input type="number" min="0" step="0.01" value={rule.unitPrice} onChange={(e) => updateRule(index, { unitPrice: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-4 transition-all ${
                            pricingValidation.rules && rule.unitPrice === ''
                              ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/10'
                          }`} disabled={!hasPricingAttributes || !hasCompleteConditions} />
                        {pricingValidation.rules && rule.unitPrice === '' ? (
                          <p className="mt-1 text-[11px] text-red-600 font-medium">Please specify the price.</p>
                        ) : null}
                      </div>
                      <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <input type="number" min="1" value={rule.priority} onChange={(e) => updateRule(index, { priority: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" disabled={!hasPricingAttributes || !hasCompleteConditions} />
                      </div>
                      <div className="md:col-span-4 lg:col-span-2">
                        <button type="button" onClick={() => removeRule(index)} disabled={!hasPricingAttributes} className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Remove</button>
                      </div>
                      <div className="md:col-span-12">
                        {!hasCompleteConditions ? (
                          <p className="text-xs text-amber-700">
                            Complete selected pricing-attribute conditions first, then set unit price.
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-500">
                          Rule Name (auto):{' '}
                          {ruleNameTokens.length > 0
                            ? buildUniqueRuleName(ruleNameTokens, new Set<string>())
                            : 'Select at least one attribute and value'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Selected:{' '}
                          {rule.conditions
                            .map((condition) => {
                              if (condition.attributeId === '' || condition.attributeValueId === '') return null;
                              const attribute = getAttributeById(condition.attributeId);
                              const value = attribute?.AttributeValues.find(
                                (item) => item.ValueID === condition.attributeValueId,
                              );
                              if (!attribute || !value) return null;
                              return `${attribute.AttributeName}: ${value.ValueName}`;
                            })
                            .filter((item): item is string => Boolean(item))
                            .join(', ') || 'No conditions selected'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {multiplierMode === 'manual' && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-800">Pricing Configuration Health</p>
                  <div className="mt-2 space-y-1 text-xs">
                    {pricingHealthChecks.map((item) => (
                      <div key={item.label} className={item.valid ? 'text-emerald-700' : 'text-red-600'}>
                        {item.valid ? 'PASS' : 'FAIL'}: {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-end items-center gap-3">
                {pricingMessage && <span className="text-sm font-medium text-green-600">{pricingMessage}</span>}

                <button type="button" onClick={handleSavePricing} disabled={savingPricing} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {savingPricing ? 'Saving...' : 'Save Pricing Rules'}
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Product Media</h2>
              {canManageMedia ? (
                <>
                  <p className="text-sm text-gray-600">
                    Upload multiple images and videos for Generic Matrix products.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Upload Images</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => uploadMediaFiles(e.target.files, 0)}
                        className="w-full text-sm"
                        disabled={uploadingImageMedia || loadingMedia}
                      />
                      <p className="text-xs text-gray-500">JPEG, PNG, WEBP and other image mime types.</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Upload Videos</label>
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={(e) => uploadMediaFiles(e.target.files, 1)}
                        className="w-full text-sm"
                        disabled={uploadingVideoMedia || loadingMedia}
                      />
                      <p className="text-xs text-gray-500">MP4, MOV and other video mime types.</p>
                    </div>
                  </div>

                  {loadingMedia ? (
                    <p className="text-sm text-gray-500">Loading media...</p>
                  ) : mediaItems.length === 0 ? (
                    <p className="text-sm text-gray-500">No media uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mediaItems.map((item) => {
                        const isImage = Number(item.MediaType) === 0;
                        return (
                          <div key={item.ProductMediaId} className="rounded-xl border border-gray-100 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium text-gray-800">
                                {isImage ? 'Image' : 'Video'} {item.IsPrimary ? '(Primary)' : ''}
                              </div>
                              <div className="text-xs text-gray-500">Sort: {item.SortOrder}</div>
                            </div>
                            {isImage ? (
                              <img
                                src={item.MediaUrl}
                                alt={item.FileName || 'Product media'}
                                className="h-40 w-full rounded-lg object-cover border border-gray-200"
                              />
                            ) : (
                              <video
                                src={item.MediaUrl}
                                controls
                                className="h-40 w-full rounded-lg border border-gray-200 bg-black"
                              />
                            )}
                            <div className="text-xs text-gray-600 truncate" title={item.FileName || ''}>
                              {item.FileName || 'Unnamed file'}
                            </div>
                            <div className="flex items-center gap-2">
                              {!item.IsPrimary ? (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryMedia(item.ProductMediaId)}
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  Set Primary
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => deleteMedia(item.ProductMediaId, item.FileName)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-amber-700">
                  Media management is available only for products with Pricing Strategy = Generic Matrix (0).
                </p>
              )}
              {mediaMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {mediaMessage}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Upload Policy & Info Items</h2>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Is upload mandatory?</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" name="upload-mandatory-edit" checked={isUploadMandatory} onChange={() => setIsUploadMandatory(true)} />
                    Yes
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" name="upload-mandatory-edit" checked={!isUploadMandatory} onChange={() => setIsUploadMandatory(false)} />
                    No
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum uploads</label>
                  <input type="number" min="0" value={minUploads} onChange={(e) => setMinUploads(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum uploads</label>
                  <input type="number" min="0" value={maxUploads} onChange={(e) => setMaxUploads(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
              </div>

              {multiplierMode === 'upload_count' && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 mt-4">
                  <p className="text-sm font-medium text-gray-800">Pricing Configuration Health</p>
                  <div className="mt-2 space-y-1 text-xs">
                    {pricingHealthChecks.map((item) => (
                      <div key={item.label} className={item.valid ? 'text-emerald-700' : 'text-red-600'}>
                        {item.valid ? 'PASS' : 'FAIL'}: {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={enableOrderQuantity}
                    onChange={(e) => setEnableOrderQuantity(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Allow customer to choose order quantity on storefront
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum order quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={minOrderQuantity}
                      onChange={(e) => setMinOrderQuantity(e.target.value)}
                      disabled={!enableOrderQuantity}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maximum order quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={maxOrderQuantity}
                      onChange={(e) => setMaxOrderQuantity(e.target.value)}
                      disabled={!enableOrderQuantity}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={enableCustomDescription}
                    onChange={(e) => {
                      const nextEnabled = e.target.checked;
                      setEnableCustomDescription(nextEnabled);
                      if (!nextEnabled) setIsCustomDescriptionRequired(false);
                    }}
                    className="rounded border-gray-300"
                  />
                  Show custom description/instructions box on storefront
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isCustomDescriptionRequired}
                    onChange={(e) => setIsCustomDescriptionRequired(e.target.checked)}
                    disabled={!enableCustomDescription}
                    className="rounded border-gray-300"
                  />
                  Make this field required
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Field label</label>
                    <input
                      value={customDescriptionLabel}
                      onChange={(e) => setCustomDescriptionLabel(e.target.value)}
                      placeholder="Description / Instructions"
                      disabled={!enableCustomDescription}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                    <input
                      value={customDescriptionPlaceholder}
                      onChange={(e) => setCustomDescriptionPlaceholder(e.target.value)}
                      placeholder="Add any notes for production (optional)"
                      disabled={!enableCustomDescription}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Allowed document types</label>
                {documentTypes.length === 0 ? (
                  <p className="text-sm text-gray-500">No document types available from master data.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {documentTypes.map((type) => (
                      <label key={type.DocumentTypeId} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={allowedDocumentTypeIds.includes(type.DocumentTypeId)}
                          onChange={() => toggleAllowedDocumentType(type.DocumentTypeId)}
                        />
                        {type.Code} ({type.Extension})
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Info items</label>
                  <button type="button" onClick={addInfoItem} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">+ Add Info Item</button>
                </div>
                {infoItems.map((item) => (
                  <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl border border-gray-100 p-3">
                    <div className="md:col-span-12 lg:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input value={item.title} onChange={(e) => updateInfoItem(item.key, { title: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                    </div>
                    <div className="md:col-span-12 lg:col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                      <input value={item.value} onChange={(e) => updateInfoItem(item.key, { value: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                    </div>
                    <div className="md:col-span-6 lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                      <input type="number" min="1" value={item.sortOrder} onChange={(e) => updateInfoItem(item.key, { sortOrder: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                    </div>
                    <div className="md:col-span-6 lg:col-span-2">
                      <button type="button" onClick={() => removeInfoItem(item.key)} disabled={infoItems.length === 1} className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-end items-center gap-3">
                {metaMessage && <span className="text-sm font-medium text-green-600">{metaMessage}</span>}

                <button type="button" onClick={handleSaveMetaConfig} disabled={savingMeta || loadingMeta} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {savingMeta ? 'Saving...' : 'Save Upload Policy & Info'}
                </button>
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          </div>

          <ProductPreviewModal
            productName={productName}
            description={description}
            attributes={attributes}
            minUploads={minUploads}
            maxUploads={maxUploads}
            primaryImageUrl={mediaItems.find(m => m.IsPrimary && Number(m.MediaType) === 0)?.MediaUrl}
            enableOrderQuantity={enableOrderQuantity}
            minOrderQuantity={minOrderQuantity}
            maxOrderQuantity={maxOrderQuantity}
            enableCustomDescription={enableCustomDescription}
            customDescriptionLabel={customDescriptionLabel}
            customDescriptionPlaceholder={customDescriptionPlaceholder}
            documentTypes={documentTypes}
            allowedDocumentTypeIds={allowedDocumentTypeIds}
            infoItems={infoItems}
            rules={rules}
            savedAttributes={savedAttributes}
            isOpenOnMobile={showMobilePreview}
            onCloseMobile={() => setShowMobilePreview(false)}
          />

          {/* Floating Preview Button for Mobile */}
          <div className="fixed bottom-6 right-6 z-40 xl:hidden">
            <button
              onClick={() => setShowMobilePreview(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </ProtectedRoute>
  );
}
