import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

type ProductDetailsResponse = {
  ProductID: number;
  ProductName?: string;
  UiMode?: number;
  Attributes?: Array<{
    AttributeID?: number;
    AttributeName: string;
    AffectsPricing?: boolean;
    AttributeValues?: SavedAttributeValue[];
    Values?: string[];
  }>;
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

type RuleDraft = {
  conditions: Array<{
    attributeId: number | '';
    attributeValueId: number | '';
  }>;
  unitPrice: string;
  priority: string;
  priceType: number;
};

type PricingValidationState = {
  priceType?: string;
  factorInput?: string;
  minFactor?: string;
  maxFactor?: string;
  uploadPolicy?: string;
  rules?: string;
};

const PRICING_STRATEGIES = [
  { value: 0, label: 'Generic Matrix' },
];

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

export default function NewProductPage() {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingStrategy, setPricingStrategy] = useState(0);
  const [uiMode, setUiMode] = useState(1);
  const [productId, setProductId] = useState<number | null>(null);



  const [attributes, setAttributes] = useState<AttributeEditor[]>([]);
  const [attributeNameInput, setAttributeNameInput] = useState('');
  const [selectedAttributeName, setSelectedAttributeName] = useState('');
  const [attributeValueInput, setAttributeValueInput] = useState('');

  const [savedAttributes, setSavedAttributes] = useState<SavedAttribute[]>([]);

  const [rules, setRules] = useState<RuleDraft[]>([createEmptyRule(0)]);
  const [replaceRules, setReplaceRules] = useState(true);
  const [priceType, setPriceType] = useState(0);
  const [multiplierMode, setMultiplierMode] = useState<'manual' | 'upload_count'>('manual');
  const [multiplierInputKey, setMultiplierInputKey] = useState('PricingFactor');
  const [minMultiplier, setMinMultiplier] = useState('');
  const [maxMultiplier, setMaxMultiplier] = useState('');
  const [pricingValidation, setPricingValidation] = useState<PricingValidationState>({});

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingAttributes, setSavingAttributes] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [basicsMessage, setBasicsMessage] = useState<string | null>(null);
  const [attributesMessage, setAttributesMessage] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [metaMessage, setMetaMessage] = useState<string | null>(null);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    type: 'attribute' | 'value' | null;
    targetName: string;
  }>({ type: null, targetName: '' });

  const [showMobilePreview, setShowMobilePreview] = useState(false);

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

  const selectedAttributeEditor = useMemo(
    () => attributes.find((attribute) => attribute.name === selectedAttributeName),
    [attributes, selectedAttributeName],
  );
  const pricingAttributes = useMemo(
    () => savedAttributes.filter((attribute) => attribute.AffectsPricing),
    [savedAttributes],
  );
  const nonPricingAttributes = useMemo(
    () => savedAttributes.filter((attribute) => !attribute.AffectsPricing),
    [savedAttributes],
  );

  const effectivePricingStrategy = pricingStrategy === 1 ? 0 : pricingStrategy;

  const extractProductId = (responseData: any): number | null => {
    if (typeof responseData === 'number') return responseData;
    if (typeof responseData?.Data === 'number') return responseData.Data;
    if (typeof responseData?.data === 'number') return responseData.data;
    return null;
  };

  const toCatalogPayloadAttributes = () =>
    attributes
      .map((attribute) => ({
        AttributeName: attribute.name.trim(),
        AffectsPricing: attribute.affectsPricing,
        Values: dedupeCaseInsensitive(attribute.values),
      }))
      .filter((attribute) => attribute.AttributeName.length > 0);

  const toMetaInfoPayload = () =>
    infoItems
      .map((item, index) => ({
        Title: item.title.trim(),
        Value: item.value.trim(),
        SortOrder: Number(item.sortOrder || index + 1),
        IsActive: item.isActive,
      }))
      .filter((item) => item.Title.length > 0 && item.Value.length > 0);

  const fetchDocumentTypes = async () => {
    try {
      const res = await api.get<DocumentTypeOption[]>('/api/products/master/document-types');
      setDocumentTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDocumentTypes([]);
    }
  };

  const loadMetaConfig = async (id: number) => {
    setLoadingMeta(true);
    try {
      const res = await api.get<MetaConfigResponse>(`/api/products/${id}/meta-config`);
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

  const loadSavedAttributes = async (id: number) => {
    const detailsRes = await api.get<ProductDetailsResponse>(`/api/products/details-with-pricing-v2/${id}`);
    const rawAttributes = Array.isArray(detailsRes.data?.Attributes) ? detailsRes.data.Attributes : [];
    const mapped: SavedAttribute[] = rawAttributes.map((attribute, index) => {
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
    setSavedAttributes(mapped);

    // Keep UI editor synced with what backend persisted.
    const syncedEditor = mapped.map((attribute) => ({
      name: attribute.AttributeName,
      affectsPricing: attribute.AffectsPricing,
      values: attribute.AttributeValues.map((value) => value.ValueName),
    }));
    setAttributes(syncedEditor);
    if (syncedEditor.length > 0) {
      const exists = syncedEditor.some((item) => item.name === selectedAttributeName);
      if (!exists) setSelectedAttributeName(syncedEditor[0].name);
    } else {
      setSelectedAttributeName('');
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  useEffect(() => {
    if (!productId) return;
    loadMetaConfig(productId);
  }, [productId]);

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
    setAttributesMessage(null);
    setPricingMessage(null);
    setMetaMessage(null);

    const cleanProductName = productName.trim();
    if (!cleanProductName) {
      toast.error('Product name is required.', { position: 'bottom-right' });
      setError('Product name is required.');
      return;
    }

    setSavingBasics(true);
    try {
      if (!productId) {
        const createPayload = {
          ProductName: cleanProductName,
          Description: description.trim() || null,
          PricingStrategy: effectivePricingStrategy,
          UiMode: uiMode,
          Attributes: [],
          Addons: [],
        };
        const createRes = await api.post('/api/products', createPayload);
        const createdId = extractProductId(createRes.data);
        if (!createdId) throw new Error('Unable to read product id from create response.');
        setProductId(createdId);
        await loadSavedAttributes(createdId);
        showMessage(setBasicsMessage, `Basics saved. Product created with ID ${createdId}.`);
        toast.success(`Basics saved. Product created with ID ${createdId}.`, { position: 'bottom-right' });
      } else {
        const payload = {
          ProductName: cleanProductName,
          Description: description.trim() || null,
          PricingStrategy: effectivePricingStrategy,
          UiMode: uiMode,
          ReplaceAttributes: false,
          ReplaceAddons: false,
          Attributes: [],
          Addons: [],
        };
        await api.put(`/api/products/${productId}/catalog-config`, payload);
        showMessage(setBasicsMessage, `Basics updated for Product ID ${productId}.`);
        toast.success(`Basics updated for Product ID ${productId}.`, { position: 'bottom-right' });
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save product basics.');
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

  const requestRemoveAttributeName = (name: string) => {
    const savedAttribute = getSavedAttributeByName(name);
    if (savedAttribute && isAttributeUsedInRules(savedAttribute.AttributeID)) {
      setError(
        `Cannot remove attribute "${name}" because it is used in pricing rules. Remove or update related pricing conditions first.`,
      );
      return;
    }
    setError(null);
    setConfirmDeleteModal({ type: 'attribute', targetName: name });
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

  const handleAttributeSelectionChange = (nextAttributeName: string) => {
    if (nextAttributeName === selectedAttributeName) return;

    const pendingValue = attributeValueInput.trim();
    if (pendingValue && selectedAttributeName) {
      const shouldSaveBeforeSwitch = window.confirm(
        `You have an unsaved value "${pendingValue}" for "${selectedAttributeName}". Click OK to save it before switching. Click Cancel to discard it and continue.`,
      );

      if (shouldSaveBeforeSwitch) {
        setAttributes((prev) =>
          prev.map((attribute) => {
            if (attribute.name !== selectedAttributeName) return attribute;
            const exists = attribute.values.some((item) => item.toLowerCase() === pendingValue.toLowerCase());
            if (exists) return attribute;
            return { ...attribute, values: [...attribute.values, pendingValue] };
          }),
        );
      }

      setAttributeValueInput('');
    }

    setSelectedAttributeName(nextAttributeName);
  };

  const requestRemoveValueFromSelectedAttribute = (value: string) => {
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
    setConfirmDeleteModal({ type: 'value', targetName: value });
  };

  const executeRemove = () => {
    if (confirmDeleteModal.type === 'attribute') {
      const name = confirmDeleteModal.targetName;
      setAttributes((prev) => prev.filter((attribute) => attribute.name !== name));
      if (selectedAttributeName === name) {
        const next = attributes.find((attribute) => attribute.name !== name)?.name || '';
        setSelectedAttributeName(next);
      }
    } else if (confirmDeleteModal.type === 'value') {
      const value = confirmDeleteModal.targetName;
      setAttributes((prev) =>
        prev.map((attribute) =>
          attribute.name === selectedAttributeName
            ? { ...attribute, values: attribute.values.filter((item) => item !== value) }
            : attribute,
        ),
      );
    }
    setConfirmDeleteModal({ type: null, targetName: '' });
  };

  const handleSaveAttributesAndValues = async () => {
    setError(null);
    setAttributesMessage(null);
    setPricingMessage(null);

    if (!productId) {
      toast.error('Save basics first to create a product.');
      setError('Save basics first to create a product.');
      return;
    }
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

    const duplicateNames = attributes
      .map((attribute) => attribute.name.trim().toLowerCase())
      .filter(Boolean)
      .filter((name, index, list) => list.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      setError('Attribute names must be unique.');
      return;
    }

    const catalogAttributes = toCatalogPayloadAttributes();

    setSavingAttributes(true);
    try {
      const payload = {
        ProductName: productName.trim(),
        Description: description.trim() || null,
        PricingStrategy: effectivePricingStrategy,
        ReplaceAttributes: true,
        ReplaceAddons: false,
        Attributes: catalogAttributes,
        Addons: [],
      };
      await api.put(`/api/products/${productId}/catalog-config`, payload);
      await loadSavedAttributes(productId);
      setRules([createEmptyRule(0)]); // IDs can change after replace
      showMessage(setAttributesMessage, 'Attributes and values saved successfully.');
      toast.success('Attributes and values saved successfully.', { position: 'bottom-right' });
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save attributes and values.');
    } finally {
      setSavingAttributes(false);
    }
  };

  const getAttributeById = (id: number | '') =>
    savedAttributes.find((attribute) => attribute.AttributeID === id);

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

    if (!productId) {
      setError('Save basics first.');
      setPricingValidation({ priceType: 'Save basics first to configure pricing.' });
      return;
    }
    if (savedAttributes.length === 0) {
      setError('Save attributes first before configuring pricing.');
      setPricingValidation({ priceType: 'Save attributes first before configuring pricing.' });
      return;
    }
    if (pricingAttributes.length === 0) {
      setSavingPricing(true);
      try {
        await api.put(`/api/products/${productId}/pricing-config`, {
          PricingStrategy: effectivePricingStrategy,
          ReplaceRules: true,
          InputDefinitions: [],
          Rules: [],
        });
        setPricingMessage('No pricing attributes configured. Pricing rules were cleared/skipped.');
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

      const payload = {
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
      };

      await api.put(`/api/products/${productId}/pricing-config`, payload);
      showMessage(setPricingMessage, 'Pricing rules saved successfully.');
      toast.success('Pricing rules saved successfully.', { position: 'bottom-right' });
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

    if (!productId) {
      setError('Save basics first to create a product.');
      return;
    }

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
        InfoItems: toMetaInfoPayload(),
      };

      await api.put(`/api/products/${productId}/meta-config`, payload);
      showMessage(setMetaMessage, 'Upload policy and info items saved successfully.');
      await loadMetaConfig(productId);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save product metadata.');
    } finally {
      setSavingMeta(false);
    }
  };

  const canConfigureAttributes = productId !== null;
  const canConfigurePricing = productId !== null;
  const hasPricingAttributes = pricingAttributes.length > 0;
  const canConfigureMeta = productId !== null;
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
      valid: completeRuleCount > 0,
    },
  ];

  const duplicatePriorities = useMemo(() => {
    const priorities = rules.map(r => r.priority).filter(p => p !== '');
    const duplicates = priorities.filter((item, index) => priorities.indexOf(item) !== index);
    return new Set(duplicates);
  }, [rules]);

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-8">
        <div className="sticky top-[52px] sm:top-[60px] z-30 flex items-center justify-between gap-4 bg-gray-100 py-4 -mx-6 px-6 border-b border-gray-200 shadow-sm mb-6 -mt-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Product</h1>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Back to Products
          </Link>
        </div>

        <div className="flex items-start gap-6">
          <div className="flex-1 space-y-6 min-w-0">

            <form onSubmit={handleSaveBasics} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">1. Basics</h2>
                {productId ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    Product ID: {productId}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Fridge Magnet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Strategy</label>
                  <select
                    value={pricingStrategy}
                    onChange={(e) => setPricingStrategy(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRICING_STRATEGIES.map((strategy) => (
                      <option key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product UI Mode</label>
                  <select
                    value={uiMode}
                    onChange={(e) => setUiMode(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {UI_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div className="flex flex-wrap justify-end items-center gap-3">
                {basicsMessage && <span className="text-sm font-medium text-green-600">{basicsMessage}</span>}

                <button
                  type="submit"
                  disabled={savingBasics}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingBasics ? 'Saving Basics...' : productId ? 'Update Basics' : 'Save Basics'}
                </button>
              </div>
            </form>

            <div className={`space-y-4 rounded-2xl border p-6 shadow-sm ${canConfigureAttributes ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-50'}`}>
              <h2 className="text-lg font-semibold text-gray-900">2. Attributes & Values</h2>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Attributes define the different characteristics of your product (e.g., Size, Color, Material).
                </p>
                <p className="text-sm text-gray-600">
                  First add an attribute (like &quot;Size&quot;), then select it below and add its values (like &quot;Small&quot;, &quot;Medium&quot;, &quot;Large&quot;).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Add Attribute Name</label>
                  <div className="flex gap-2">
                    <input
                      value={attributeNameInput}
                      onChange={(e) => setAttributeNameInput(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="Shape"
                      disabled={!canConfigureAttributes}
                    />
                    <button
                      type="button"
                      onClick={addAttributeName}
                      disabled={!canConfigureAttributes}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {attributes.length === 0 ? (
                      <p className="text-sm text-gray-500">No attributes added.</p>
                    ) : (
                      attributes.map((attribute) => (
                        <div key={attribute.name} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAttributeSelectionChange(attribute.name)}
                              className={`text-sm font-medium ${selectedAttributeName === attribute.name ? 'text-blue-700' : 'text-gray-700'}`}
                            >
                              {attribute.name}
                            </button>
                            <label className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                              <input
                                type="checkbox"
                                checked={attribute.affectsPricing}
                                onChange={(e) => toggleAttributeAffectsPricing(attribute.name, e.target.checked)}
                                disabled={!canConfigureAttributes}
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
                            onClick={() => requestRemoveAttributeName(attribute.name)}
                            className="text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                            disabled={
                              !canConfigureAttributes ||
                              (() => {
                                const savedAttribute = getSavedAttributeByName(attribute.name);
                                if (!savedAttribute) return false;
                                return getAttributeRuleUsageCount(savedAttribute.AttributeID) > 0;
                              })()
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Manage Values for Selected Attribute</label>
                  <select
                    value={selectedAttributeName}
                    onChange={(e) => handleAttributeSelectionChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    disabled={!canConfigureAttributes || attributes.length === 0}
                  >
                    <option value="">Select attribute</option>
                    {attributes.map((attribute) => (
                      <option key={attribute.name} value={attribute.name}>
                        {attribute.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <input
                      value={attributeValueInput}
                      onChange={(e) => setAttributeValueInput(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="Matte"
                      disabled={!canConfigureAttributes || !selectedAttributeName}
                    />
                    <button
                      type="button"
                      onClick={addValueToSelectedAttribute}
                      disabled={!canConfigureAttributes || !selectedAttributeName}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {!selectedAttributeEditor ? (
                      <p className="text-sm text-gray-500">Select an attribute to add values.</p>
                    ) : selectedAttributeEditor.values.length === 0 ? (
                      <p className="text-sm text-gray-500">No values yet for {selectedAttributeEditor.name}.</p>
                    ) : (
                      selectedAttributeEditor.values.map((value) => (
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
                            onClick={() => requestRemoveValueFromSelectedAttribute(value)}
                            className="text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                            disabled={
                              !canConfigureAttributes ||
                              (() => {
                                const savedAttribute = getSavedAttributeByName(selectedAttributeName);
                                const savedValue = savedAttribute?.AttributeValues.find(
                                  (item) => item.ValueName.trim().toLowerCase() === value.trim().toLowerCase(),
                                );
                                if (!savedAttribute || !savedValue) return false;
                                return getAttributeValueRuleUsageCount(savedAttribute.AttributeID, savedValue.ValueID) > 0;
                              })()
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end items-center gap-3">
                {attributesMessage && <span className="text-sm font-medium text-green-600">{attributesMessage}</span>}

                <button
                  type="button"
                  onClick={handleSaveAttributesAndValues}
                  disabled={!canConfigureAttributes || savingAttributes}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingAttributes ? 'Saving Attributes...' : 'Save Attributes & Values'}
                </button>
              </div>

              {savedAttributes.length > 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Saved Attributes & Values</h3>
                  <div className="space-y-3">
                    {savedAttributes.map((attribute) => (
                      <div key={attribute.AttributeID} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="text-sm font-medium text-gray-900">
                          {attribute.AttributeName}{' '}
                          <span className="text-xs font-normal text-gray-500">(AttributeID: {attribute.AttributeID})</span>{' '}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${attribute.AffectsPricing ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {attribute.AffectsPricing ? 'Pricing' : 'Display only'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attribute.AttributeValues.length === 0 ? (
                            <span className="text-xs text-gray-500">No values saved</span>
                          ) : (
                            attribute.AttributeValues.map((value) => (
                              <span
                                key={value.ValueID}
                                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-800"
                              >
                                {value.ValueName}
                                <span className="ml-1 text-blue-600">(ID: {value.ValueID})</span>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className={`space-y-4 rounded-2xl border p-6 shadow-sm ${canConfigurePricing ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-50'}`}>
              <h2 className="text-lg font-semibold text-gray-900">3. Pricing Rules</h2>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Pricing rules allow you to change the product&apos;s price based on the selected attributes (e.g., Large size costs more than Small).
                </p>
                <p className="text-sm text-gray-600">
                  Only attributes that you marked as &quot;Affects pricing&quot; in the previous section can be used here.
                </p>
              </div>
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
                <input
                  id="replace-rules"
                  type="checkbox"
                  checked={replaceRules}
                  onChange={(e) => setReplaceRules(e.target.checked)}
                  disabled={!canConfigurePricing}
                  className="rounded border-gray-300"
                />
                <label htmlFor="replace-rules" className="text-sm text-gray-700">
                  Replace existing rules on save
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(Number(e.target.value))}
                    disabled={!canConfigurePricing || !hasPricingAttributes}
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
                    Use <span className="font-medium">Number of uploads</span> when each uploaded file should add to pricing.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        checked={multiplierMode === 'manual'}
                        onChange={() => setMultiplierMode('manual')}
                        disabled={!canConfigurePricing || !hasPricingAttributes}
                      />
                      Manual pricing factor
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        checked={multiplierMode === 'upload_count'}
                        onChange={() => setMultiplierMode('upload_count')}
                        disabled={!canConfigurePricing || !hasPricingAttributes}
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
                          disabled={!canConfigurePricing || !hasPricingAttributes}
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
                          disabled={!canConfigurePricing || !hasPricingAttributes}
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
                          disabled={!canConfigurePricing || !hasPricingAttributes}
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
                  <button
                    type="button"
                    onClick={() => setRules((prev) => [...prev, createEmptyRule(prev.length)])}
                    disabled={!canConfigurePricing || !hasPricingAttributes}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    + Add Rule
                  </button>
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
                                  disabled={!canConfigurePricing || !hasPricingAttributes}
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
                                  disabled={!canConfigurePricing || !hasPricingAttributes || condition.attributeId === ''}
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
                                disabled={!canConfigurePricing || rule.conditions.length === 1}
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
                          disabled={!canConfigurePricing || !hasPricingAttributes}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          + Add Condition
                        </button>
                      </div>
                      <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {priceType === 0 ? 'Price' : 'Rate per item'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rule.unitPrice}
                          onChange={(e) => updateRule(index, { unitPrice: e.target.value })}
                          className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-4 transition-all ${
                            pricingValidation.rules && rule.unitPrice === ''
                              ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/10'
                          }`}
                          disabled={!canConfigurePricing || !hasCompleteConditions}
                        />
                        {pricingValidation.rules && rule.unitPrice === '' ? (
                          <p className="mt-1 text-[11px] text-red-600 font-medium">Please specify the price.</p>
                        ) : null}
                      </div>
                      <div className="md:col-span-4 lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <input
                          type="number"
                          min="1"
                          value={rule.priority}
                          onChange={(e) => updateRule(index, { priority: e.target.value })}
                          className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-4 transition-all ${duplicatePriorities.has(rule.priority) ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/10'
                            }`}
                          disabled={!canConfigurePricing || !hasCompleteConditions}
                        />
                        {duplicatePriorities.has(rule.priority) ? (
                          <p className="mt-1 text-[11px] text-red-600 font-medium">Duplicate priority</p>
                        ) : null}
                      </div>
                      <div className="md:col-span-4 lg:col-span-2">
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          disabled={!canConfigurePricing || !hasPricingAttributes}
                          className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
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
                        {(() => {
                          const attributeIds = rule.conditions.map((condition) => condition.attributeId).filter(id => id !== '');
                          const hasDuplicate = new Set(attributeIds).size !== attributeIds.length;
                          if (hasDuplicate) {
                            return <p className="mt-1 text-[11px] text-red-600 font-medium">Duplicate attributes in conditions are not allowed.</p>;
                          }
                          return null;
                        })()}
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

                <button
                  type="button"
                  onClick={handleSavePricing}
                  disabled={!canConfigurePricing || savingPricing}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingPricing ? 'Saving Pricing...' : 'Save Pricing Rules'}
                </button>
              </div>
            </div>

            <div className={`space-y-4 rounded-2xl border p-6 shadow-sm ${canConfigureMeta ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-50'}`}>
              <h2 className="text-lg font-semibold text-gray-900">4. Upload Policy & Info Items</h2>
              <p className="text-sm text-gray-600">Configure upload requirements and customer-facing product info rows.</p>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Is upload mandatory?</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="upload-mandatory"
                      checked={isUploadMandatory}
                      onChange={() => setIsUploadMandatory(true)}
                      disabled={!canConfigureMeta}
                    />
                    Yes
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="upload-mandatory"
                      checked={!isUploadMandatory}
                      onChange={() => setIsUploadMandatory(false)}
                      disabled={!canConfigureMeta}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum uploads</label>
                  <input
                    type="number"
                    min="0"
                    value={minUploads}
                    onChange={(e) => setMinUploads(e.target.value)}
                    disabled={!canConfigureMeta}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum uploads</label>
                  <input
                    type="number"
                    min="0"
                    value={maxUploads}
                    onChange={(e) => setMaxUploads(e.target.value)}
                    disabled={!canConfigureMeta}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {multiplierMode === 'upload_count' && (
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

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={enableOrderQuantity}
                    onChange={(e) => setEnableOrderQuantity(e.target.checked)}
                    disabled={!canConfigureMeta}
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
                      disabled={!canConfigureMeta || !enableOrderQuantity}
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
                      disabled={!canConfigureMeta || !enableOrderQuantity}
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
                    disabled={!canConfigureMeta}
                    className="rounded border-gray-300"
                  />
                  Show custom description/instructions box on storefront
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isCustomDescriptionRequired}
                    onChange={(e) => setIsCustomDescriptionRequired(e.target.checked)}
                    disabled={!canConfigureMeta || !enableCustomDescription}
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
                      disabled={!canConfigureMeta || !enableCustomDescription}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                    <input
                      value={customDescriptionPlaceholder}
                      onChange={(e) => setCustomDescriptionPlaceholder(e.target.value)}
                      placeholder="Add any notes for production (optional)"
                      disabled={!canConfigureMeta || !enableCustomDescription}
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
                          disabled={!canConfigureMeta}
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
                  <button
                    type="button"
                    onClick={addInfoItem}
                    disabled={!canConfigureMeta}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    + Add Info Item
                  </button>
                </div>
                {infoItems.map((item) => (
                  <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl border border-gray-100 p-3">
                    <div className="md:col-span-12 lg:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        value={item.title}
                        onChange={(e) => updateInfoItem(item.key, { title: e.target.value })}
                        disabled={!canConfigureMeta}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="md:col-span-12 lg:col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                      <input
                        value={item.value}
                        onChange={(e) => updateInfoItem(item.key, { value: e.target.value })}
                        disabled={!canConfigureMeta}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="md:col-span-6 lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                      <input
                        type="number"
                        min="1"
                        value={item.sortOrder}
                        onChange={(e) => updateInfoItem(item.key, { sortOrder: e.target.value })}
                        disabled={!canConfigureMeta}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="md:col-span-6 lg:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeInfoItem(item.key)}
                        disabled={!canConfigureMeta || infoItems.length === 1}
                        className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-end items-center gap-3">
                {metaMessage && <span className="text-sm font-medium text-green-600">{metaMessage}</span>}

                <button
                  type="button"
                  onClick={handleSaveMetaConfig}
                  disabled={!canConfigureMeta || savingMeta || loadingMeta}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingMeta ? 'Saving Metadata...' : 'Save Upload Policy & Info'}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
          </div>

          <ProductPreviewModal
            productName={productName}
            description={description}
            attributes={attributes}
            minUploads={minUploads}
            maxUploads={maxUploads}
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

          {/* Delete Confirmation Modal */}
          {confirmDeleteModal.type && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                  <div className="flex items-center gap-4 text-red-600 mb-4">
                    <div className="bg-red-50 p-3 rounded-full">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to remove the {confirmDeleteModal.type} <span className="font-semibold text-gray-900">"{confirmDeleteModal.targetName}"</span>?
                  </p>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteModal({ type: null, targetName: '' })}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeRemove}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster position="bottom-right" />
    </ProtectedRoute>
  );
}

