import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';

type AttributeEditor = {
  name: string;
  values: string[];
};

type SavedAttributeValue = {
  ValueID: number;
  ValueName: string;
};

type SavedAttribute = {
  AttributeID: number;
  AttributeName: string;
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
  ListingStatus?: number;
  IsEnabled?: boolean;
  Attributes?: Array<{
    AttributeID?: number;
    AttributeName: string;
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

const PRICING_STRATEGIES = [{ value: 0, label: 'Generic Matrix' }];

const PRICE_TYPES = [
  { value: 0, label: 'Flat' },
  { value: 1, label: 'Per Unit' },
  { value: 2, label: 'Per Area' },
  { value: 3, label: 'Per Page' },
];

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
  const [listingStatus, setListingStatus] = useState(0);
  const [isEnabled, setIsEnabled] = useState(false);

  const [attributes, setAttributes] = useState<AttributeEditor[]>([]);
  const [savedAttributes, setSavedAttributes] = useState<SavedAttribute[]>([]);
  const [attributeNameInput, setAttributeNameInput] = useState('');
  const [selectedAttributeName, setSelectedAttributeName] = useState('');
  const [attributeValueInput, setAttributeValueInput] = useState('');

  const [rules, setRules] = useState<RuleDraft[]>([createEmptyRule(0)]);
  const [replaceRules, setReplaceRules] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [basicsMessage, setBasicsMessage] = useState<string | null>(null);
  const [attributesMessage, setAttributesMessage] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [metaMessage, setMetaMessage] = useState<string | null>(null);

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [isUploadMandatory, setIsUploadMandatory] = useState(false);
  const [minUploads, setMinUploads] = useState('');
  const [maxUploads, setMaxUploads] = useState('');
  const [allowedDocumentTypeIds, setAllowedDocumentTypeIds] = useState<number[]>([]);
  const [infoItems, setInfoItems] = useState<InfoItemDraft[]>([
    { key: 'info-1', title: '', value: '', sortOrder: '1', isActive: true },
  ]);
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingImageMedia, setUploadingImageMedia] = useState(false);
  const [uploadingVideoMedia, setUploadingVideoMedia] = useState(false);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);

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

        return {
          conditions:
            mappedAreResolvable
              ? mappedConditions
              : recoveredConditions.length > 0
                ? recoveredConditions
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
      setMediaMessage(mediaType === 0 ? 'Images uploaded.' : 'Videos uploaded.');
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
      setMediaMessage('Primary media updated.');
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
      setMediaMessage('Media deleted.');
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
      setListingStatus(Number(details.ListingStatus ?? 0));
      setIsEnabled(Boolean(details.IsEnabled));

      const mappedAttributes = toSavedAttributes(details);
      setSavedAttributes(mappedAttributes);
      const editor = mappedAttributes.map((attribute) => ({
        name: attribute.AttributeName,
        values: attribute.AttributeValues.map((value) => value.ValueName),
      }));
      setAttributes(editor);
      setSelectedAttributeName(editor[0]?.name || '');

      setRules(parseRulesFromDetails(details, mappedAttributes));
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

  const handleSaveBasics = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBasicsMessage(null);
    const cleanName = productName.trim();
    if (!cleanName) {
      setError('Product name is required.');
      return;
    }

    setSavingBasics(true);
    try {
      await api.put('/api/products', {
        ProductID: productId,
        ProductName: cleanName,
        Description: description.trim() || null,
        ListingStatus: listingStatus,
        IsEnabled: isEnabled,
      });
      setBasicsMessage('Basics and status updated.');
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
    if (!name) return;
    const exists = attributes.some((attribute) => attribute.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setError(`Attribute '${name}' already exists.`);
      return;
    }
    setError(null);
    setAttributes((prev) => [...prev, { name, values: [] }]);
    setSelectedAttributeName(name);
    setAttributeNameInput('');
  };

  const removeAttributeName = (name: string) => {
    setAttributes((prev) => prev.filter((attribute) => attribute.name !== name));
    if (selectedAttributeName === name) {
      const next = attributes.find((attribute) => attribute.name !== name)?.name || '';
      setSelectedAttributeName(next);
    }
  };

  const addValueToSelectedAttribute = () => {
    const value = attributeValueInput.trim();
    if (!selectedAttributeName || !value) return;
    setAttributes((prev) =>
      prev.map((attribute) => {
        if (attribute.name !== selectedAttributeName) return attribute;
        const exists = attribute.values.some((item) => item.toLowerCase() === value.toLowerCase());
        if (exists) return attribute;
        return { ...attribute, values: [...attribute.values, value] };
      }),
    );
    setAttributeValueInput('');
  };

  const removeValueFromSelectedAttribute = (value: string) => {
    if (!selectedAttributeName) return;
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
      setError('Add at least one attribute.');
      return;
    }

    const payloadAttributes = attributes
      .map((attribute) => ({
        AttributeName: attribute.name.trim(),
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
      setAttributesMessage('Attributes and values updated.');
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
    const validRules = rules.filter(
      (rule) =>
        rule.unitPrice !== '' &&
        rule.conditions.length > 0 &&
        rule.conditions.every(
          (condition) => condition.attributeId !== '' && condition.attributeValueId !== '',
        ),
    );
    if (validRules.length === 0) {
      setError('Add at least one complete pricing rule.');
      return;
    }

    const hasDuplicateConditions = validRules.some((rule) => {
      const attributeIds = rule.conditions.map((condition) => condition.attributeId);
      return new Set(attributeIds).size !== attributeIds.length;
    });
    if (hasDuplicateConditions) {
      setError('A rule cannot contain the same attribute more than once.');
      return;
    }

    setSavingPricing(true);
    try {
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
          PriceType: Number(rule.priceType),
          UnitPrice: Number(rule.unitPrice),
          MultiplierInputKey: null,
          MinMultiplier: null,
          MaxMultiplier: null,
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
        InputDefinitions: [],
        Rules: payloadRules,
      });
      setPricingMessage('Pricing rules updated.');
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

    setSavingMeta(true);
    try {
      const payload = {
        UploadConfig: {
          IsUploadMandatory: isUploadMandatory,
          MinUploads: minValue,
          MaxUploads: maxValue,
          AllowedDocumentTypeIds: allowedDocumentTypeIds,
        },
        InfoItems: toMetaInfoPayload(infoItems),
      };

      await api.put(`/api/products/${productId}/meta-config`, payload);
      setMetaMessage('Upload policy and info items updated.');
      await loadMetaConfig();
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to update upload policy and info.');
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6 text-gray-500">Loading product...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Edit Product #{productId}</h1>
            <p className="text-gray-500">Update basics, attributes/values, pricing, and listing status.</p>
          </div>
          <Link href="/products" className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Back to Products
          </Link>
        </div>

        <form onSubmit={handleSaveBasics} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Basics & Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Strategy</label>
              <select value={pricingStrategy} onChange={(e) => setPricingStrategy(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                {PRICING_STRATEGIES.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>{strategy.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Status</label>
              <select value={listingStatus} onChange={(e) => setListingStatus(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
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
          <div className="flex justify-end">
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
                <input value={attributeNameInput} onChange={(e) => setAttributeNameInput(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <button type="button" onClick={addAttributeName} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Add</button>
              </div>
              <div className="space-y-2">
                {attributes.map((attribute) => (
                  <div key={attribute.name} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                    <button type="button" onClick={() => setSelectedAttributeName(attribute.name)} className={`text-sm font-medium ${selectedAttributeName === attribute.name ? 'text-blue-700' : 'text-gray-700'}`}>{attribute.name}</button>
                    <button type="button" onClick={() => removeAttributeName(attribute.name)} className="text-xs font-medium text-red-700 hover:text-red-800">Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Manage Values for Selected Attribute</label>
              <select value={selectedAttributeName} onChange={(e) => setSelectedAttributeName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <option value="">Select attribute</option>
                {attributes.map((attribute) => (
                  <option key={attribute.name} value={attribute.name}>{attribute.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input value={attributeValueInput} onChange={(e) => setAttributeValueInput(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <button type="button" onClick={addValueToSelectedAttribute} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Add</button>
              </div>
              <div className="space-y-2">
                {selectedAttributeEditor?.values.map((value) => (
                  <div key={value} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                    <span className="text-sm text-gray-700">{value}</span>
                    <button type="button" onClick={() => removeValueFromSelectedAttribute(value)} className="text-xs font-medium text-red-700 hover:text-red-800">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSaveAttributesAndValues} disabled={savingAttributes} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {savingAttributes ? 'Saving...' : 'Save Attributes & Values'}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Pricing Rules</h2>
          <div className="flex items-center gap-2">
            <input id="replace-rules" type="checkbox" checked={replaceRules} onChange={(e) => setReplaceRules(e.target.checked)} className="rounded border-gray-300" />
            <label htmlFor="replace-rules" className="text-sm text-gray-700">Replace existing rules on save</label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Rule List</h3>
              <button type="button" onClick={() => setRules((prev) => [...prev, createEmptyRule(prev.length)])} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">+ Add Rule</button>
            </div>
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
                  <div className="md:col-span-5 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Conditions</label>
                    {rule.conditions.map((condition, conditionIndex) => {
                      const selectedAttribute = getAttributeById(condition.attributeId);
                      const valueOptions = selectedAttribute?.AttributeValues || [];

                      return (
                        <div key={conditionIndex} className="flex flex-wrap items-center gap-2">
                          <select
                            value={condition.attributeId}
                            onChange={(e) =>
                              updateRuleCondition(index, conditionIndex, {
                                attributeId: e.target.value ? Number(e.target.value) : '',
                              })
                            }
                            className="min-w-[140px] flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          >
                            <option value="">Attribute</option>
                            {savedAttributes.map((attribute) => (
                              <option key={attribute.AttributeID} value={attribute.AttributeID}>
                                {attribute.AttributeName}
                              </option>
                            ))}
                          </select>
                          <select
                            value={condition.attributeValueId}
                            onChange={(e) =>
                              updateRuleCondition(index, conditionIndex, {
                                attributeValueId: e.target.value ? Number(e.target.value) : '',
                              })
                            }
                            className="min-w-[140px] flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            disabled={condition.attributeId === ''}
                          >
                            <option value="">Value</option>
                            {valueOptions.map((value) => (
                              <option key={value.ValueID} value={value.ValueID}>
                                {value.ValueName}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeConditionFromRule(index, conditionIndex)}
                            disabled={rule.conditions.length === 1}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
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
                    >
                      + Add Condition
                    </button>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                    <select value={rule.priceType} onChange={(e) => updateRule(index, { priceType: Number(e.target.value) })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" disabled={!hasCompleteConditions}>
                      {PRICE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input type="number" min="0" step="0.01" value={rule.unitPrice} onChange={(e) => updateRule(index, { unitPrice: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" disabled={!hasCompleteConditions} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input type="number" min="1" value={rule.priority} onChange={(e) => updateRule(index, { priority: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" disabled={!hasCompleteConditions} />
                  </div>
                  <div className="md:col-span-1">
                    <button type="button" onClick={() => removeRule(index)} disabled={rules.length === 1} className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Remove</button>
                  </div>
                  <div className="md:col-span-12">
                    {!hasCompleteConditions ? (
                      <p className="text-xs text-amber-700">
                        Complete all attribute/value conditions first, then set price type and unit price.
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
          <div className="flex justify-end">
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
              <input type="number" min="0" value={minUploads} onChange={(e) => setMinUploads(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum uploads</label>
              <input type="number" min="0" value={maxUploads} onChange={(e) => setMaxUploads(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
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
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                  <input value={item.title} onChange={(e) => updateInfoItem(item.key, { title: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                  <input value={item.value} onChange={(e) => updateInfoItem(item.key, { value: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                  <input type="number" min="1" value={item.sortOrder} onChange={(e) => updateInfoItem(item.key, { sortOrder: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-1">
                  <button type="button" onClick={() => removeInfoItem(item.key)} disabled={infoItems.length === 1} className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSaveMetaConfig} disabled={savingMeta || loadingMeta} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {savingMeta ? 'Saving...' : 'Save Upload Policy & Info'}
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {basicsMessage && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{basicsMessage}</div>}
        {attributesMessage && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{attributesMessage}</div>}
        {pricingMessage && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{pricingMessage}</div>}
        {metaMessage && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{metaMessage}</div>}
      </div>
    </ProtectedRoute>
  );
}
